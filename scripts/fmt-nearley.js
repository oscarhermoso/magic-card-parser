#!/usr/bin/env node
/**
 * fmt-nearley.js - Simple auto-formatter for Nearley grammar files
 *
 * Formatting rules applied:
 *   1. Join orphaned rule names (rule name alone on a line) with the
 *      following "-> ..." line.
 *   2. Normalize spacing around "->" in rule definitions.
 *   3. Normalize top-level "|" alternatives to exactly 2-space indent.
 *      ("Top-level" = not inside a {% %} action block or a ( ) group.)
 *   4. Ensure a single blank line between top-level rule definitions.
 *   5. Split long lines at the grammar/action ({% … %}) boundary so the
 *      grammar pattern and its JS action each get their own line.
 *      The action part is indented by 2 extra spaces relative to the rule.
 *   6. Format the JS inside every {% … %} action block with Prettier.
 *      Single-line results are kept inline if they fit; otherwise the block
 *      is expanded to multi-line with consistent indentation.
 *   7. Word-wrap remaining long pure-grammar lines at top-level token
 *      boundaries (paren/action depth 0), using 2-extra-space continuation
 *      indent.  Lines containing {% are left alone (handled by rules 5–6).
 *      Lines whose next non-empty successor opens an action block ({%) are
 *      also left alone: wrapping them creates a "continuation immediately
 *      before {%" pattern that can trigger non-monotonic ambiguity in
 *      Nearley's Earley meta-parser.
 *
 * Usage:
 *   node scripts/fmt-nearley.js <input.ne> [output.ne] [--wrap=N] [--no-prettier]
 *   --wrap=N        line-length limit for rules 5 & 6 (default: 100, 0 = disabled)
 *   --no-prettier   skip the Prettier formatting pass (rule 6)
 *   (output defaults to <input>.formatted.ne when omitted)
 */

import fs from 'fs';
import path from 'path';

// ─── depth tracking ──────────────────────────────────────────────────────────

/**
 * Scan a single line and return the updated actionDepth / parenDepth.
 *
 * actionDepth: number of unclosed {% … %} blocks
 * parenDepth:  number of unclosed ( … ) groups, only counted outside actions
 *
 * String literals (double-quoted, as used by Nearley) are skipped so that
 * "{%" or "(" inside a string do not affect depth.
 */
function scanDepths(line, actionDepth, parenDepth) {
  let ad = actionDepth;
  let pd = parenDepth;
  let inStr = false;
  let inCharClass = false;   // inside a Nearley character class  [...]

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    const nc = i + 1 < line.length ? line[i + 1] : '';

    if (inStr) {
      if (c === '\\') { i++; continue; }   // escaped char — skip next
      if (c === '"') { inStr = false; }
      continue;
    }

    if (c === '"') { inStr = true; continue; }

    // Nearley character classes [a-z], [^(\n], etc.
    // The ( and ) inside them are not grouping operators.
    if (ad === 0) {
      if (inCharClass) {
        if (c === ']') inCharClass = false;
        continue;
      }
      if (c === '[') { inCharClass = true; continue; }
    }

    if (ad === 0) {
      if (c === '#') break;                        // rest of line is a comment
      if (c === '(') pd++;
      else if (c === ')') pd = Math.max(0, pd - 1);
      else if (c === '{' && nc === '%') { ad++; i++; }
    } else {
      // Inside {% … %}
      if (c === '{' && nc === '%') { ad++; i++; }
      else if (c === '%' && nc === '}') { ad--; i++; }
    }
  }

  return { actionDepth: ad, parenDepth: pd };
}

/**
 * Find the character index of the first top-level {% in a line —
 * i.e., not inside a string literal, character class, or ( ) group.
 * Returns -1 if none found.
 */
function findTopLevelActionStart(line) {
  let inStr = false;
  let inCharClass = false;
  let pd = 0;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    const nc = i + 1 < line.length ? line[i + 1] : '';

    if (inStr) {
      if (c === '\\') { i++; continue; }
      if (c === '"') { inStr = false; }
      continue;
    }
    if (c === '"') { inStr = true; continue; }

    if (inCharClass) {
      if (c === ']') inCharClass = false;
      continue;
    }
    if (c === '[') { inCharClass = true; continue; }

    if (c === '#') break;   // comment — no action can follow

    if (c === '(') pd++;
    else if (c === ')') pd = Math.max(0, pd - 1);
    else if (c === '{' && nc === '%' && pd === 0) return i;
  }
  return -1;
}

/**
 * Find the closing `%}` of a Nearley action block within `text`, where
 * the text begins immediately after the opening `{%`.  Returns the index of
 * the `%` that starts `%}`, or -1 if not found.
 * Handles nested `{% %}` blocks (depth tracking).
 */
function findActionEnd(text) {
  let depth = 1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{' && text[i + 1] === '%') { depth++; i++; }
    else if (text[i] === '%' && text[i + 1] === '}') {
      depth--;
      if (depth === 0) return i;
      i++;
    }
  }
  return -1;
}

/**
 * Return the indices of every space character that sits at paren depth 0
 * and action depth 0 — i.e., not inside a string, character class, or
 * grouping parenthesis.  These are safe places to break a grammar line.
 */
function findTopLevelSpaces(line) {
  const spaces = [];
  let pd = 0, ad = 0, inStr = false, inCC = false;

  for (let i = 0; i < line.length; i++) {
    const c  = line[i];
    const nc = i + 1 < line.length ? line[i + 1] : '';

    if (inStr) {
      if (c === '\\') { i++; continue; }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }

    if (ad === 0) {
      if (inCC) { if (c === ']') inCC = false; continue; }
      if (c === '[') { inCC = true; continue; }
      if (c === '#') break;
      if (c === '(') pd++;
      else if (c === ')') pd = Math.max(0, pd - 1);
      else if (c === '{' && nc === '%') { ad++; i++; }
    } else {
      if (c === '{' && nc === '%') { ad++; i++; }
      else if (c === '%' && nc === '}') { ad--; i++; }
    }

    if (c === ' ' && pd === 0 && ad === 0) spaces.push(i);
  }

  return spaces;
}

/**
 * Greedy word-wrap a single line at the provided top-level space positions.
 * Returns an array of output lines.  The first line keeps its original
 * leading whitespace; continuation lines use `leadingWS + '  '`.
 */
function wrapAtTopLevelSpaces(line, printWidth, spaces) {
  if (line.length <= printWidth || spaces.length === 0) return [line];

  const leadingWS  = line.match(/^(\s*)/)[1];
  const contIndent = leadingWS + '  ';

  const result = [];
  let pos = 0;

  while (pos < line.length) {
    const isFirst = result.length === 0;
    const prefix  = isFirst ? '' : contIndent;
    const budget  = printWidth - prefix.length;

    // Trim leading spaces for continuation segments (handles consecutive spaces
    // that can appear after a split point).
    const seg = isFirst ? line.slice(pos) : line.slice(pos).trimStart();
    if (seg.length <= budget) {
      if (seg.length > 0) result.push(prefix + seg);
      break;
    }

    // Rightmost top-level space that keeps the segment within budget.
    // `sp - pos` is a conservative bound (trimStart may shorten non-first segs).
    let bestSplit = -1;
    for (const sp of spaces) {
      if (sp <= pos) continue;
      if (sp - pos > budget) break;
      if (sp + 1 < line.length) bestSplit = sp;
    }

    if (bestSplit === -1) {
      // Nothing fits — advance to the next available break (unavoidably long).
      const nextSp = spaces.find(sp => sp > pos);
      const end = nextSp !== undefined ? nextSp : line.length;
      const chunk = isFirst ? line.slice(pos, end) : line.slice(pos, end).trimStart();
      if (chunk.length > 0) result.push(prefix + chunk);
      pos = end + 1;
    } else {
      const chunk = isFirst ? line.slice(pos, bestSplit) : line.slice(pos, bestSplit).trimStart();
      if (chunk.length > 0) result.push(prefix + chunk);
      pos = bestSplit + 1;
    }
  }

  return result.length > 0 ? result : [line];
}

// ─── formatter ───────────────────────────────────────────────────────────────

async function formatNearley(source, { printWidth = 100, usePrettier = true } = {}) {
  const lines = source.split('\n');

  // ── Pass 1: join orphaned rule names with their "-> …" line ─────────────
  //
  // Nearley allows (and the existing file uses):
  //   abilityOrRemind
  //    -> ability {% … %}
  //
  // Normalise this to:
  //   abilityOrRemind -> ability {% … %}
  //
  const pass1 = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const next = lines[i + 1];
    if (
      next !== undefined &&
      /^[a-zA-Z_][a-zA-Z0-9_[\],* ]*\s*$/.test(line) &&   // bare rule name
      /^\s*->/.test(next)                                     // followed by ->
    ) {
      pass1.push(line.trimEnd() + ' ->' + next.replace(/^\s*->/, ''));
      i++; // consume the next line
    } else {
      pass1.push(line);
    }
  }

  // ── Pass 2: normalise -> spacing, | indentation, blank lines ────────────
  const out = [];
  let actionDepth = 0;
  let parenDepth = 0;
  let inAtBlock = false;   // inside @{% … %} preamble

  // Track whether we need to insert a blank line before the next rule.
  let lastNonBlankWasRule = false;

  for (const rawLine of pass1) {
    const trimmed = rawLine.trim();

    // ── @{% … %} preamble blocks: pass through completely unchanged ──────
    if (!inAtBlock && trimmed.startsWith('@{%')) {
      inAtBlock = true;
      out.push(rawLine);
      // Could be a single-line @{%…%}
      if (trimmed.length > 3 && trimmed.slice(3).includes('%}')) {
        inAtBlock = false;
      }
      lastNonBlankWasRule = false;
      continue;
    }
    if (inAtBlock) {
      out.push(rawLine);
      if (trimmed === '%}') inAtBlock = false;
      continue;
    }

    // ── Blank lines: collapse runs of blanks to at most one ──────────────
    if (trimmed === '') {
      // Only emit a blank line if the previous output line is not already blank.
      if (out.length > 0 && out[out.length - 1].trim() !== '') {
        out.push('');
      }
      continue;
    }

    let line = rawLine;

    // ── Rule definitions: ensure a blank line precedes them ──────────────
    // A rule definition line starts a new rule name at depth 0 and contains ->.
    const isRuleStart =
      actionDepth === 0 &&
      parenDepth === 0 &&
      /^[a-zA-Z_]/.test(trimmed) &&
      !trimmed.startsWith('#') &&
      !trimmed.startsWith('@') &&
      trimmed.includes('->');

    if (isRuleStart) {
      // Walk back through `out` past any contiguous comment lines so that the
      // blank separator appears BEFORE the comment block, not between it and
      // the rule it is documenting.
      let insertAt = out.length;
      while (insertAt > 0 && out[insertAt - 1].trim().startsWith('#')) {
        insertAt--;
      }
      if (insertAt > 0 && out[insertAt - 1].trim() !== '') {
        out.splice(insertAt, 0, '');
      }
    }

    // ── Normalise "-> " spacing in rule definitions ───────────────────────
    // "ruleName->x"   → "ruleName -> x"
    // "ruleName  -> x" → "ruleName -> x"
    if (actionDepth === 0 && parenDepth === 0 && /^[a-zA-Z_]/.test(line)) {
      line = line.replace(/^(\S+)\s*->\s*/, '$1 -> ');
    }

    // ── Normalise top-level "|" alternatives to 2-space indent ───────────
    // Only when we are outside any {% %} action and outside any ( ) group.
    if (actionDepth === 0 && parenDepth === 0 && /^\s*\|/.test(line)) {
      line = '  | ' + trimmed.slice(1).trimStart();
    }

    out.push(line);

    // Update depths for the next line (use original content, not reformatted).
    const depths = scanDepths(rawLine, actionDepth, parenDepth);
    actionDepth = depths.actionDepth;
    parenDepth = depths.parenDepth;
  }

  // Remove a possible leading blank line added by the rule-separator logic.
  if (out.length > 0 && out[0].trim() === '') out.shift();

  // ── Pass 3: split long grammar+action lines at the {% boundary ──────────
  // Only applies when printWidth > 0.
  if (printWidth <= 0) return out.join('\n');

  const wrapped = [];
  let wAD = 0;   // action depth during this pass
  let wPD = 0;   // paren depth during this pass

  for (const line of out) {
    if (line.length > printWidth && wAD === 0 && wPD === 0) {
      const actionPos = findTopLevelActionStart(line);
      const grammarPart = actionPos > 0 ? line.slice(0, actionPos).trimEnd() : '';
      // Only split when:
      //  - there is actual grammar content before the {%
      //  - that grammar content is itself long (>= half the print width).
      //    Short grammar-only lines (like `  | "be created under your control"`)
      //    confuse Nearley's Earley meta-parser when multiple alternatives in
      //    the same rule are all split this way, causing nearleyc failures.
      if (actionPos > 0 && grammarPart.trim() !== '' && grammarPart.length >= printWidth / 2) {
        const leadingWS = line.match(/^(\s*)/)[1];
        const actionPart  = leadingWS + '  ' + line.slice(actionPos).trimStart();

        wrapped.push(grammarPart);
        const d1 = scanDepths(grammarPart, wAD, wPD);
        wrapped.push(actionPart);
        const d2 = scanDepths(actionPart, d1.actionDepth, d1.parenDepth);
        wAD = d2.actionDepth;
        wPD = d2.parenDepth;
        continue;
      }
    }

    wrapped.push(line);
    const d = scanDepths(line, wAD, wPD);
    wAD = d.actionDepth;
    wPD = d.parenDepth;
  }

  if (!usePrettier || printWidth <= 0) return wrapped.join('\n');

  // ── Pass 4: format action block JS with Prettier ──────────────────────────
  // Dynamically import Prettier so the formatter still works without it.
  let prettierFormat;
  try {
    prettierFormat = (await import('prettier')).format;
  } catch {
    return wrapped.join('\n');  // Prettier not installed — skip
  }

  // Try to read a project prettier config (falls back to defaults gracefully).
  let prettierConfig = {};
  try {
    prettierConfig = (await import('prettier')).resolveConfig(process.cwd()) ?? {};
  } catch { /* ignore */ }

  const pass4 = [];
  let p4i = 0;
  let inAtPreamble = false;  // inside @{% … %} — do not reformat

  while (p4i < wrapped.length) {
    const line = wrapped[p4i];
    const ltrim = line.trim();

    // ── @{% … %} preamble blocks: pass through unchanged ─────────────────
    if (!inAtPreamble && ltrim.startsWith('@{%')) {
      inAtPreamble = true;
      pass4.push(line);
      if (ltrim.length > 3 && ltrim.slice(3).includes('%}')) inAtPreamble = false;
      p4i++;
      continue;
    }
    if (inAtPreamble) {
      pass4.push(line);
      if (ltrim === '%}') inAtPreamble = false;
      p4i++;
      continue;
    }

    const actionPos = findTopLevelActionStart(line);
    if (actionPos === -1) {
      pass4.push(line);
      p4i++;
      continue;
    }

    // Found {% at top level.  Collect the entire block (may span lines).
    const contextIndent = line.match(/^(\s*)/)[1];
    const bodyIndent    = contextIndent + '  ';
    const grammarPrefix = line.slice(0, actionPos).trimEnd();

    let rawContent = '';
    let endLineIdx = -1;

    // Text that follows {%
    let remaining = line.slice(actionPos + 2);
    let scanIdx   = p4i;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const closePos = findActionEnd(remaining);
      if (closePos !== -1) {
        rawContent += remaining.slice(0, closePos);
        endLineIdx  = scanIdx;
        break;
      }
      rawContent += remaining + '\n';
      scanIdx++;
      if (scanIdx >= wrapped.length) break;
      remaining = wrapped[scanIdx];
    }

    if (endLineIdx === -1) {
      // Malformed block — pass through as-is
      pass4.push(line);
      p4i++;
      continue;
    }

    // ── Format the raw content with Prettier ─────────────────────────────
    const trimmedContent = rawContent.trim();
    let formatted = trimmedContent;

    if (trimmedContent !== '') {
      try {
        const effectiveWidth = Math.max(40, printWidth - bodyIndent.length);
        const wrapped2 = `const _ = ${trimmedContent};`;
        const out = await prettierFormat(wrapped2, {
          parser: 'babel',
          printWidth: effectiveWidth,
          semi: true,
          singleQuote: true,
          trailingComma: 'all',
          ...prettierConfig,
        });
        formatted = out
          .replace(/^const _ = /, '')
          .replace(/;\s*$/, '')
          .trim();
      } catch {
        // Prettier failed (e.g. bare identifier like `id`) — keep original
      }
    }

    const isMultiLine = formatted.includes('\n');

    if (!isMultiLine) {
      // ── Single-line result ─────────────────────────────────────────────
      const inlineLine = (grammarPrefix ? grammarPrefix + ' ' : contextIndent)
        + '{% ' + formatted + ' %}';
      if (inlineLine.length <= printWidth) {
        pass4.push(inlineLine);
      } else if (grammarPrefix.trim()) {
        // Grammar too long — put action on its own line
        pass4.push(grammarPrefix);
        pass4.push(bodyIndent + '{% ' + formatted + ' %}');
      } else {
        // Already on its own line and still long — just emit as-is
        pass4.push(contextIndent + '{% ' + formatted + ' %}');
      }
    } else {
      // ── Multi-line result ──────────────────────────────────────────────
      //  grammarPrefix (if non-empty, on its own line)
      //  contextIndent{%
      //  bodyIndent + each formatted line
      //  contextIndent%}
      if (grammarPrefix.trim()) pass4.push(grammarPrefix);
      pass4.push(contextIndent + '{%');
      for (const fl of formatted.split('\n')) {
        pass4.push(bodyIndent + fl);
      }
      pass4.push(contextIndent + '%}');
    }

    p4i = endLineIdx + 1;
  }

  // ── Pass 5: word-wrap long pure-grammar lines ─────────────────────────────
  // Only wraps lines that contain NO `{%` at all — action-block lines were
  // already handled by Passes 3 & 4.  Lines inside `{% %}` blocks (action
  // bodies emitted by Pass 4) are skipped via actionDepth tracking.
  const pass5 = [];
  let p5ad = 0;            // action depth
  let p5inPreamble = false;

  for (let p5i = 0; p5i < pass4.length; p5i++) {
    const line = pass4[p5i];
    const ltrim = line.trim();

    // @{% %} preamble blocks — pass through unchanged
    if (!p5inPreamble && ltrim.startsWith('@{%')) {
      p5inPreamble = true;
      pass5.push(line);
      if (ltrim.length > 3 && ltrim.slice(3).includes('%}')) p5inPreamble = false;
      continue;
    }
    if (p5inPreamble) {
      pass5.push(line);
      if (ltrim === '%}') p5inPreamble = false;
      continue;
    }

    // Inside an action block — pass through unchanged
    if (p5ad > 0) {
      pass5.push(line);
      p5ad = scanDepths(line, p5ad, 0).actionDepth;
      continue;
    }

    // Lines with action blocks are already handled; skip wrapping.
    if (line.length <= printWidth || line.includes('{%')) {
      pass5.push(line);
      p5ad = scanDepths(line, 0, 0).actionDepth;
      continue;
    }

    // Guard: do NOT wrap if the next non-empty line opens an action block.
    // Wrapping creates a "grammar continuation immediately before {%" pattern
    // that can confuse Nearley's Earley meta-parser in non-monotonic ways —
    // some combinations of such patterns in a rule compile, others don't.
    const nextNonEmpty = pass4.slice(p5i + 1).find(l => l.trim() !== '');
    if (nextNonEmpty && nextNonEmpty.trim().startsWith('{%')) {
      pass5.push(line);
      continue;  // leave this long line as-is
    }

    // Long pure-grammar line — wrap at top-level token boundaries.
    const tlSpaces = findTopLevelSpaces(line);
    for (const l of wrapAtTopLevelSpaces(line, printWidth, tlSpaces)) pass5.push(l);
    // p5ad stays 0: we only reach here for lines that have no {%
  }

  return pass5.join('\n');
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const positional = args.filter(a => !a.startsWith('--'));
const flags      = Object.fromEntries(
  args.filter(a => a.startsWith('--')).map(a => a.slice(2).split('='))
);

const [inputPath, outputPath] = positional;

if (!inputPath) {
  console.error('Usage: node scripts/fmt-nearley.js <input.ne> [output.ne] [--wrap=N]');
  process.exit(1);
}

const printWidth  = flags.wrap !== undefined ? Number(flags.wrap) : 100;
const usePrettier = !('no-prettier' in flags);

const resolvedInput  = path.resolve(inputPath);
const resolvedOutput = outputPath
  ? path.resolve(outputPath)
  : resolvedInput.replace(/\.ne$/, '.formatted.ne');

const source    = fs.readFileSync(resolvedInput, 'utf8');
const formatted = await formatNearley(source, { printWidth, usePrettier });
fs.writeFileSync(resolvedOutput, formatted, 'utf8');

const rel = (p) => path.relative(process.cwd(), p);
console.log(`✓ ${rel(resolvedInput)} → ${rel(resolvedOutput)}`);
