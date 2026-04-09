# Parser Gap Audit: sim CARD_MECHANIC_OVERRIDES vs parser v1.0 grammar

**Bead:** pa-phi
**Date:** 2026-04-09
**Auditor:** parser/polecats/obsidian
**Source:** `mtg-cube-simulator/src/engine/CardParser.ts` lines 130–1509 (CARD_MECHANIC_OVERRIDES, 130 entries)

## Method

For each of the 130 entries in sim's `CARD_MECHANIC_OVERRIDES` table, the card's
oracle text (sourced from sim's `cube-cards.json` and `cards.json`) was passed
through parser v1.0 (`parseCard` / `parseFaces`). Cards were bucketed by parse
outcome:

- **Bucket A** — `confidence === 1.0`, no errors, no `unknownClauses`, AND sim's
  override only contains standard `effectType` values (Reanimate, Discard, Pump,
  GainLife, etc.). Parser fully handles these — sim cleanup is straightforward.
- **Bucket B** — parser cannot fully parse the oracle text. Either a syntax
  error (FAIL) or `unknownClauses` populated (PARTIAL).
- **Bucket C** — parser parses cleanly but the override exists for a non-grammar
  reason: sim-specific custom `effectType` (`SunderingTitan`, `BaubleEffect`,
  `ImprintMana`, `NarsetLookahead`, `ReplacementEffect`, `StaticRestriction`,
  `GainKeyword`, etc.), an `effectType: 'Unknown'` placeholder, or known dead
  code (LoyaltyAbility-only entries — see source comment at CardParser.ts:1661).

## Summary

**130 cards audited.**

| Bucket | Count | % | In simple-is-best test cube |
|---|---|---|---|
| A — Already handled (sim cleanup ready) | 18 | 14% | 2 (Animate Dead, Ophiomancer) |
| B — Grammar gap | 86 | 66% | 7 |
| C — Needs human review (non-grammar reason) | 26 | 20% | 11 |

**Top 3 grammar features to build next (by unblock count):**

1. **F1 — Modern keyword cost variants** (channel, disguise, plot, squad, evoke,
   level up, reconfigure, hideaway, for mirrodin!, alt-equip cost) → 13 cards.
   Filed as **pa-bor** (P1, see Follow-up beads).
2. **F2 — Conditional triggers** ("whenever X, if Y, do Z" + ability-word
   prefixes like revolt/coven/hellbent/madness with conditional payloads) → 13
   cards. Filed as **pa-1kr** (P1).
3. **F3 — Token creation with embedded ability text in quotes** (`create a token
   with "ability"` and `becomes a creature with "ability"`) → 7 cards. Filed as
   **pa-q21** (P1).

These three features collectively unblock **~30 cards** (~23% of the table).

**Test-cube-priority items.** 7 of the 86 Bucket B cards are in the
`simpleIsBest.test.ts` snapshot suite — each warrants P1 even at low unblock
count because they directly affect the regression baseline. They are: Goblin
Welder, Delver of Secrets // Insectile Aberration, Fable of the Mirror-Breaker
// Reflection of Kiki-Jiki, Kytheon, Hero of Akros // Gideon, Battle-Forged,
Thing in the Ice // Awoken Horror, Shatterskull Smashing // Shatterskull, the
Hammer Pass, and Sink into Stupor // Soporific Springs. Five of the seven are
multi-face cards needing transform/saga/MDFC effect-level support — the layout
plumbing exists (hq-bkj) but the per-face oracle text contains gaps that fall
into other features (transform-on-condition, back-references, divided damage).

---

## Bucket A — Already handled (18 cards)

Parser parses each card's oracle text fully (`confidence === 1.0`, no errors,
no `unknownClauses`). Sim's override only uses standard ParsedMechanic types
(`Reanimate`, `Discard`, `Pump`, `GainLife`, `Mill`, `CreateToken`, etc.). The
override is dead weight in sim — a sim-side cleanup bead can remove these
entries once `getCardMechanics` consumes the parser AST.

| Card | Notes |
|---|---|
| Animate Dead | Reanimate + enchanted-creature pump. **In test cube.** |
| Fetid Pools | Cycling land. |
| Fiery Islet | Painland w/ self-sacrifice + draw. |
| Gaea's Cradle | Tap-for-creature-count mana. |
| Gatekeeper of Malakir | Kicker → opponent sacrifice. |
| Geist of Saint Traft | Hexproof + attack token. |
| Horizon Canopy | Painland w/ self-sacrifice + draw. |
| Irrigated Farmland | Cycling land. |
| Mishra's Workshop | Tap-for-mana for artifacts. |
| Nurturing Peatland | Painland w/ self-sacrifice + draw. |
| Ophiomancer | Upkeep snake token (deathtouch). **In test cube.** |
| Searslicer Goblin | Raid → end-step token. |
| Sensei's Divining Top | Top library manipulation activator. |
| Sheltered Thicket | Cycling land. |
| Silent Clearing | Painland w/ self-sacrifice + draw. |
| Sunbaked Canyon | Painland w/ self-sacrifice + draw. |
| Virtue of Persistence // Locthwain Scorn | Adventure layout — both faces parse. |
| Waterlogged Grove | Painland w/ self-sacrifice + draw. |

---

## Bucket B — Grammar gap (86 cards)

Bucket B is grouped by **grammar feature**. Each feature is a coherent rule
addition that would unblock multiple cards. Recommended priority follows the
bead's rule: **P1 if ≥5 cards or any test-cube card; otherwise P2.**

### F1 — Modern keyword cost variants (13 cards · P1)

**Recommendation:** P1 (highest unblock count)

The grammar's `costKeyword` / `numberKeyword` rules cover older keyword-with-
cost forms (kicker, cycling, etc.) but do not cover the modern "ability word /
keyword `--` cost-with-self-discard `:` effect" pattern, nor several recent
single-keyword variants. These all currently emit `unknownClauses` for the full
keyword line.

| Card | Missing keyword | In test cube |
|---|---|---|
| Boseiju, Who Endures | channel | |
| Eiganjo, Seat of the Empire | channel | |
| Otawara, Soaring City | channel | |
| Takenuma, Abandoned Mire | channel | |
| Endurance | evoke (with non-mana evoke cost) | |
| Fugitive Codebreaker | disguise | |
| Hexdrinker | level up | |
| Slickshot Show-Off | plot | |
| Zephyrim | squad (X) | |
| Rabbit Battery | reconfigure | |
| Shelldock Isle | hideaway | |
| Glimmer Lens | for mirrodin! (rebel token enter trigger) | |
| Bloodthorn Flail | alt-equip cost ("equip — pay {3} or discard a card") | |

**Acceptance criterion for the grammar bead:** all 13 cards parse with
`confidence === 1.0` and no `unknownClauses`.

### F2 — Conditional triggers (13 cards · P1)

**Recommendation:** P1 (highest unblock count alongside F1)

The grammar already accepts `triggeredAbility -> triggerCondition "," __
effect`. The gap is the **interleaved conditional** form: `whenever X, if Y, do
Z` (and `at the beginning of …, if Y, do Z`), where `Y` is a state predicate
that fires *between* the trigger and the effect. Also missing: ability words
that bind a condition into the trigger (`revolt --`, `coven --`, `hellbent --`,
`raid --`, `madness {cost}`).

The current `if` rule treats `if` as part of the effect; the parse fails or
emits the entire trigger+effect as an unknown clause.

| Card | Pattern | In test cube |
|---|---|---|
| Bloodhall Priest | `whenever ~ enters or attacks, if you have no cards in hand, ~ deals 2 damage to any target.` | |
| Field of the Dead | `whenever ~ or another land you control enters, if you control seven or more lands with different names, …` | |
| Knight of the Ebon Legion | `at the beginning of your end step, if a player lost 4 or more life this turn, …` | |
| Klothys, God of Destiny | `at the beginning of your first main phase, exile target card from a graveyard. if it was a land card, …` | |
| Kaito Shizuki | `at the beginning of your end step, if ~ entered this turn, he phases out.` | |
| Renegade Rallier | `revolt -- when ~ enters, if a permanent left the battlefield under your control this turn, …` (FAIL) | |
| Augur of Autumn | `coven -- as long as you control three or more creatures with different powers, …` | |
| Anje Falkenrath | `whenever you discard a card, if it has madness, untap ~.` | |
| Gibbering Descent | `hellbent -- skip your upkeep step if you have no cards in hand.` | |
| Inti, Seneschal of the Sun | `whenever you discard one or more cards, …` (numerical-quantifier subject) | |
| Adeline, Resplendent Cathar | `whenever you attack, for each opponent, create a 1/1 …` (for-each-opponent loop) | |
| Bloodthorn Flail | conditional equip/attack triggers (overlap w/ F1) | |
| Mystic Sanctuary | `~ enters tapped unless you control three or more other islands.` (negative conditional ETB) | |

**Acceptance criterion:** all 13 cards parse with `confidence === 1.0` and the
output AST exposes the conditional via `condition` / `asLongAs` / `does … if`
nodes (already declared in `index.d.ts`) so sim can branch on it.

### F3 — Token creation with embedded ability text (7 cards · P1)

**Recommendation:** P1

`create … token` / `becomes a … creature` constructs that include a quoted
ability list (`with "whenever this token attacks, …"`) currently fail because
the grammar's tokenSpec rule does not recurse into quoted abilities.

| Card | Embedded ability example | In test cube |
|---|---|---|
| Cloudseeder | `… faerie creature token named cloud sprite. it has flying and "this token can block only creatures with flying."` | |
| Field of the Dead | (no embedded text — overlaps F2) | |
| Hive of the Eye Tyrant | `… becomes a 3/3 black beholder creature with menace and "whenever ~ attacks, exile target card from defending player's graveyard."` | |
| Old-Growth Troll | `… aura enchantment with enchant forest you control and "enchanted forest has '{t}: add {g}{g}' …"` | |
| Thopter Assembly | `… 1/1 colorless ~ artifact creature tokens with flying.` (multi-token w/ keyword list) | |
| Adeline, Resplendent Cathar | `… token that's tapped and attacking that player or a planeswalker they control` | |
| Glimmer Lens | `(when this equipment enters, create a 2/2 red rebel creature token, then attach this to it.)` | |

**Acceptance criterion:** all 7 cards parse with `confidence === 1.0`; the
created-token AST node should embed an `abilities: AbilityNode[]` field for the
quoted text.

### F4 — Activation restrictions (5 cards · P1)

**Recommendation:** P1

`activationInstruction` covers `once each turn`, `as a sorcery`, etc., but does
not handle compound restrictions (`only as a sorcery and only if you have one
or fewer cards in hand`, `no more than twice each turn`, `only during your turn
and only once each turn`).

| Card | Restriction | In test cube |
|---|---|---|
| Roterothopter | `activate no more than twice each turn` | |
| Vivi Ornitier | `activate only during your turn and only once each turn` | |
| Steel Hellkite | `activate only once each turn` (within a complex destroy effect) | |
| Dread Wanderer | `activate only as a sorcery and only if you have one or fewer cards in hand` | |
| Pteramander | `this ability costs {1} less to activate for each instant and sorcery card in your graveyard` (cost-reduction subset of F8) | |

### F5 — Attached creature triggers (3 cards · P2)

| Card | Pattern | In test cube |
|---|---|---|
| Umezawa's Jitte | `whenever equipped creature deals combat damage, put two charge counters on ~.` | |
| Utopia Sprawl | `whenever enchanted forest is tapped for mana, its controller adds an additional one mana of the chosen color.` | |
| Lavaspur Boots | `(whenever it becomes the target of a spell or ability …)` (ward reminder, may overlap F1) | |

### F6 — Back-reference to prior action (3 cards · P1, contains test-cube card)

**Recommendation:** P1 — Delver of Secrets is in the test cube.

`if a creature card is exiled this way`, `if an instant or sorcery card is
revealed this way`, `if a noncreature card is exiled this way` — these refer to
the result of an earlier clause in the same effect chain. The grammar has no
back-reference mechanism.

| Card | Back-reference pattern | In test cube |
|---|---|---|
| Deathgorge Scavenger | `if a creature card is exiled this way, you gain 2 life.` (FAIL) | |
| Delver of Secrets // Insectile Aberration | `if an instant or sorcery card is revealed this way, transform this creature.` (FAIL) | ✓ |
| Mosswood Dreadknight // Dread Whispers | `you may cast it from your graveyard as an adventure …` (cast-from-graveyard with face restriction) | |

### F7 — Devotion conditionals (2 cards · P2)

| Card | Pattern | In test cube |
|---|---|---|
| Klothys, God of Destiny | `as long as your devotion to red and green is less than seven, ~ isn't a creature.` | |
| Purphoros, God of the Forge | `as long as your devotion to red is less than five, ~ isn't a creature.` | |

### F8 — Cost reduction by attribute count (overlaps F1/F4) (2 unique cards · P2)

`this cost is reduced by {1} for each X` / `costs {1} less to activate for each
X`. Several cards above include this as a sub-clause (Pteramander, Cemetery
Prowler, all four channel lands' cost reductions, Fugitive Codebreaker).
Treating it as its own grammar feature would clean up many partial parses.

| Card (unique) | Pattern |
|---|---|
| Cemetery Prowler | `spells you cast cost {1} less to cast for each card type they share with cards exiled with ~.` |
| Faerie Mastermind | `whenever an opponent draws their second card each turn, you draw a card.` (count-N-th draw — adjacent feature) |

### F9 — Temporary type / color / becomes-creature (5 cards · P1)

| Card | Pattern | In test cube |
|---|---|---|
| Hive of the Eye Tyrant | `until end of turn, ~ becomes a 3/3 black beholder creature …` (overlaps F3) | |
| Kellan, Planar Trailblazer | `if ~ is a scout, it becomes a human faerie detective and gains "whenever ~ deals combat damage to a player, …"` (FAIL) | |
| Wild Mongrel | `becomes the color of your choice until end of turn` (FAIL) | |
| Witness Protection | `enchanted creature loses all abilities and is a green and white citizen creature with base power and toughness 1/1 named legitimate businessperson.` | |
| Figure of Destiny | `if ~ is a warrior, it becomes a kithkin spirit warrior avatar with base power and toughness 8/8, flying, and first strike.` | |

### F10 — Color choice (3 cards · P2)

| Card | Pattern | In test cube |
|---|---|---|
| Wild Mongrel | `becomes the color of your choice` (FAIL — overlaps F9) | |
| Giver of Runes | `protection from colorless or from the color of your choice` (FAIL) | |
| Cloudseeder | `you may pay {U} or {R} to determine the color …` | |

### F11 — Divided damage / distribute counters (2 cards · P1, contains test-cube card)

**Recommendation:** P1 — Shatterskull Smashing is in the test cube.

`X damage divided as you choose among up to N target …`, `distribute X +1/+1
counters among any number of target creatures`. The grammar has `deal:
{amount, damageTo}` but not the divided-X variant.

| Card | Pattern | In test cube |
|---|---|---|
| Shatterskull Smashing // Shatterskull, the Hammer Pass | `~ deals X damage divided as you choose among up to two target creatures and/or planeswalkers.` (FAIL) | ✓ |
| Quirion Beastcaller | `distribute x +1/+1 counters among any number of target creatures …` | |

### F12 — Reveal-and-conditionally-cast / look at top of library (3 cards · P2)

| Card | Pattern | In test cube |
|---|---|---|
| God-Eternal Kefnet | `you may reveal the first card you draw each turn as you draw it. whenever you reveal an instant or sorcery card this way, copy that card and you may cast the copy.` | |
| Augur of Autumn | `you may look at the top card of your library any time. coven -- as long as you control three or more creatures with different powers, you may cast creature spells from the top of your library.` | |
| Inti, Seneschal of the Sun | `whenever you discard one or more cards, exile the top card of your library. you may play that card until your next end step.` | |

### F13 — Test-cube edge cases (bespoke fixes, P1 each)

These cards are in the test cube but each represents a unique grammar gap that
doesn't generalize to ≥3 other cards. Each warrants its own targeted fix.

| Card | Gap | In test cube |
|---|---|---|
| Goblin Welder | `Choose target X and target Y. If both targets are still legal as this ability resolves, …` (dual-target choice + conditional resolution) | ✓ |
| Sink into Stupor // Soporific Springs | `Return target spell or nonland permanent …` (`spell or [permanent]` target type) | ✓ |
| Fable of the Mirror-Breaker // Reflection of Kiki-Jiki | Saga chapter syntax (`I --`, `II --`, `III --`) | ✓ |
| Kytheon, Hero of Akros // Gideon, Battle-Forged | `if ~ and at least two other creatures attacked this combat, exile ~, then return him …` (subject-pronoun coreference + transform) | ✓ |
| Thing in the Ice // Awoken Horror | `then if it has no ice counters on it, transform it.` (sequential conditional transform) | ✓ |

### F14 — Other / single-occurrence gaps (low priority, P2 each)

The remaining Bucket B cards each contain a unique grammar gap that doesn't fit
the above features. They are listed in the appendix below for completeness.

---

## Bucket C — Needs human review (26 cards)

Parser parses each oracle text without errors, BUT sim's override exists for a
non-grammar reason: a sim-specific custom `effectType`, an `effectType:
'Unknown'` placeholder, or known dead code. The decision for each is
sim-engineering, not parser-engineering — does sim migrate to consume the AST
(removing the override), or does sim keep the bespoke handler regardless?

| Card | Reason for override | Recommendation |
|---|---|---|
| Abiding Grace | `effectType: 'Unknown'` modal end-step trigger | Sim consumes ModalNode; override removable. |
| Cave of the Frost Dragon | `effectType: 'Unknown'` (creature land) | Generic creature-land handler. |
| Celestial Colonnade | `effectType: 'Unknown'` (creature land) | Same. |
| Chrome Mox | `ImprintMana`, `Imprint` (custom imprint mechanic) | Custom sim handler stays; override stays. |
| Deep-Cavern Bat | `HandExile` (custom) | Custom; override stays. |
| Den of the Bugbear | `effectType: 'Unknown'` (creature land) | Generic creature-land handler. |
| Dragonlord Atarka | `DividedDamage` ETB (custom) | Custom; overlaps F11. |
| Greasewrench Goblin | `DiscardToDraw` exhaust (custom) | Custom; override stays. |
| Kellan, Daring Traveler // Journey On | `RevealChoose` adventure (custom) | Custom; override stays. |
| Liliana of the Veil | LoyaltyAbility-only — **dead code** per source comment | **Remove now** — `getCardMechanics` already ignores it. |
| Lion's Eye Diamond | `effectType: 'Unknown'`, `ReplacementEffect`, `CostModification` | Custom; override stays. |
| Mishra's Bauble | `BaubleEffect` (custom) | Custom; override stays. |
| Mishra's Factory | `effectType: 'Unknown'` (creature land) | Generic creature-land handler. |
| Narset, Parter of Veils | `NarsetLookahead`, `StaticRestriction` (custom) | Custom; override stays. |
| Phyrexian Metamorph | `ReplacementEffect` (enter as copy) | Custom; override stays. |
| Rishadan Port | `effectType: 'Unknown'` (tap-target-land) | Generic activated-tap-target handler. |
| Stitcher's Supplier | `ReplacementEffect` (effectType:Unknown placeholder) | Investigate. |
| Sundering Titan | `SunderingTitan` (custom) | Custom; override stays. |
| Sword of Fire and Ice | `GainKeyword` (custom — sim has handler) | Sim consumes `grants` AST node; override removable. |
| Tasigur, the Golden Fang | `effectType: 'Unknown'` | Investigate — activated ability with delve cost. |
| Thalia, Heretic Cathar | `StaticRestriction` (`opponents_etb_tapped`) | Custom; override stays. |
| Thalia's Lieutenant | `StaticRestriction` | Custom; override stays. |
| Treetop Village | `effectType: 'Unknown'` (creature land) | Generic creature-land handler. |
| Ulvenwald Oddity // Ulvenwald Behemoth | `effectType: 'Unknown'` (DFC) | Sim consumes per-face AST. |
| Voldaren Pariah // Abolisher of Bloodlines | `effectType: 'Unknown'` (DFC) | Sim consumes per-face AST. |
| Yawgmoth's Bargain | `effectType: 'Unknown'` | Investigate — alt-cost draw. |

---

## Appendix — Bucket B detail (full list)

The 86 Bucket B cards, sorted alphabetically, with parse status. Cards listed
above under specific feature groups are not repeated; only the F14 ("other /
single-occurrence") cards are itemized here.

| Card | Parse | Conf | Primary gap |
|---|---|---|---|
| Angel of Jubilation | PARTIAL | 0.67 | "players can't pay life or sacrifice creatures …" — global-restriction wording |
| Anointed Peacekeeper | PARTIAL | 0.25 | "as ~ enters, look at an opponent's hand, then choose any card name." — name-of-choice |
| Bristly Bill, Spine Sower | PARTIAL | 0.50 | "double the number of +1/+1 counters on each creature you control" |
| Cemetery Prowler | PARTIAL | 0.67 | cost-reduction by exile-this-shared-type count (F8) |
| Deadpool, Trading Card | PARTIAL | 0.33 | "you may exchange his text box and another creature's" |
| Elvish Reclaimer | PARTIAL | 0.50 | `as long as there are three or more land cards in your graveyard` (graveyard count) |
| Frontline Medic | PARTIAL | 0.50 | counter-target with X-cost predicate |
| Ghyrson Starn, Kelermorph | FAIL | 0.00 | ward reminder text + "exactly N damage" archetype |
| Grist, the Hunger Tide | PARTIAL | 0.50 | `as long as ~ isn't on the battlefield, it's a 1/1 insect creature` (off-battlefield type swap) |
| Hope of Ghirapur | PARTIAL | 0.50 | `target player who was dealt combat damage by ~ this turn` |
| Jolrael, Mwonvuli Recluse | PARTIAL | 0.50 | `whenever you draw your second card each turn` (N-th draw counter) |
| Kroxa, Titan of Death's Hunger | FAIL | 0.00 | `sacrifice it unless it escaped` (escape state predicate) |
| Metamorphosis Fanatic | PARTIAL | 0.67 | `… with a lifelink counter on it` (return-with-counter) |
| Necromancy | PARTIAL | 0.50 | `as though it had flash` + `if cast … sacrifice at the beginning of next cleanup` |
| Nihil Spellbomb | PARTIAL | 0.50 | `exile target player's graveyard` (zone target) |
| Old-Growth Troll | PARTIAL | 0.50 | becomes-aura-on-death (F3 overlap) |
| Orcish Bowmasters | PARTIAL | 0.50 | `except the first one they draw in each of their draw steps` |
| Restless Vinestalk | PARTIAL | 0.75 | `up to one other target creature has base power and toughness 3/3` |
| Sakashima's Student | PARTIAL | 0.50 | `enter as a copy of any creature, except it's a ninja in addition` |
| Shadowgrange Archfiend | FAIL | 0.00 | `creature with the greatest power among creatures they control` |
| Shadowspear | PARTIAL | 0.67 | `permanents your opponents control lose hexproof and indestructible` |
| Signal Pest | PARTIAL | 0.50 | `can't be blocked except by creatures with flying or reach` |
| Six | PARTIAL | 0.67 | `cards in your graveyard have retrace` (mechanic-grant from a static) |
| Skyclave Apparition | FAIL | 0.00 | `exile up to one target nonland, nontoken permanent …` (multi-prefix `nonland, nontoken`) |
| Skyshroud Elite | FAIL | 0.00 | `as long as an opponent controls a nonbasic land` (existential opponent-state) |
| Soul-Guide Lantern | PARTIAL | 0.67 | `exile each opponent's graveyard` (each-opponent zone target) |
| Sylvan Scavenging | FAIL | 0.00 | bullet-list modal at line 3 (modal options on separate lines) |
| Teferi, Time Raveler | PARTIAL | 0.33 | `each opponent can cast spells only any time they could cast a sorcery` |
| Terror of the Peaks | PARTIAL | 0.67 | `spells your opponents cast that target ~ cost an additional 3 life to cast` |
| Urborg Scavengers | PARTIAL | 0.50 | `~ has flying as long as a card exiled with it has flying. the same is true for first strike, …` (long keyword conjunction) |
| Urza's Bauble | FAIL | 0.00 | `look at a card at random in target player's hand` |
| Vivi Ornitier | PARTIAL | 0.50 | X-mana from creature power |
| Yeva, Nature's Herald | PARTIAL | 0.50 | `you may cast green creature spells as though they had flash` (filtered as-though-flash) |

---

## Follow-up beads

The top three grammar features (F1, F2, F3) are filed as separate parser-rig
beads. Each bead's acceptance criterion is the **full card list** from the
corresponding feature section above — no card may regress in
`simpleIsBest.test.ts`, and each unblocked card must reach `confidence === 1.0`
with no `unknownClauses`.

- **pa-bor** — F1: Modern keyword cost variants (channel/disguise/plot/squad/evoke/level up/reconfigure/hideaway/for mirrodin/alt-equip cost) — P1, 13 cards
- **pa-1kr** — F2: Conditional triggers + ability-word conditional payloads — P1, 13 cards
- **pa-q21** — F3: Token creation with embedded ability text — P1, 7 cards

## Sim cleanup follow-up (out of scope here)

Bucket A (18 cards) is a sim-side cleanup bead — these overrides can be removed
once sim's `getCardMechanics` consumes the parser AST. The sim cleanup bead
**must not be filed by parser/polecats/obsidian** — it belongs to the sim rig
and will be filed by mayor (or by an explicit `bd create --rig sim …` if mayor
delegates that). This audit's role ends with the bucket list and the parser-side
follow-ups.
