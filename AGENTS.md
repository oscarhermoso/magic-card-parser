# Agent Guidelines

> **All agents (polecats, witnesses, future Claudes) must read this file end-to-end before starting work on this repo.** It is the durable record of where the project is going. Memory systems are session-scoped; this file is not.

See **CLAUDE.md** for the polecat operational guide (formula checklist, `gt done`, single-task focus, etc.).

## Project Direction (read first)

### What this is

`magic-card-parser` parses Magic: The Gathering card oracle text and emits **composable spell effects and abilities** in a structured form. It exists to feed the [`mtg-cube-simulator`](https://github.com/oscarhermoso/mtg-cube-simulator) game engine.

This is not a hobby parser. The game engine has a hand-maintained `CARD_MECHANIC_OVERRIDES` table that exists *only because* the parser doesn't yet cover those cards. Every entry in that table is technical debt against this repo.

### Target state

- **Zero cards in sim's `CARD_MECHANIC_OVERRIDES`.** Every card in the canonical test cube ([`simple-is-best`](https://cubecobra.com/cube/list/simple-is-best) on CubeCobra) — and ideally every card in standard MTG — should be playable from parser output alone, with no per-card override.
- The interface this parser provides to sim should be **stable and useful enough that sim never needs to patch around it.** If sim has to write per-card hacks, that's a parser bug, not a sim bug.
- **Rearchitecture is permitted.** The maintainer (Oscar) explicitly authorized broad rework of this repo's structure, grammar, and type schemas as needed to hit the zero-overrides target. Don't be timid about restructuring grammars or interfaces if the current design is in the way. The constraint is correctness and completeness, not preserving the existing internals.

### How parser fits into the larger system

- **Sim consumes parser output** to drive its rules engine. Bot players (using Web LLM in the browser — see sim's `AGENTS.md`) reason about card text via parser-emitted structured data, not raw oracle text.
- **Parser is on the deploy critical path** for sim. Sim can't ship to the broader MTG community until the test cube plays correctly end-to-end, and parser coverage is the bottleneck for card support.
- **Cross-rig coordination**: when this repo ships a new grammar feature that handles a previously-overridden card, the corresponding entry in sim's `CARD_MECHANIC_OVERRIDES` must be removed in a follow-up sim bead. The override table only shrinks if both sides do their part — file the sim follow-up explicitly, don't assume someone else will notice.

### Test discipline

- Every grammar change should have test coverage proving the cards it newly handles produce the correct engine behavior (i.e., the same behavior the override would have produced, or the demonstrably correct behavior if the override was wrong).
- A regression in card behavior is a deploy blocker for sim. Be conservative about changes that break existing parses without replacing them.

### Open architectural question (Mayor's call to make, not blocking)

Whether to vendor parser into sim as a sub-package, ship it as an npm package, or keep them as separate repos with a release pipeline. Default for now: separate repos, parser publishes a stable module interface that sim imports. Revisit if the cross-repo handoff becomes painful.

## Working in this repo

Follow the polecat contract in `CLAUDE.md` and the patterns in existing files.

### Build, test, typecheck

```bash
npm install          # Install dependencies (first time)
npm run build        # Compile nearley grammar + tsup bundle
npm test             # Run vitest suite
npm run typecheck    # tsc --noEmit
```

All gates must pass before committing. The full test suite (`npm test`) is the
authoritative signal that a grammar change didn't break existing card parses.

<!-- beads-agent-instructions-v2 -->

---

## Beads Workflow Integration

This project uses [beads](https://github.com/steveyegge/beads) for issue tracking. Issue state lives in Dolt; the `.beads/` directory versions only the config files a fresh clone needs to connect.

Two CLIs: **bd** (issue CRUD) and **bv** (graph-aware triage, read-only).

### bd: Issue Management

```bash
bd ready              # Unblocked issues ready to work
bd list --status=open # All open issues
bd show <id>          # Full details with dependencies
bd create --title="..." --type=task --priority=2
bd update <id> --status=in_progress
bd close <id>         # Mark complete
bd close <id1> <id2>  # Close multiple
bd dep add <a> <b>    # a depends on b
bd sync               # Sync with git
```

### bv: Graph Analysis (read-only)

**NEVER run bare `bv`** — it launches interactive TUI. Always use `--robot-*` flags:

```bash
bv --robot-triage     # Ranked picks, quick wins, blockers, health
bv --robot-next       # Single top pick + claim command
bv --robot-plan       # Parallel execution tracks
bv --robot-alerts     # Stale issues, cascades, mismatches
bv --robot-insights   # Full graph metrics: PageRank, betweenness, cycles
```

### Workflow

1. **Start**: `bd ready` (or `bv --robot-triage` for graph analysis)
2. **Claim**: `bd update <id> --status=in_progress`
3. **Work**: Implement the task
4. **Complete**: `bd close <id>`
5. **Sync**: `bd sync` at session end

### Session Close Protocol

```bash
git status            # Check what changed
git add <files>       # Stage code changes
bd sync               # Commit beads changes
git commit -m "..."   # Commit code
bd sync               # Commit any new beads changes
git push              # Push to remote
```

### Key Concepts

- **Priority**: P0=critical, P1=high, P2=medium, P3=low, P4=backlog (numbers only)
- **Types**: task, bug, feature, epic, question, docs
- **Dependencies**: `bd ready` shows only unblocked work

<!-- end-beads-agent-instructions -->

<!-- gastown-agent-instructions-v1 -->

---

## Gas Town Multi-Agent Communication

This workspace is part of a **Gas Town** multi-agent environment. You communicate
with other agents using `gt` commands — never by printing text or using raw tmux.

### Nudging Agents (Immediate Delivery)

`gt nudge` sends a message directly to another agent's active session:

```bash
gt nudge mayor "Status update: grammar feature landed"
gt nudge parser/polecats/obsidian "Check your mail — follow-up bead"
gt nudge witness "Polecat health check needed"
gt nudge refinery "Merge queue has items"
```

**Target formats:**
- Role shortcuts: `mayor`, `deacon`, `witness`, `refinery`
- Full path: `<rig>/crew/<name>`, `<rig>/polecats/<name>`

**Important:** `gt nudge` is the ONLY way to send text to another agent's session.
Never print "Hey @name" — the other agent cannot see your terminal output.

### Sending Mail (Persistent Messages)

`gt mail` sends messages that persist across session restarts:

```bash
# Reading
gt mail inbox                    # List messages
gt mail read <id>                # Read a specific message

# Sending (use --stdin for multi-line content)
gt mail send mayor/ -s "Subject" -m "Short message"
gt mail send sim/polecats/chrome -s "Override removable" --stdin <<'BODY'
Parser now handles <card>. You can delete the CARD_MECHANIC_OVERRIDES entry.
BODY
gt mail send --human -s "Subject" -m "Message to overseer"
```

### When to Use Which

| Want to... | Command | Why |
|------------|---------|-----|
| Wake a sleeping agent | `gt nudge <target> "msg"` | Immediate delivery |
| Send detailed task/info | `gt mail send <target> -s "..." --stdin` | Persists across restarts |
| Both: send + wake | `gt mail send` then `gt nudge` | Mail carries payload, nudge wakes |

### Cross-Rig Coordination with Sim

When a parser change newly handles a card that sim had overridden, file a
follow-up bead on the sim side so the `CARD_MECHANIC_OVERRIDES` entry gets
removed. The override table only shrinks if both sides do their part.

```bash
gt mail send sim/mayor -s "Override removable: <card>" --stdin <<'BODY'
Parser change: <commit or bead id>
Card(s) newly covered: <list>
Action: delete CARD_MECHANIC_OVERRIDES entry for <card>, add regression test.
BODY
```

### Context Recovery

After compaction or new session, run `gt prime` to reload your full role context,
identity, and any pending work.

```bash
gt prime              # Full context reload
gt hook               # Check for assigned work
gt mail inbox         # Check for messages
```

<!-- end-gastown-agent-instructions -->
