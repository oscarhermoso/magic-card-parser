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

Follow the polecat contract in `CLAUDE.md` and the patterns in existing files. Add specific build/test/lint commands to this section as the rig matures.
