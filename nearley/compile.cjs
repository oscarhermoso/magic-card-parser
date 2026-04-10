#!/usr/bin/env node
// Custom nearley compiler that reads the full file at once,
// bypassing the 64KB stream-chunk bug in nearleyc (pa-ylu).
//
// nearleyc uses Node streams to read .ne files, which chunk at 64KB.
// If a token straddles a chunk boundary the lexer throws.
// This script feeds the entire file in one call, dodging the issue.
const nearley = require('nearley');
const compile = require('nearley/lib/compile');
const generate = require('nearley/lib/generate');
const nearleyGrammar = require('nearley/lib/nearley-language-bootstrapped');
const fs = require('fs');

const [inputFile, outputFile] = process.argv.slice(2);
if (!inputFile || !outputFile) {
  console.error('Usage: node compile.cjs <input.ne> <output.cjs>');
  process.exit(1);
}

const content = fs.readFileSync(inputFile, 'utf8');
const parser = new nearley.Parser(nearley.Grammar.fromCompiled(nearleyGrammar));
parser.feed(content);

if (parser.results.length === 0) {
  console.error('No parse results for', inputFile);
  process.exit(1);
}

// compile() handles @include directives internally (reads + parses included files)
const compiled = compile(parser.results[0], { args: [inputFile] });
const output = generate(compiled, 'grammar');
fs.writeFileSync(outputFile, '// @ts-nocheck\n' + output);
