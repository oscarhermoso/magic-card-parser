# Based on https://github.com/Soothsilver/mtg-grammar/blob/master/mtg.g4
@include "./enums.ne"

card -> "\n":* abilityOrRemind ("\n" abilityOrRemind):* "\n":? {% ([, a, as]) => a ? [a, ...as.map(([, a2]) => a2).filter((a) => a)] : [...as.map(([, a2]) => a2).filter((a) => a)] %}
  | "\n":* {% () => [] %}

abilityOrRemind
 -> ability {% ([a]) => a %}
  | reminderText {% () => null %}

ability
 -> (abilityWordAbility
  | activatedAbility
  | additionalCostToCastSpell
  | keywords
  | modalAbility
  | staticOrSpell
  | triggeredAbility
) ".":? (__ reminderText):? {% ([[a]]) => a %}

connected[rule] -> $rule ("," __ $rule):* ",":? __ ("and" {% () => "and" %} | "or" {% () => "xor" %} | "and/or" {% () => "or" %}) __ $rule {% ([[o], os, , , connector, , [o2]]) => ({ [connector]: [o, ...os.map(([, , [o3]]) => o3), o2] }) %}

reminderText -> "(" [^)]:+ ")"

modalAbility -> "choose" __ modalQuantifier __ DASHDASH ((__ | "\n") modalOption):+ {% ([, , quantifier, , , options]) => ({ quantifier, options: options.map(([, o]) => o) }) %}
modalOption -> ("*" | "•") __ effect {% ([, , e]) => e %}
modalQuantifier -> "one or both" {% () => [1, 2] %}
  | "one" {% () => [1] %}
  | "one or more" {% () => "1+" %}

keywords -> keyword (("," | ";") __ keyword):* {% ([k1, ks]) => [k1].concat(ks.map(([, , k]) => k)) %}
# Keywords: simple keywords use [a-z]:+ with Set lookup; compound keywords are explicit rules.
# Temporarily removed unused keyword rules to free compiler headroom:
# bandingKeyword, landwalkKeyword, cumulativeUpkeepKeyword, bloodthirstKeyword,
# suspendKeyword, levelUpKeyword, affinityKeyword, offeringKeyword, spliceKeyword,
# forecastKeyword, championKeyword, reinforceKeyword, auraSwapKeyword
keyword -> ("double strike"
  | "first strike"
  | "split second"
  | "totem armor"
  | "battle cry"
  | "living weapon"
  | "hidden agenda"
  | "jump-start"
  | enchantKeyword
  | costKeyword
  | numberKeyword
  | protectionKeyword
  | cyclingKeyword
  | kickerKeyword
  | "partner with" __ [^(\n]:+ {% ([, , pw]) => ({ partnerWith: pw.join('') }) %}
  ) {% ([[keyword]]) => keyword %}
  | [a-z]:+ {% (data, ref, reject) => { const w = data[0].join(''); return SIMPLE_KEYWORDS.has(w) ? w : reject; } %}

# Cost keywords: keyword name __ cost → { name: cost }
costKeyword -> [a-z]:+ __ cost {% (data, ref, reject) => { const name = data[0].join(''); if (!COST_KEYWORDS.has(name)) return reject; return { [name]: data[2] }; } %}

# Number keywords: keyword name __ number → { name: number }
numberKeyword -> [a-z]:+ __ number {% (data, ref, reject) => { const name = data[0].join(''); if (!NUMBER_KEYWORDS.has(name)) return reject; return { [name]: data[2] }; } %}

cyclingKeyword -> "cycling" __ cost {% ([, , cost]) => ({ cycling: cost }) %}
  | typeCycling __ cost {% ([type, , cost]) => ({ cycling: cost, cyclingType: type }) %}
typeCycling -> "plainscycling" {% () => "plains" %}
  | "islandcycling" {% () => "island" %}
  | "swampcycling" {% () => "swamp" %}
  | "mountaincycling" {% () => "mountain" %}
  | "forestcycling" {% () => "forest" %}
  | "landcycling" {% () => "land" %}
  | "wizardcycling" {% () => "wizard" %}
  | "slivercycling" {% () => "sliver" %}
  | "basic landcycling" {% () => "basicLand" %}
enchantKeyword -> "enchant" __ anyEntity {% ([, , entity]) => ({ enchant: entity }) %}
kickerKeyword -> "kicker" __ costs {% ([, , kicker]) => ({ kicker }) %}
protectionKeyword -> "protection from" __ anyEntity {% ([, , protectionFrom]) => ({ protectionFrom }) %}
# Temporarily removed unused keyword definitions to free compiler headroom.
# Restore these when cards using them are added to the test suite:
# cumulativeUpkeepKeyword -> "cumulative upkeep" __ cost
# bloodthirstKeyword -> "bloodthirsty" __ number
# suspendKeyword -> "suspend" __ number __ DASHDASH __ cost
# levelUpKeyword -> "level up" __ cost
# affinityKeyword -> "affinity for" __ object
# offeringKeyword -> object __ "offering"
# spliceKeyword -> "splice onto" __ object __ cost
# forecastKeyword -> "forecast" __ DASHDASH __ activatedAbility
# championKeyword -> "champion" __ object
# reinforceKeyword -> "reinforce" __ number __ DASHDASH __ cost
# bandingKeyword -> "banding" | "bands with other..."
# landwalkKeyword -> anyType "walk" | "nonbasic landwalk" | "snow landwalk"
# auraSwapKeyword -> "aura swap" __ cost

abilityWordAbility -> abilityWord __ DASHDASH __ ability {% ([aw, , , , a]) => {
  if (typeof a === 'object' && a !== null && !Array.isArray(a)) {
    return { ...a, abilityWord: aw };
  }
  return a;
} %}
activatedAbility -> costs ":" __ effect (("." __ | __ ) activationInstructions):? {% ([costs, , , activatedAbility, i]) => {
  const result = { costs, activatedAbility };
  if (i) result.instructions = i[1];
  return result;
} %}
activationInstructions -> "activate" (__ "this ability"):? __ "only " activationInstruction "." {% ([, , , , i]) => ({ only: i }) %}
  | "any player may activate this ability." {% () => "anyPlayer" %}
activationInstruction -> "once each turn" {% () => "onceATurn" %}
  | "any time you could cast a sorcery" {% () => "sorceryOnly" %}
  | "any time you could cast an instant" {% () => "instantOnly" %}
  | "as a sorcery" {% () => "sorceryOnly" %}
  | "as an instant" {% () => "instantOnly" %}
  | "only if" __ condition {% ([, , condition]) => ({ condition }) %}
  | "if" __ condition {% ([, , condition]) => ({ condition }) %}
# TODO: Make into AST
activatedAbilities -> (itsPossessive __):? "activated abilities" {% ([reference]) => reference ? { whose: reference, activatedAbilities: "any" } : { activatedAbilities: "any" } %}
  | "activated abilities of" __ object {% ([, , activatedAbilities]) => ({ whose: activatedAbilities, activatedAbilities: true }) %}
activatedAbilitiesVP -> "can't" __ "be activated" (__ "unless they're mana abilities."):? {% ([, , , , manaOnly]) => manaOnly ? { cant: "activatedAbilities", unless: "manaAbility" } : { cant: "activatedAbilities" } %}

triggeredAbility -> triggerCondition "," __ effect {% ([trigger, , , effect]) => ({ trigger, effect }) %}
triggerCondition -> ("when" | "whenever") __ triggerConditionInner (__ triggerTiming):? {% ([, , inner, timing]) => {
  const result = { when: inner };
  if (timing) result.timing = timing[1];
  return result;
} %}
  | "at the beginning of" __ qualifiedPartOfTurn {% ([, , turnPhase]) => ({ turnPhase }) %}
  | "at end of combat" {% () => ({ turnPhase: "endCombat" }) %}
triggerConditionInner -> singleSentence {% ([s]) => s %}
  | connected[triggerConditionInner] {% ([c]) => c %}
  | player __ gains __ "life" {% ([actor]) => ({ actor, does: "gainLife" }) %}
  | object __ "is dealt damage" {% ([what]) => ({ what, does: "dealtDamage" }) %}
  | object __ objectVerbPhrase {% ([what, , does]) => ({ what, does }) %}
  | object __ ("or" {% () => "xor" %} | "and" {% () => "and" %}) __ object __ objectVerbPhrase {% (data, ref, reject) => {
    const what1 = data[0], what2 = data[4], connector = data[2], does = data[6];
    const w1hasRef = what1 === "CARD_NAME" || (typeof what1 === 'object' && what1 !== null && 'reference' in what1);
    const w2hasRef = what2 === "CARD_NAME" || (typeof what2 === 'object' && what2 !== null && 'reference' in what2);
    if (!w1hasRef || !w2hasRef) return reject;
    return { what: { [connector]: [what1, what2] }, does };
  } %}
triggerTiming -> "each turn" {% () => "eachTurn" %}
  | "during each opponent" SAXON __ "turn" {% () => ({ reference: "each", what: { whose: "opponent", what: "turn" } }) %}

additionalCostToCastSpell -> "as an additional cost to cast this spell," __ imperative "." {% ([, , additionalCost]) => ({ additionalCost }) %}

staticOrSpell -> sentenceDot {% ([sd]) => sd %}
effect -> (sentenceDot
  | modalAbility) {% ([[e]]) => e %}

sentenceDot -> sentence (".":? __ additionalSentence):* ".":? {% ([s, ss]) => ss.length > 0 ? [s, ...ss.map(([, , s2]) => s2)] : s %}
additionalSentence -> sentence {% ([s]) => s %}
  | "then" __ sentence {% ([, , s]) => s %}
  | triggeredAbility {% ([t]) => t %}
  | "do" __ "this" __ "only" __ "once" __ "each" __ "turn" {% () => ({ limit: "onceEachTurn" }) %}

sentence -> singleSentence {% ([ss]) => ss %}
  | singleSentence ("," __ singleSentence):* ",":? __ ("and" {% () => "and" %} | "or" {% () => "xor" %} | "and/or" {% () => "or" %}) __ singleSentence {% ([s1, ss, , , connector, , s2]) => {
    const elements = [s1, ...ss.map(([, , s]) => s), s2];
    if (elements[0] && elements[0].actor && elements.slice(1).every(e => !e || !e.actor && !e.what)) {
      const actor = elements[0].actor;
      const firstDoes = elements[0].does;
      const rest = elements.slice(1);
      // Propagate "may" if the first element's does is {may: X}
      if (firstDoes && typeof firstDoes === 'object' && firstDoes.may && !firstDoes.and && !firstDoes.xor) {
        return { actor, does: { may: { [connector]: [firstDoes.may, ...rest] } } };
      }
      // Propagate "can't" if the first element's does is {cant: X}
      if (firstDoes && typeof firstDoes === 'object' && firstDoes.cant && !firstDoes.and && !firstDoes.xor) {
        return { actor, does: { cant: { [connector]: [firstDoes.cant, ...rest] } } };
      }
      return { actor, does: { [connector]: elements.map(e => e.actor ? e.does : e) } };
    }
    // Propagate "if condition" if first element has condition+effect
    if (elements[0] && elements[0].condition && elements[0].effect) {
      return { condition: elements[0].condition, effect: { [connector]: [elements[0].effect, ...elements.slice(1)] } };
    }
    // Propagate "for each" if first element has forEach+effect
    if (elements[0] && elements[0].forEach && elements[0].effect) {
      return { forEach: elements[0].forEach, effect: { [connector]: [elements[0].effect, ...elements.slice(1)] } };
    }
    return { [connector]: elements };
  } %}
  | singleSentence ("," __ singleSentence):* "," __ "then" __ singleSentence {% ([s1, ss, , , , , s2]) => {
    const elements = [s1, ...ss.map(([, , s]) => s), s2];
    if (elements[0] && elements[0].condition && elements[0].effect) {
      return { condition: elements[0].condition, effect: { and: [elements[0].effect, ...elements.slice(1)] } };
    }
    return { and: elements };
  } %}
  | "otherwise," __ sentence {% ([, , otherwise]) => ({ otherwise }) %}
  | singleSentence __ "instead of" __ singleSentence {% ([does, , , , insteadOf]) => ({ does, insteadOf }) %}
  | sentence __ "at" __ qualifiedPartOfTurn {% ([does, , , , at]) => ({ does, at }) %}
  | sentence __ "if" __ condition {% ([does, , , , condition]) => ({ does, condition }) %}
singleSentence -> imperative {% ([i]) => i %}
  | object __ objectVerbPhrase {% ([what, , does]) => ({ what, does }) %}
  | "it's" __ isWhat {% ([, , is]) => ({ is }) %}
  | player __ playerVerbPhrase {% ([actor, , does]) => ({ actor, does }) %}
  | "if" __ condition "," __ sentence {% ([, , condition, , , effect]) => ({ condition, effect }) %}
  | "if" __ object __ "would" __ (objectVerbPhrase | objectInfinitive) "," __ sentenceInstead {% ([, , what, , , , [does], , , instead]) => ({ what, does, instead }) %}
  | "if" __ player __ "would" __ playerVerbPhrase (__ exceptClause):? (__ whileClause):? "," __ sentenceInstead {% ([, , actor, , , , would, except, whileC, , , instead]) => {
    const result = { actor, would, instead };
    if (except) result.except = except[1];
    if (whileC) result.while = whileC[1];
    return result;
  } %}
  | asLongAsClause "," __ sentence {% ([asLongAs, , , effect]) => ({ asLongAs, effect }) %}
  | duration "," __ sentence {% ([duration, , , effect]) => ({ duration, effect }) %}
  | duration "," __ triggeredAbility {% ([duration, , , effect]) => ({ duration, effect }) %}
  | "for each" __ object "," __ sentence {% ([, , forEach, , , effect]) => ({ forEach, effect }) %}
  | "for each of" __ object "," __ sentence {% ([, , forEach, , , effect]) => ({ forEach, effect }) %}
  | activatedAbilities __ activatedAbilitiesVP (__ duration):? {% ([abilities, , effect, duration]) => duration ? { ...abilities, ...effect, duration: duration[1] } : { ...abilities, ...effect } %}
  | itsPossessive __ numericalCharacteristic __ ("is" | "are each") __ "equal to" __ numberDefinition {% ([what, , characteristic, , , , , , setTo]) => ({ what, characteristic, setTo }) %}
  | "the flashback cost is equal to" __ itsPossessive __ "mana cost" {% ([, , whose]) => ({ flashbackCost: { whose } }) %}
  | "as" __ sentence "," __ sentence {% ([, , as, , , does]) => ({ as, does }) %}
  | "instead" __ singleSentence {% ([, , instead]) => ({ instead }) %}
  | imperative __ "instead" __ "if" __ condition {% ([instead, , , , , , condition]) => ({ instead, condition }) %}
  | playersPossessive __ "maximum hand size is" __ ("reduced" | "increased") __ "by" __ numberDefinition {% ([whose, , , , handSize, , , , amount])  => ({ whose, handSize, amount }) %}
  | "any time" __ player __ "could activate a mana ability," __ sentence {% ([, , actor, , , , , , does]) => ({ timing: "manaAbility", actor, does }) %}
  | "skip" __ playersPossessive __ partOfTurn {% ([, , whose, , step]) => ({ skip: { whose, step } }) %}
  | "play with the top card of" __ playersPossessive __ "library revealed" {% ([, , whose]) => ({ playRevealed: { whose } }) %}
  | "each" __ permanentTypeInner __ "is" __ "a" "n":? __ subType __ "in addition to its other" __ permanentTypeInner __ "types" {% ([, , what, , , , , , , type, , , , , , ]) => ({ each: what, is: { type, inAddition: true } }) %}
sentenceInstead -> sentence __ "instead" {% ([instead]) => ({ instead }) %}
  | "instead" __ sentence {% ([, ,instead]) => ({ instead }) %}
forEachClause -> "for each" __ pureObject {% ([, , forEach]) => ({ forEach }) %}
 | "for each color of mana spent to cast" __ object {% ([, , forEachColorSpent]) => ({ forEachColorSpent }) %}

condition -> sentence {% ([s]) => s %}
  # | ("you've" | "you") __ action __ duration  # temporarily removed — unused
  | "you've" __ "cast" __ countableCount __ object __ duration {% ([, , , , count, , what, , during]) => ({ done: { cast: { count, what } }, during }) %}
  | "it's" __ "your turn" {% () => "yourTurn" %}
  | "it's" __ "not" __ playersPossessive __ "turn" {% ([, , notTurnOf]) => ({ notTurnOf }) %}
  | object __ "has" __ countableCount __ (counterKind __):? "counter" "s":? "on it" {% ([object, , , count, , hasCounter]) => ({ object, count, hasCounter }) %}
  | numberDefinition __ "is" __ numericalComparison {% ([number, , , , is]) => ({ number, is }) %}
  | "that mana is spent on" __ object {% ([, , manaSpentOn]) => ({ manaSpentOn }) %}
  | zone __ "has no cards in it" {% ([zone]) => ({ not: { has: { what: "card", in: zone } } }) %}
  | ("is" __):? "paired" __ withClause {% ([, , , pairedWith]) => ({ pairedWith }) %}
  | ("is" __):? "untapped" {% () => "untapped" %}
  | object __ "has the chosen name" {% ([what]) => ({ what, has: { reference: "chosen", what: "name" } }) %}
  | "it" __ ("wasn" "'" "t" | "was not") __ "the first" __ object __ player __ "played" __ duration {% ([, , , , , , what, , who, , , , during]) => ({ not: { ordinal: "first", what, who, during } }) %}
  | (numericalComparison {% ([condition]) => ({ condition }) %}| manaSymbol {% ([mana]) => ({ mana }) %}) __ "was spent to cast this spell" {% ([c]) => ({ ...c, value: { what: "mana", reference: { does: "spent", reference: "this", what: "spell" } } }) %}
  | object __ "was kicked with its" __ manacost __ "kicker" {% ([what, , , , mana]) => ({ what, kicked: { with: { mana } } }) %}
  | object __ "has" __ englishNumber __ counterKind __ "counter" "s":? " on it" {% ([what, , , , amount, , counterKind]) => ({ what, has: { amount, counterKind } }) %}
  | "there" __ ("are" | "is") __ countableCount __ object __ inZone {% ([, , , , count, , what, , zone]) => ({ count, what, ...zone }) %}
  | "it's" __ "the" __ ordinal __ object __ player __ "cast" __ duration {% ([, , , , ordinal, , what, , actor, , , , during]) => ({ ordinal, cast: { what, actor }, during }) %}

ordinal -> "first" {% () => 1 %}
  | "second" {% () => 2 %}
  | "third" {% () => 3 %}

# action -> "scried" | "surveilled"  # temporarily removed — unused

anyEntity -> object {% ([e]) => e %}
  | pureObject {% ([e]) => e %}
  | player {% ([e]) => e %}
  | purePlayer {% ([e]) => e %}
  | color {% ([color]) => ({ color }) %}
  | "everything" {% () => "everything" %}
player -> "you" {% () => "you" %}
  | connected[player] {% ([c]) => c %}
  | "they" {% () => "they" %}
  | "that player" {% () => "they" %}
  | (commonReferencingPrefix __):* purePlayer {% ([references, player]) => {
    if (references.length === 1 && references[0][0] === "that" && player === "player") return "they";
    if (references.length === 1 && references[0][0] === "each") return { each: player };
    return references.length > 0 ? { references: references.map(([r]) => r), player } : player;
  } %}
  | "your opponent" "s":? {% () => ({ references: ["your"], player: "opponents" }) %}
  | "defending player" {% () => "defendingPlayer" %}
  | itsPossessive __ ("controller" {% () => "control" %} | "owner" {% () => "own" %}) "s":? {% ([whose, , does]) => ({ whose, does })  %}
  | "each of" __ player {% ([, , each]) => ({ each }) %}
  | "each opponent" {% () => ({ each: "opponents" }) %}
  | "each player who has cast" __ object __ "this turn" {% ([, , what]) => ({ each: "player", condition: { cast: what, during: "thisTurn" } }) %}
  | "each player other than" __ itsPossessive __ ("controller" {% () => "control" %} | "owner" {% () => "own" %}) {% ([, , whose, , does]) => ({ each: "player", except: { whose, does } }) %}
  | "your team" {% () => "team" %}
purePlayer -> "player" "s":? {% () => "player" %}
  | "opponent" "s":? {% () => "opponents" %}
  | "no one" {% () => "noone" %}
object -> (referencingObjectPrefix __):? objectInner {% ([reference, object]) => reference ? { reference: reference[0], object } : object %}
objectInner -> "it" {% () => "it" %}
  | "them" {% () => "them" %}
  | "they" {% () => "they" %}
  | "rest" {% () => "rest" %}
  | "this emblem" {% () => "emblem" %}
  | object __ "that's" __ isWhat {% ([object, , , , condition]) => ({ object, condition }) %}
  | pureObject {% ([po]) => po %}
  | pureObject __ ("and" {% () => "and" %} | "or" {% () => "xor" %} | "and/or" {% () => "or" %}) __ pureObject {% ([o1,,c,,o2],r,reject) => (c!=="and"||o1?.prefixes||o2?.prefixes||o1?.object?.prefixes||o2?.object?.prefixes) ? {[c]:[o1,o2]} : reject %}
  | "each of" __ object {% ([, , each]) => ({ each }) %}
  | "the top" __ englishNumber __ "cards of" __ zone {% ([, , topCards, , , , from]) => ({ topCards, from }) %}
  | "the top of" __ playersPossessive __ "library" {% ([, , whose]) => ({ topOf: { whose, what: "library" } }) %}
  | "the top card of" __ zone {% ([, , from]) => ({ topCards: 1, from }) %}
  | (counterKind __):? "counter" "s":? __ "on" __ object {% ([kind, , , , , , countersOn]) => kind ? { counterType: kind[0], countersOn } : { countersOn } %}
suffix -> player __ (("don't" | "doesn't") __):? ("control" | "own") "s":? {% ([actor, negate, , [does]]) => !negate ? { actor, does: { not: does } } : { actor, does } %}
  | "in" __ zone __ "drawn" __ duration {% ([, , zone, , , when]) => ({ in: zone, drawn: when }) %}
  | "in" __ zone (__ "and in" __ zone):? {% ([, , zone, zone2]) => zone2 ? { and: [{ in: zone}, {in: zone2[3]}] } : { in: zone } %}
  | "not" __ suffix {% ([, , not]) => ({ not }) %}
  | "revealed this way" {% () => ({ reference: "thisWay", does: "reveal" }) %}
  | "from" __ object {% ([, , from]) => ({ from }) %}
  | ("that" __):? "you cast" {% () => "youCast" %}
  # | "that" __ didAction (__ duration)?  # temporarily removed — unused
  | "that targets only" __ object {% ([, , onlyTargets]) => ({ onlyTargets }) %}
  | "that targets" __ anyEntity {% ([, , targets]) => ({ targets }) %}
  | "tapped this way" {% () => "tappedThisWay" %}
  | ("destroyed" {% () => "destroy" %} | "exiled" {% () => "exile" %}) __ (fromZone __):? "this way" {% ([does, , from]) => from ? { from: from[0], reference: "thisWay", does } : { reference: "thisWay", does } %}
  | "of the" __ anyType __ "type of" __ playersPossessive __ "choice" {% ([, , type, , , , actor]) => ({ type, actor, does: "choose" }) %}
  | "on the battlefield" {% () => ({ in: "battlefield" }) %}
  | "put onto the battlefield with" __ object {% ([, , by]) => ({ does: "putOntoBattlefield", by }) %}
  | "of the chosen color" {% () => ({ color: "chosen" }) %}
  | object __ "could target" {% ([couldTarget]) => ({ couldTarget }) %}
  | "able to block" __ object {% ([, , canBlock]) => ({ canBlock }) %}
  | "that convoked" __ object {% ([, , convoked]) => ({ convoked }) %}
  | "from among them" {% () => "amongThem" %}
  | "named" __ CARD_NAME {% ([, , named]) => ({ named }) %}
  | "you've" __ "cast before it this turn" {% () => "youveCastBeforeThisTurn" %}
  | "not named" __ CARD_NAME {% ([, , named]) => ({ not: { named } }) %}
  | "attached to" __ object {% ([, , attachedTo]) => ({ attachedTo }) %}
  | "it targets" {% () => ({ what: "it", does: "targets" }) %}
  | "other than" __ object {% ([, , not]) => ({ not }) %}
  | objectAction __ "this way" {% ([does]) => ({ reference: "thisWay", does }) %}
  | player __ objectAction __ "this way" {% ([actor, , does]) => ({ actor, reference: "thisWay", does }) %}
  | "of" __ playersPossessive __ "choice" {% ([, , whose]) => ({ choice: whose }) %}
  | "with base power and toughness" __ pt {% ([, , basePowerToughness]) => ({ basePowerToughness }) %}
  | "with total" __ numericalCharacteristic __ numericalComparison {% ([, , characteristic, , value]) => ({ total: { [characteristic]: value } }) %}
  | "dealt damage this way" {% () => ({ reference: "thisWay", does: "dealtDamage" }) %}
  | "entering or dying" {% () => ({ does: { or: ["enter", "die"] } }) %}
  | "entering" {% () => ({ does: "enter" }) %}
objectAction -> "sacrificed" {% () => "sacrifice" %}
  | "returned" {% () => "return" %}
  | "discarded" {% () => "discard" %}
  | "exiled" {% () => "exile" %}
pureObject -> pureObject1 (__ suffix):? (__ withClause | __ "without" __ keyword):? {% ([o, suffix, mod]) => {
  let result = suffix ? { object: o, suffix: suffix[1] } : o;
  if (mod) {
    if (typeof result !== 'object' || result === null) result = { object: result };
    if (mod[1] === "without") result.without = mod[3];
    else result.condition = mod[1];
  }
  return result;
} %}
pureObject1 -> (prefix __):* (anyType __):? pureObjectInner {% ([prefixes, types, object, suffix]) => {
  if (prefixes.length === 0 && !suffix && !types) return object;
  const result = { object };
  if (types) result.types = types[0];
  if (prefixes.length > 0) result.prefixes = prefixes.map(([p]) => p);
  if (suffix) result.suffix = suffix[1];
  return result;
} %}
  | (prefix __):* anyType "s":? {% ([prefixes, type]) => {
  const result = { type };
  if (prefixes.length > 0) result.prefixes = prefixes.map(([p]) => p);
  return result;
} %}
pureObjectInner -> ("copy" | "copies") (__ "of" __ object):? {% ([, copyOf]) => copyOf ? { copyOf } : "copy" %}
  | "card" "s":? {% () => "card" %}
  | "spell" "s":? {% () => "spell" %}
  | "type" "s":? {% () => "type" %}
  | pureObjectInner __ "without" __ keyword {% ([object, , , , without]) => ({ object, without }) %}
  | CARD_NAME {% ([c]) => c %}
  | "ability" {% () => "ability" %}
  | "abilities" {% () => "abilities" %}
  | "source" "s":? {% () => "source" %}
  | "commander" {% () => "commander" %}
  | "token" {% () => "token" %}
  | "target" "s":? {% () => "target" %}
  | "spell or ability" {% () => ({ or: ["spell", "ability"] }) %}
  | "spell or permanent" {% () => ({ or: ["spell", "permanent"] }) %}
referencingObjectPrefix -> "the sacrificed" {% () => "sacrificed" %}
  | "any of" {% () => "any" %}
  | "the" {% () => "the" %}
  | "the rest of" {% () => "rest" %}
  | playersPossessive {% ([p]) => ({ possessive: p }) %}
  | commonReferencingPrefix {% ([p]) => p %}
commonReferencingPrefix -> countableCount (__ "additional"):? (__ commonReferencingPrefixInner):? {% ([count, additional, inner]) => {
    const result = { count }
    if (additional) result.additional = true;
    if (inner) result.reference = inner[1];
    return result;
  } %}
  | ("another" __):? (countableCount __):? "target" "s":?  {% ([another, count]) => {
    const targetCount = count ? count[0] : 1;
    return another ? { reference: "other", targetCount } : { targetCount }
  } %}
  | commonReferencingPrefixInner {% ([i]) => i %}
commonReferencingPrefixInner -> "each" {% () => "each" %}
  | "the" {% () => "the" %}
  | "any" {% () => "any" %}
  | "this" {% () => "this" %}
  | "attacking" {% () => "attacking" %}
  | "enchanted" {% () => "enchanted" %}
  | "equipped" {% () => "equipped" %}
  | "that" {% () => "that" %}
  | "that player" SAXON {% () => "thatPlayer" %}
  | "these" {% () => "these" %}
  | "those" {% () => "those" %}
  | "another" {% () => "other" %}
  | "the chosen" {% () => "chosen" %}
  | "at least" __ englishNumber {% ([, , atLeast]) => ({ atLeast }) %}
  | "your" {% () => "your" %}
prefix -> "first" {% () => "first" %}
  | "attached" {% () => "attached" %}
  | "historic" {% () => "historic" %}
  | "noncreature," __ "nonland" {% () => ({ not: { and: ["creature", "land"] } }) %}
  | "nonartifact," __ "nonland" {% () => ({ not: { and: ["artifact", "land"] } }) %}
  | "non" ("-" | __):? (anyType {% ([type]) => ({ type }) %} | color {% ([color]) => ({ color }) %}) {% ([, , not]) => ({ not }) %}
  | "exiled" {% () => "exiled" %}
  | "revealed" {% () => "revealed" %}
  | "permanent" SAXON {% () => "permanent's" %}
  | "activated" {% () => ({ abilityType: "activated" }) %}
  | "triggered" {% () => ({ abilityType: "triggered" }) %}
  | "token" {% () => "token" %}
  | "nontoken" {% () => ({ not: "token" }) %}
  | "nonsnow" {% () => ({ not: { type: "snow" } }) %}
  | color {% ([color]) => ({ color }) %}
  | "face-down" {% () => "faceDown" %}
  | "tapped" {% () => "tapped" %}
  | "untapped" {% () => ({ not: "tapped" }) %}
  | pt {% ([size]) => ({ size }) %}
  | "attacking" {% () => "attacking" %}
  | "blocking" {% () => "blocking" %}
  | connected[prefix] {% ([c]) => c %}
  | "other" {% () => "other" %}

# didAction -> "dealt damage" | "was dealt damage" | "discarded"  # temporarily removed — unused

imperative -> "sacrifice" "s":? __ object {% ([, , , sacrifice]) => ({ sacrifice }) %}
  | connected[imperative] {% ([c]) => c %}
  | "fateseal" __ number {% ([, , fateseal]) => ({ fateseal }) %}
  | "destroy" "s":? __ object {% ([, , , destroy]) => ({ destroy }) %}
  | "detain" __ object {% ([, , detain]) => ({ detain }) %}
  | "discard" "s":? __ playersPossessive __ "hand" {% ([, , , whose]) => ({ discard: { what: "hand", whose } }) %}
  | "discard" "s":? __ object (__ "at random"):? {% ([, , , discard, random]) => random ? { discard, random: true } : { discard } %}
  | "return" "s":? __ object  (__ fromZone):? __ "to" __ zone (__ "tapped"):? (__ "under" __ playersPossessive __ "control"):? (__ "attached to" __ object):? {% ([, , , returns, from, , , , to, tapped, control, attached]) => {
    let result = tapped ? { returns, to, tapped: true } : { returns, to };
    if (attached) result.attached = attached[3];
    if (from) result.from = from[1];
    if (control) result.control = control[3];
    return result;
  } %}
  | "return" "s":? __ "to" __ zone __ object {% ([, , , , , to, , returns]) => ({ returns, to }) %}
  | "exile" "s":? __ object (__ fromZone):? (__ "face down"):? {% ([, , , exile, from, faceDown]) => {
    const result = { exile };
    if (from) result.from = from[1];
    if (faceDown) result.faceDown = true;
    return result;
  } %}
  | "create" "s":? __ tokenDescription {% ([, , , create]) => ({ create }) %}
  | ("copy" | "copies") __ object (__ countableCount):? {% ([, , copy, times]) => times ? { copy, times: times[1] } : { copy } %}
  | "lose" "s":? __ englishNumber __ "life" {% ([, , , loseLife]) => ({ loseLife }) %}
  | "mill" "s":? __ englishNumber __ "card" "s":? {% ([, , , mill]) => ({ mill }) %}
  | gains (__ numberDefinition):? __ "life" {% ([, gainLife]) => gainLife ? { gainLife: gainLife[1] } : "gainLife" %}
  | gains __ "no life" {% () => ({ lifeGain: 0 }) %}
  | gains __ "control of" __ object {% ([, , , , gainControlOf]) => ({ gainControlOf }) %}
  | "remove" "s":? __ countableCount __ (counterKind __):? "counter" "s":? __ "from" __ object {% ([, , , count, , counterKind, , , , , , removeCountersFrom]) => counterKind ? { count, removeCountersFrom, counterKind: counterKind[0] } : { count, removeCountersFrom } %}
  | ("cast" | "play") "s":? __ "additional" __ object {% ([[cp], , , , , cast]) => ({ [cp.toLowerCase()]: cast, additional: true }) %}
  | ("cast" | "play") "s":? __ object __ fromZone __ "without paying its mana cost" {% ([[cp], , , cast, , from, , ]) => ({ [cp.toLowerCase()]: cast, from, withoutPaying: true }) %}
  | ("cast" | "play") "s":? __ object (__ "without paying" __ ("its" | playersPossessive) __ "mana cost" "s":?):? (__ "and" __ asThoughClause):? (__ duration):? (__ "only during" __ partOfTurn):? (__ "on each of" __ qualifiedPartOfTurn "s":?):? {% ([[cp], , , cast, withoutPaying, asThough, duration, onlyDuring, each]) => {
    const result = { [cp.toLowerCase()]: cast };
    if (withoutPaying) result.withoutPaying = true;
    if (asThough) result.asThough = asThough[3];
    if (duration) result.duration = duration[1];
    if (onlyDuring) result.onlyDuring = onlyDuring[3];
    if (each) result.each = each[3];
    return result;
  } %}
  | "surveil" __ number {% ([, , surveil]) => ({ surveil }) %}
  | "search" "es":? __ zone (__ "for" __ object):? {% ([, , , search, criteria]) => criteria ? { search, criteria: criteria[3] } : search %}
  | "choose" "s":? __ (object {% ([o]) => o %} | "a" __ anyType __ "type" {% ([, , type]) => ({ type }) %} | "not to" __ imperative {% ([, , not]) => ({ not }) %} | "a" (__ "nonland"):? __ "card name" {% ([, nonland]) => nonland ? { cardName: { not: "land" } } : "cardName" %} | "a color" {% () => "color" %} | "a" __ object __ "of each basic land type" {% ([, , what]) => ({ what, ofEach: "basicLandType" }) %}) {% ([, , , choose]) => ({ choose }) %}
  | "draw" "s":? __ ("a" __ "card" {% () => 1 %} | "an additional card" {% () => 1 %} | englishNumber __ "additional" __ "card" "s" {% ([n]) => ({ additional: n }) %} | englishNumber __ "card" "s" {% ([n]) => n %}) {% ([, , , draw]) => ({ draw }) %}
  | "draw" "s":? __ "cards equal to" __ numberDefinition {% ([, , , , , draw]) => ({ draw }) %}
  | "draw" "s":? __ "more than" __ englishNumber __ "card" "s":? (__ "each" __ "turn"):? {% ([, , , , , max, , , , duration]) => ({ draw: { max }, duration: duration ? { reference: "each", what: "turn" } : null }) %}
  | "shuffle" "s":? __ zone {% ([, , , shuffle]) => ({ shuffle }) %}
  | "shuffle" "s":? __ (object | zone) __ "into" __ zone {% ([, , , shuffle, , , , into]) => ({ shuffle, into }) %}
  | "shuffle" "s":? {% () => ({ shuffle: "library" }) %}
  | "counter" "s":? __ object {% ([, , , counter]) => ({ counter }) %}
  | "tap" "s":? (__ "or untap"):? __ object {% ([, , untap, , tap]) => untap ? { does: { or: ["tap", "untap"] }, to: tap } : { tap } %}
  | "untap" "s":? (__ "and goad" "s":?):? __ object (__ "during" __ qualifiedPartOfTurn):? {% ([, , goad, , untap, during]) => {
      const result = during ? { untap, when: during[3] } : { untap };
      if (goad) result.goad = true;
      return result;
    } %}
  | "take" "s":? __ "an extra turn after this one" {% () => "takeExtraTurn" %}
  | "scry" __ number {% ([, , scry]) => ({ scry }) %}
  | "pay" "s":? __ manacost (__ "rather than pay the mana cost for" __ object):? (", where x is" __ numberDefinition):? {% ([, , , pay, rather, whereX]) => {
    const result = rather ? { pay, ratherThanCostOf: rather[3] } : { pay };
    if (whereX) result.X = whereX[2];
    return result;
  } %}
  | "pay" "s":? __ numericalNumber __ "life" {% ([, , , life]) => ({ pay: { life } }) %}
  | "add one mana of any color" {% () => ({ addOneOf: ["W", "U", "B", "R", "G"], amount: 1 }) %}
  | "add" "s":? __ englishNumber __ "mana of any one color" {% ([, , , amount]) => ({ addOneOf: ["w", "u", "b", "r", "g"], amount }) %}
  | "add" "s":? __ englishNumber __ "mana in any combination of" __ (manaSymbol __ "and/or" __ manaSymbol {% ([c1, , , , c2]) => [c1, c2] %} | "colors" {% () => ["w", "u", "b", "r", "g"] %}) {% ([, , , amount, , , , addCombinationOf]) => ({ addCombinationOf, amount }) %}
  | "add" "s":? __ manaSymbols ("," __ manaSymbols):* (",":? __ "or" __ manaSymbols):? {% ([, , , m1, ms, last]) => {
    const all = [m1, ...ms.map(([, , m2]) => m2)];
    if (last) all.push(last[4]);
    return all.length > 1 ? { addOneOf: all } : { add: m1 };
  } %}
  | "add" "s":? __ "an additional" __ manaSymbols {% ([, , , , , add]) => ({ add, additional: true }) %}
  | "add" "s":? __ "one mana of any type that" __ object __ "produced" {% ([, , , , , source]) => ({ addOneOf: "anyProduced", source }) %}
  | "add" "s":? __ "one mana of any of" __ itsPossessive __ "colors" {% ([, , , , , whose]) => ({ addOneOf: "anyColor", source: whose }) %}
  | "add" "s":? __ "an amount of" __ manaSymbols __ "equal to" __ numberDefinition {% ([, , , , , mana, , , , amount]) => ({ add: mana, amount }) %}
  | "prevent" __ damagePreventionAmount __ damageNoun __ (object __ "would deal" {% ([from]) => ({ from }) %} | "that would be dealt to" __ "and dealt by" __ anyEntity {% ([, , , , target]) => ({ to: target, by: target }) %} | "that would be dealt" (__ "to" __ anyEntity):? {% ([, to]) => to ? { to: to[3] } : { to: "any" } %}) (__ duration):?{% ([, , amount, , prevent, , to, duration]) => {
    const result = to ? { amount, prevent, ...to } : { amount, prevent };
    if (duration) result.duration = duration[1];
    return result;
  } %}
  | "put" "s":? __ englishNumber __ counterKind __ "counter" "s":? __ "on" __ object {% ([, , , amount, , counterKind, , , , , , , putOn]) => ({ amount, counterKind, putOn }) %}
  | "choose" "s":? __ object {% ([, , , choose]) => ({ choose }) %}
  | "look" "s":? __ "at" __ (object | zone) {% ([, , , , , [lookAt]]) => ({ lookAt }) %}
  | "put them back in any order" {% () => ({ putBack: true, anyOrder: true }) %}
  | "reveal" "s":? __ (object | zone) (__ "at random" __ fromZone):? {% ([, , , [reveal], random]) => random ? { random: true, from: random[3], reveal } : { reveal } %}
  | "put" "s":? __ object (__ fromZone):? __ intoZone (__ "tapped"):? (__ "and" __ object __ intoZone):? (__ "under" __ playersPossessive __ "control"):? (__ "instead of" __ intoZone):? {% ([, , , put, from, , into, tapped, additional, control, insteadOf]) => {
    let result = { put, into };
    if (from) result.from = from[1];
    if (tapped) result.tapped = true;
    if (control) result.control = control[3];
    if (additional) result = { and: [result, { put:additional[3], into: additional[5] }] };
    if (insteadOf) result.insteadOf = insteadOf[3];
    return result;
  } %}
  | "have" __ object __ (objectInfinitive {% ([property]) => ({ property }) %} | objectVerbPhrase {% ([does]) => ({ does }) %}) {% ([, , have, , property]) => ({ have, ...property }) %}
  | "have" __ player __ playerVerbPhrase {% ([, , actor, , does]) => ({ actor, does }) %}
  | "have your life total become" __ numberDefinition {% ([, , lifeTotalBecomes]) => ({ lifeTotalBecomes }) %}
  | "have" __ numericalComparison __ numberDefinition {% ([, , comparison, , value]) => ({ comparison, value }) %}
  | imperative __ "for each" __ pureObject {% ([does, , , , forEach]) => ({ does, forEach }) %}
  | imperative __ "unless" __ sentence {% ([does, , , , unless]) => ({ does, unless }) %}
  | "choose new targets for" __ object {% ([, , newTargets]) => ({ choose: { newTargets } }) %}
  | "switch the power and toughness of" __ object __ untilClause {% ([, , switchPowerToughness, , until]) => ({ switchPowerToughness, until }) %}
  | "do the same for" __ object {% ([, , doSameFor]) => ({ doSameFor }) %}
  | "spend mana as though it were mana of any type to cast" __ object {% ([, , spendManaAsAnyTypeFor]) => ({ spendManaAsAnyTypeFor }) %}
  | "transform" __ object {% ([, , transform]) => ({ transform }) %}
  | "flip a coin" {% () => "flipCoin" %}
  | "win the flip" {% () => "winFlip" %}
  | "win" __ "the" __ "game" {% () => "winGame" %}
  | "win" {% () => "winGame" %}
  | "lose the flip" {% () => "loseFlip" %}
  | "regenerate" __ object {% ([, , regenerate]) => ({ regenerate }) %}
  | "bolster" __ englishNumber {% ([, , bolster]) => ({ bolster }) %}
  | "populate" {% () => "populate" %}
  | "investigate" {% () => "investigate" %}
  | "lose" "s":? __ "life equal to" __ numberDefinition {% ([, , , , , loseLife]) => ({ loseLife }) %}
  | imperative __ untilClause {% ([does, , until]) => ({ does, until }) %}
  | "support" __ number {% ([, , support]) => ({ support }) %}
  | "attach" __ object __ "to" __ object {% ([, , attach, , , , to]) => ({ attach, to }) %}
  | "end the turn" {% () => "endTurn" %}
  | "cast" __ numericalComparison __ "spell" __ duration {% ([, , comparison, , what, , duration]) => ({ cast: { comparison, what, duration } }) %}
  | "spend this mana only to cast" __ object {% ([, , spendOnlyOn]) => ({ spendOnlyOn }) %}

playerVerbPhrase -> modifiedPlayerVerbPhrase {% ([m]) => m %}
  | "each" __ modifiedPlayerVerbPhrase {% ([, , each]) => ({ each }) %}
modifiedPlayerVerbPhrase -> basePlayerVerbPhrase (__ playerVerbModifier):? {% ([does, mod]) => {
    if (!mod) return does;
    return { does, ...mod[1] };
  } %}
playerVerbModifier -> "for each" __ pureObject {% ([, , forEach]) => ({ forEach }) %}
  | "for the first time each turn" {% () => ({ reference: "firstTime", duration: { reference: "each", what: "turn" } }) %}
  | "if" __ sentence {% ([, , condition]) => ({ condition }) %}
  | "this way" {% () => ({ reference: "thisWay" }) %}
  | asLongAsClause {% ([asLongAs]) => ({ asLongAs }) %}
basePlayerVerbPhrase -> gains __ "life equal to" __ itsPossessive __ numericalCharacteristic {% ([, , , , whose, , value]) => ({ lifeGain: { whose, value } }) %}
  | controls __ ("no" __):? object {% ([, , negation, controls]) => negation ? { not: { controls } } : { controls } %}
  | controls __ "more" __ object __ "than" __ player {% ([, , , , what, , , , thanWhom]) => ({ controls: { more: what, than: thanWhom } }) %}
  # | owns __ object  # temporarily removed — unused
  | ("don't" | "doesn't") "lose this mana as steps and phases end." {% () => "doesntEmpty" %}
  | "surveil" "s":? {% () => "surveil" %}
  | "life total becomes" __ englishNumber {% ([, , lifeTotalBecomes]) => ({ lifeTotalBecomes }) %}
  | "attack" ("s" | "ed"):? (__ player):? (__ "with" __ numericalComparison __ "creatures"):? (__ duration):? {% ([, , who, creatures, duration]) => {
    if (!who && !creatures && !duration) return "attack";
    const result = { does: "attack" };
    if (who) result.who = who[1];
    if (creatures) result.creatures = creatures[3];
    if (duration) result.duration = duration[1];
    return result;
  } %}
  | "may" __ imperative __ "rather than" __ imperative {% ([, , may, , , , ratherThan]) => ({ may, ratherThan }) %}
  | "may" __ imperative {% ([, , may]) => ({ may }) %}
  | imperative {% ([i]) => i %}
  | "can't" __ imperative {% ([, , cant]) => ({ cant }) %}
  | ("doesn't" | "don't") {% () => { not: "do" } %}
  | ("does" | "do") {% () => "do" %}
  | "lose" "s":? __ "the game" {% () => "lose" %}
  | gets __ "an emblem" __ withClause {% ([, , , , emblem]) => ({ emblem }) %}
  | "may play" __ object __ fromZone {% ([, , what, , from]) => ({ may: { play: what, from } }) %}
  | "may cast" __ object __ fromZone {% ([, , what, , from]) => ({ may: { cast: what, from } }) %}
  | "may play" __ object __ "and cast" __ object __ fromZone {% ([, , play, , , , cast, , from]) => ({ may: { play: play, cast: cast, from } }) %}
  | "cycle" __ object {% ([, , cycle]) => ({ cycle }) %}
  | "tap" "s":? __ object __ "for mana" {% ([, , , what]) => ({ tapsForMana: what }) %}
  | "has no cards in hand" {% () => ({ not: { has: { what: "card", in: "hand" } } }) %}
  | ("have" | "has") __ object __ inZone {% ([, , what, , inZone]) => ({ has: { what, ...inZone } }) %}
  | "has" __ object __ objectVerbPhrase {% ([, , what, , does]) => ({ what, does }) %}
objectVerbPhrase -> connected[modifiedObjectVerbPhrase] {% ([c]) => c %}
  | modifiedObjectVerbPhrase {% ([m]) => m %}
modifiedObjectVerbPhrase -> baseObjectVerbPhrase (__ forEachClause):? (__ durationOrDuring):? (", where x is" __ numberDefinition):? {% ([does, forEach, dur, whereX]) => {
    let result = does;
    if (forEach) result = { does: result, forEach: forEach[1] };
    if (dur) result = { does: result, ...dur[1] };
    if (whereX) result = { does: result, X: whereX[2] };
    return result;
  } %}
  | baseObjectVerbPhrase (__ durationOrDuring) (__ forEachClause) {% ([does, dur, forEach]) => {
    let result = { does, ...dur[1] };
    result = { does: result, forEach: forEach[1] };
    return result;
  } %}
durationOrDuring -> duration {% ([d]) => ({ duration: d }) %}
  | "during" __ qualifiedPartOfTurn {% ([, , during]) => ({ during }) %}
baseObjectVerbPhrase -> ("was" | "is") __ object {% ([, , is]) => ({ is }) %}
  | ("has" | "have") __ acquiredAbility {% ([, , haveAbility]) => ({ haveAbility }) %}
  | ("has" | "have") __ "base power and toughness" __ pt (__ "and" __ ("are" | "is") __ anyType "s":? __ "in addition to" __ itsPossessive __ "other types"):? {% ([, , , , basePowerToughness, andAre]) => andAre ? { basePowerToughness, additionalType: andAre[5] } : { basePowerToughness } %}
  | gains __ acquiredAbility {% ([, , gains]) => ({ gains }) %}
  | gets __ ptModification {% ([, , powerToughnessMod]) => ({ powerToughnessMod }) %}
  | "enter" "s":? (__ "the battlefield"):? __ "with" __ (englishNumber {% ([n]) => n %} | englishNumber __ "additional" {% ([additional]) => ({ additional }) %}) __ counterKind __ "counter" "s":? __ "on it" (__ forEachClause):? {% ([, , , , , , amount, , counterKind, , , , , , forEach]) => ({ entersWith: forEach ? { amount, counterKind, forEach: forEach[1] } : { amount, counterKind } }) %}
  | "enter" "s":? (__ "the battlefield"):? __ "with a number of" (__ "additional"):? __ counterKind __ "counters on it equal to" __ numberDefinition {% ([, , , , , additional, , counterKind, , , , amount]) => ({ entersWith: additional ? { counterKind, amount, additional: true } : { counterKind, amount } }) %}
  | "enter" "s":? __ "the battlefield" (__ "tapped"):? (__ "under" __ playersPossessive __ "control"):? (__ fromZone):? (__ "and with" __ (englishNumber {% ([n]) => n %} | englishNumber __ "additional" {% ([additional]) => ({ additional }) %}) __ counterKind __ "counter" "s":? __ "on it"):?  {% ([, , , , tapped, control, from, counters]) => {
    const result = { enter: "battlefield" }
    if (tapped) result.tapped = true;
    if (control) result.control = control[3];
    if (from) result.from = from[1];
    if (counters) result.with = { amount: counters[3], counterKind: counters[5] };
    return result;
  } %}
  | "enter" "s":? (__ "tapped"):? (__ "and it" __ ("wasn" "'" "t" | "was not") __ "cast"):? {% ([, , tapped, notCast]) => {
    const result = { enter: "battlefield" }
    if (tapped) result.tapped = true;
    if (notCast) result.condition = { not: "wasCast" };
    return result;
  } %}
  | "enter" "s":? __ "as" __ becomesWhat (__ "on the battlefield"):? {% ([, , , , , becomes]) => ({ enter: "battlefield", as: becomes }) %}
  | "leave" "s":? __ "the battlefield" {% () => ({ leaves: "battlefield" }) %}
  | "die" "s":? {% () => "die" %}
  | ("is" | "are" | "would be") __ "put" __ intoZone (__ fromZone):? {% ([, , , , enter, from]) => from ? { enter, from: from[1] } : { enter } %}
  | ("can't" | "don't" | "doesn't") __ cantClause {% ([, , cant]) => ({ cant }) %}
  | "deal" "s":? __ dealsWhat {% ([, , , deal]) => ({ deal }) %}
  | ("is" | "are") __ isWhat {% ([, , is]) => ({ is }) %}
  | "attack" "s":? (__ ("this" | "each") __ "combat if able"):? (__ "and" __ "isn't" __ "blocked"):? {% ([, , reference, isntBlocked]) => {
      const result = reference ? { mustAttack: reference[1][0] } : "attack";
      return isntBlocked ? { and: [result, { not: "blocked" }] } : result;
    } %}
  | "block" "s":? (__ "this" __ "combat if able"):? {% ([, , combat]) => combat ? { mustBlock: "this" } : "block" %}
  | gains __ acquiredAbility {% ([, , gains]) => ({ gains }) %}
  | "untap during" __ qualifiedPartOfTurn {% ([, , untap]) => ({ untap }) %}
  | "blocks" (__ "or becomes blocked by"):? __ object {% ([, becomesBlocked, , blocks]) => becomesBlocked ? { or: [{ blocks }, { blockedBy: blocks}] } : { blocks } %}
  | "is countered this way" {% () => ({ reference: "thisWay", does: "countered" }) %}
  | "is destroyed this way" {% () => ({ reference: "thisWay", does: "destroyed" }) %}
  | "is tapped for mana" {% () => ({ does: "tappedForMana" }) %}
  | "taps" __ object __ "for mana" {% ([, , what]) => ({ does: "tapsForMana", what }) %}
  | "counter" "s":? __ object {% ([, , , counters]) => ({ counters }) %}
  | "fights" __ object {% ([, , fights]) => ({ fights }) %}
  | "targets" __ object {% ([, , targets]) => ({ targets }) %}
  | "loses" __ acquiredAbility {% ([, , loses]) => ({ loses }) %}
  | "cost" "s":? __ ("up to" __):? manacost __  "less to cast" {% ([, , , , mana]) => ({ costReduction: { mana } }) %}
  | "can attack as though it didn\"t have defender" {% () => ({ ignores: "defender" }) %}
  | "can block an additional" __ object __ "each combat" {% ([, , blockAdditional]) => ({ blockAdditional }) %}
  | ("do" | "does") __ "so" {% () => "do" %}
  | "remain" "s":? __ "exiled" {% () => ({ remain: "exile" }) %}
  | "become" "s":? __ becomesWhat {% ([, , , become]) => ({ become }) %}
  | "lose" "s":? __ "all abilities" {% () => ({ loses: "allAbilities" }) %}
  | ("is" | "are") __ "created" {% () => "created" %}
  | "cause" "s":? __ player __ "to" __ playerVerbPhrase {% ([, , , actor, , , , does]) => ({ cause: { actor, does } }) %}
  | "become" "s":? __ "the target of" __ object {% ([, , , , , targetOf]) => ({ becomesTargetOf: targetOf }) %}
  | "was kicked" {% () => "kicked" %}
  | "was milled this way" {% () => ({ reference: "thisWay", does: "milled" }) %}
  | "was cast from a graveyard" {% () => ({ does: "cast", from: "graveyard" }) %}
  | "can't" __ "be countered" {% () => ({ cant: "countered" }) %}
  | ("the" __):? "damage" __ "can't" __ "be prevented" {% () => ({ cantPrevent: "damage" }) %}
  | "can't" __ "attack" __ duration {% ([, , , , cantAttack]) => ({ cantAttack }) %}
  | "can't" __ "be blocked" (__ "by" __ object):? (__ duration):? {% ([, , , by, duration]) => {
    const result = { cant: { blockedBy: by ? by[3] : "any" } };
    if (duration) result.duration = duration[1];
    return result;
  } %}
  | "cost" __ cost __ "more to" __ ("cast" | "activate") {% ([, , costIncrease, , , , [action]]) => ({ costIncrease, action }) %}
  | "as" __ object (__ "in addition to its other types"):? {% ([, , as, inAddition]) => inAddition ? { as, inAddition: true } : { as } %}
  | "assign its combat damage as though it" __ "weren't" __ "blocked" {% () => ({ damage: { as: { not: "blocked" } } }) %}
  | "remains tapped" {% () => ({ remains: "tapped" }) %}
objectInfinitive -> "be put" __ intoZone (__ fromZone):? (__ duration):? {% ([, , enter, from, duration]) => {
  const result = { enter };
  if (from) result.from = from[1];
  if (duration) result.duration = duration[1];
  return result;
} %}
  | "be created under your control" {% () => ({ reference: { actor: "you", does: "control" }, does: "create" }) %}
  | "fight" __ object {% ([, , fight]) => ({ fight }) %}
  | "deal" __ dealsWhat {% ([, , deal]) => ({ deal }) %}

isWhat -> color {% ([color]) => ({ color }) %}
  | object (__ "in addition to its other" (__ "colors"):? (__ "and"):? (__ "types"):?):? {% ([object, addition]) => addition ? { object, inAddition: true } : { object } %}
  | inZone {% ([inZone]) => ({ inZone }) %}
  | "still" __ object {% ([, , still]) => ({ still }) %}
  | "turned face up" {% () => "turnedFaceUp" %}
  | "attacking" {% () => "attacking" %}
  | "blocking" {% () => "blocking" %}
  | "attacking" __ "or" __ "blocking" {% () => ({ or: ["attacking", "blocking"] }) %}
  | condition {% ([condition]) => ({ condition }) %}
  | "enchanted" {% () => "enchanted" %}
becomesWhat -> "tapped" {% () => "tap" %}
  | "untapped" {% () => ({ not: "tap" }) %}
  | "unattached" (__ "from" __ object) {% ([, to]) => ({ not: to ? { does: "attached", to: to[3] } : { does : "attached" } }) %}
  | "a copy of" __ object ("," __ exceptClauseInCopyEffect):? {% ([, , copyOf, except]) => except ? { copyOf, except: except[2] } : { copyOf } %}
  | "a" "n":? (__ pt):? (__ color):? __ anyType (__ "with base power and toughness" __ pt):? (__ "with" __ acquiredAbility):? (__ "in addition to its other types"):? {% ([, , size, color, , type, size2, withClause, inAddition]) => {
    const result = { type };
    if (color) result.color = color[1];
    if (size) result.size = size[1];
    else if (size2) result.size = size2[3];
    if (withClause) result.with = withClause[3];
    if (inAddition) result.inAddition = true;
    return result;
  } %}
  | "a" "n":? __ pt __ anyType __ "with all creature types" {% ([, , , size, , type]) => ({ type, size, allCreatureTypes: true }) %}
  | "the basic land type" "s":? __ "of your choice" __ untilClause {% ([, , , , , until]) => ({ choose: "basicLandType", until }) %}
  | "blocked" (__ "by" __ object) {% ([, by]) => by ? { blockedBy: by[3] } : { blockedBy: "any" } %}
  | "colorless" {% () => ({ color: [] }) %}
  | "that type" {% () => ({ reference: "that", what: "type" }) %}
  | "renowned" {% () => "renowned" %}
exceptClauseInCopyEffect -> "except" __ copyException ("," __ ("and" __ ):? copyException):* {% ([, , e1, es]) => es.length > 0 ? { and: [e1, ...es.map(([, , , e2]) => e2)] } : e1 %}
copyException -> "its name is" __ CARD_NAME {% ([, , name]) => ({ name }) %}
  | "it's" __ isWhat {% ([, , is]) => ({ is }) %}
  | singleSentence {% ([s]) => s %}

itsPossessive -> object SAXON {% ([o]) => o %}
  | "its" {% () => ({ reference: "its" }) %}
  | "their" {% () => ({ reference: "their" }) %}
  | "your" {% () => ({ reference: "your" }) %}

acquiredAbility -> keyword {% ([k]) => k %}
  | "\"" ability "\"" {% ([, a]) => a %}
  | acquiredAbility __ "and" __ acquiredAbility {% ([a1, , , , a2]) => ({ and: [a1, a2] }) %}
  | "this ability" {% () => "thisAbility" %}
  | "flashback" {% () => "flashback" %}

gets -> "get" "s":?
controls -> "control" "s":?
# owns -> "own" "s":?  # temporarily removed — unused
gains -> "gain" "s":?

duration -> "this turn" {% () => ({ reference: "this", what: "turn" }) %}
  | "last turn" {% () => ({ reference: "last", what: "turn" }) %}
  | untilClause {% ([until]) => ({ until }) %}
untilClause -> "until" __ untilClauseInner {% ([, , u]) => u %}
untilClauseInner -> sentence {% ([s]) => s %}
  | "end of turn" {% () => "endOfTurn" %}
  | "your next turn" {% () => "yourNextTurn" %}

numericalCharacteristic -> "toughness" {% () => "toughness" %}
  | "power" {% () => "power" %}
  | "converted mana cost" {% () => "cmc" %}
  | "mana value" {% () => "cmc" %}
  | "life total" {% () => "lifeTotal" %}
  | "power and toughness" {% () => ({ and: ["power", "toughness"] }) %}

damagePreventionAmount -> "all" {% () => "all" %}
  | "the next" __ englishNumber {% ([, , next]) => next %}
damageNoun -> ("non":? "combat" __):? "damage" {% ([combat]) => ({ damage: combat ? (combat[0] ? { not: "combat" } : "combat") : "any" }) %}

tokenDescription -> englishNumber (__ pt):? (__ color):? __ permanentTypeSpecifier __ "token" "s":? (__ withClause):? (__ "named" __ [^.]:+):? (__ ("that's" | "that are") __ tokenState):? {% ([amount, size, color, , type, , , , withClause, name, state]) => {
  const result = { amount, type };
  if (size) result.size = size[1];
  if (color) result.color = color[1];
  if (withClause) result.with = withClause[1];
  if (name) result.name = name[3].join('');
  if (state) result.state = state[3];
  return result;
} %}
  | "a number of" (__ pt):? (__ color):? __ permanentTypeSpecifier __ "token" "s":? __ "equal to" __ numberDefinition (__ withClause):? (__ ("that's" | "that are") __ tokenState):? {% ([, size, color, , type, , , , , , , amount, withClause, state]) => {
  const result = { amount, type };
  if (size) result.size = size[1];
  if (color) result.color = color[1];
  if (withClause) result.with = withClause[1];
  if (state) result.state = state[3];
  return result;
} %}
  | englishNumber __ "token" "s":? __ "that" SAXON __ "a copy of" __ object {% ([amount, , , , , , , , , , copy]) => ({ amount, copy }) %}
  | connected[tokenDescription] {% ([c]) => c %}
tokenState -> "attacking" {% () => "attacking" %}
  | "blocking" (__ object):? {% ([, target]) => target ? { blocking: target[1] } : "blocking" %}
  | "tapped" (__ "and" __ tokenState):? {% ([, more]) => more ? { and: ["tapped", more[3]] } : "tapped" %}

color -> "white" {% () => "w" %}
  | "blue" {% () => "u" %}
  | "black" {% () => "b" %}
  | "red" {% () => "r" %}
  | "green" {% () => "g" %}
  | "colorless" {% () => "colorless" %}
  | "monocolored" {% () => "mono" %}
  | "multicolored" {% () => "multi" %}
  | connected[color] {% ([c]) => c %}

pt -> number "/" number {% ([power, , toughness]) => ({ power, toughness }) %}
ptModification -> PLUSMINUS number "/" PLUSMINUS number {% ([pmP, power, , pmT, toughness]) => ({ powerMod: '+' === pmP.toString() ? power : -power, toughnessMod: '+' === pmT.toString() ? toughness : -toughness }) %}
numberDefinition -> itsPossessive __ numericalCharacteristic {% ([whose, , characteristic]) => ({ whose, characteristic }) %}
  | "the" __ ("total" __):? "number of" __ object {% ([, , , , , count]) => ({ count }) %}
  | "the greatest number of" __ object {% ([, , count]) => ({ greatest: { count } }) %}
  | "the total" __ numericalCharacteristic __ "of" __ object {% ([, , total, , , , whose]) => ({ total, whose }) %}
  | "the greatest" __ numericalCharacteristic __ "among" __ anyEntity {% ([, , greatest, , , , among]) => ({ greatest, among }) %}
  | "life" {% () => "life" %}
  | englishNumber {% ([n]) => n %}
  | englishNumber __ (color __):? "mana" {% ([amount, , color]) => color ? { mana: { amount, color: color[0] } } : { mana: { amount } } %}
integerValue -> [0-9]:+ {% ([digits]) => parseInt(digits.join(''), 10) %}

withClause -> "with" __ withClauseInner {% ([, , withInner]) => ({ with: withInner }) %}
withClauseInner -> numericalCharacteristic __ numericalComparison {% ([value, , comparison]) => ({ value, comparison }) %}
  | "the highest" __ numericalCharacteristic __ "among" __ object {% ([, , highest, , , , among]) => ({ highest, among }) %}
  | "converted mana costs" __ numericalNumber __ "and" __ numericalNumber {% ([, , cmc, and]) => and ? { and: [{ cmc }, { cmc: and[3] }] } : { cmc } %}
  | counterKind __ "counter" "s":? __ "on" __ ("it" | "them") {% ([counterKind]) => ({ counterKind }) %}
  | "that name" {% () => ({ reference: "that", what: "name" }) %}
  | "the chosen name" {% () => ({ reference: "chosen", what: "name" }) %}
  | "the same name as" __ object {% ([, , sameNameAs]) => ({ sameNameAs }) %}
  | "lesser" __ numericalCharacteristic {% ([, , lesser]) => ({ lesser }) %}
  | acquiredAbility {% ([ability]) => ({ ability }) %}
  | object {% ([object]) => ({ object }) %}

dealsWhat -> damageNoun __ "to" __ damageRecipient {% ([damage, , , , to]) => ({ ...damage, to }) %}
 | numberDefinition __ "damage to" __ damageRecipient __ "and" __ numberDefinition __ "damage to" __ damageRecipient {% ([amount1, , , , to1, , , , amount2, , , , to2]) => ({ and: [{ amount: amount1, damageTo: to1 }, { amount: amount2, damageTo: to2 }] }) %}
 | numberDefinition __ "damage to" __ damageRecipient {% ([amount, , , , damageTo]) => ({ amount, damageTo }) %}
 | numberDefinition __ "damage" __ "instead" {% ([amount]) => ({ amount, instead: true }) %}
 | "damage equal to" __ numberDefinition __ "to" __ damageRecipient {% ([, , amount, , , , damageTo]) => ({ amount, damageTo }) %}
 | "damage to" __ damageRecipient __ "equal to" __ numberDefinition {% ([, , damageTo, , , , amount]) => ({ amount, damageTo }) %}
 | numberDefinition __ "damage" __ divideAmongDamageTargets {% ([amount, , , , divideAmong]) => ({ amount, divideAmong }) %}
 | "damage equal to" __ numberDefinition __  divideAmongDamageTargets {% ([, , amount, , divideAmong]) => ({ amount, divideAmong }) %}

damageRecipient -> anyEntity {% ([o]) => o %}
  | damageRecipient __ "or" __ damageRecipient {% ([r1, , , , r2], ref, reject) => {
    const isPlayer = (x) => typeof x === 'string' || (x && (x.player || x.each));
    if (!isPlayer(r1) && !isPlayer(r2)) return reject;
    return { xor: [r1, r2] };
  } %}
  | "itself" {% () => "self" %}
divideAmongDamageTargets -> "divided as you choose among" __ divideTargets {% ([, , divideTargets]) => divideTargets %}
divideTargets -> "one, two, or three targets" {% () => ({ targetCount: [1, 2, 3] }) %}
  | "any number of" __ object {% ([, , target]) => ({ targetCount: "any", target }) %}
  | "one or two targets" {% () => ({ targetCount: [1, 2] }) %}

englishNumber -> "a" {% () => 1 %}
  | "an" {% () => 1 %}
  | "a single" {% () => 1 %}
  | "one" {% () => 1 %}
  | "two" {% () => 2 %}
  | "twice" {% () => 2 %}
  | "three" {% () => 3 %}
  | "four" {% () => 4 %}
  | "five" {% () => 5 %}
  | "six" {% () => 6 %}
  | "seven" {% () => 7 %}
  | "eight" {% () => 8 %}
  | "nine" {% () => 9 %}
  | "ten" {% () => 10 %}
  | "that" __ ("many" | "much") {% () => ({ reference: "that", what: "amount" }) %}
  | number {% ([n]) => n %}
numericalNumber -> number {% ([n]) => n %}
  | "that much" {% () => ({ reference: "that", what: "amount" }) %}
number -> (integerValue
  | "x"
  | "y"
  | "z") {% ([[n]]) => n %}
numericalComparison -> numberDefinition __ "or greater" {% ([gte]) => ({ gte }) %}
  | numberDefinition __ "or less" {% ([lte]) => ({ lte }) %}
  | "less than or equal to" __ numberDefinition {% ([, , lte]) => ({ lte }) %}
  | "greater than" __ numberDefinition {% ([, , gt]) => ({ gt }) %}
  | "at least" __ numberDefinition {% ([, , gte]) => ({ gte }) %}
  | "more than" __ numberDefinition {% ([, , gt]) => ({ gt }) %}
  | numberDefinition __ "or more" {% ([gte]) => ({ gte }) %}
  | numberDefinition {% ([n]) => n %}
countableCount -> "exactly" __ englishNumber {% ([, , eq]) => ({ eq }) %}
  | englishNumber __ "or more" {% ([atLeast]) => ({ atLeast }) %}
  | "fewer than" __ englishNumber {% ([, , lessThan]) => ({ lessThan }) %}
  | englishNumber __ "or fewer" {% ([atMost]) => ({ atMost }) %}
  | "any number of" {% () => "anyNumber" %}
  | "one of" {% () => 1 %}
  | "up to" __ englishNumber {% ([, , upTo]) => ({ upTo }) %}
  | englishNumber {% ([n]) => n %}
  | "all" {% () => "all" %}
  | "both" {% () => "both" %}

cantClause -> cantClauseInner (__ "unless" __ condition):? {% ([cant, unless]) => unless ? { cant, unless: unless[3] } : cant %}
cantClauseInner -> "attack" {% () => "attack" %}
  | "block" (__ object):? {% ([, block]) => block ? { block } : "block" %}
  | "attack or block" {% () => ({ xor: ["attack", "block"] }) %}
  | "attack or block alone" {% () => ({ xor: [{ does: "attack", suffix: "alone" }, { does: "block", suffix: "alone" }] }) %}
  | "attack alone" {% () => ({ does: "attack", suffix: "alone" }) %}
  | "block alone" {% () => ({ does: "block", suffix: "alone" }) %}
  | "be blocked" {% () => "blocked" %}
  | "be countered" {% () => "countered" %}
  | "be blocked by more than" __ englishNumber __ "creature" "s":? {% ([, , gt]) => ({ blockedBy: { gt } }) %}
  | "be enchanted" (__ "by" __ object):? {% ([, by]) => by ? { what: by[3], does: "enchant" } : "enchanted" %}
  | objectVerbPhrase {% ([does]) => does %}
  | "be regenerated" {% () => "regenerate" %}
  | "cause abilities to trigger" {% () => "causeAbilitiesToTrigger" %}
  | "draw more than" __ englishNumber __ "card" "s":? (__ "each" __ "turn"):? {% ([, , max, , , , duration]) => ({ draw: { max }, duration: duration ? { reference: "each", what: "turn" } : null }) %}

zone -> (playersPossessive | "a" (__ "single"):?) __ ownedZone {% ([[owner], , zone]) => ({ owner, zone }) %}
  | "exile" {% () => "exile" %}
  | "the battlefield" {% () => "battlefield" %}
  | "anywhere" {% () => "anywhere" %}
  | ownedZone {% ([zone]) => ({ zone }) %}
  | connected[zone] {% ([c]) => c %}
ownedZone -> "graveyard" {% () => "graveyard" %}
  | "library" {% () => "library" %}
  | "libraries" {% () => "library" %}
  | "hand" {% () => "hand" %}
  | ownedZone "s" {% ([z]) => z %}
intoZone -> "onto the battlefield" {% () => "battlefield" %}
  | "into" __ zone __ "second from the top" {% ([, , zone]) => ({ secondFromTop: zone }) %}
  | "into" __ zone {% ([, , into]) => into %}
  | "on top of" __ playersPossessive __ "library" (__ "in" __ ("any" {% () => "any" %} | "a random" {% () => "random" %}) __ "order"):? {% ([, , whose, , , order]) => order ? { topOf: { what: "library", whose }, order: order[3] } : { topOf: { what: "library", whose } } %}
  | "on top" {% () => ({ topOf: { what: "library" } }) %}
  | "on the bottom of" __ zone (__ "in" __  ("any" {% () => "any" %} | "a random" {% () => "random" %}) __ "order"):? {% ([, , bottom, order]) => order ? { bottom, order: order[3] } : { bottom } %}
inZone -> "on the battlefield" {% () => ({ in: "battlefield" }) %}
  | "in" __ zone {% ([, , inZone]) => ({ in: inZone }) %}
fromZone -> "from" __ zone {% ([, , z]) => z %}

permanentTypeSpecifier -> permanentTypeSpecifierInner (__ permanentTypeSpecifierInner):* {% ([t1, ts]) => ({ and: [t1, ...ts.map(([, t]) => t)] }) %}
anyType -> anyTypeInner (__ anyTypeInner):* {% ([t1, ts]) => ({ and: [t1, ...ts.map(([, t]) => t)] }) %}
  | anyTypeInner __ "or" __ anyTypeInner {% ([t1, , , , t2]) => ({ or: [t1, t2] }) %}
  | anyTypeInner __ ("and/or" {% () => "or" %} | "and" {% () => "and" %}) __ anyTypeInner {% ([t1, , connector, , t2]) => ({ [connector]: [t1, t2] }) %}
  | anyTypeInner ("," __ anyTypeInner):+ ",":? __ "or" __ anyTypeInner {% ([t1, ts, , , , , tLast]) => ({ or: [t1, ...ts.map(([, , t]) => t), tLast] }) %}
anyTypeInner -> permanentTypeInner {% ([t]) => t %}
  | spellType {% ([t]) => t %}
  | superType {% ([t]) => t %}
  | subType {% ([t]) => t %}

asThoughClause -> "as though" __ player __ ("had" | "have" | "were") __ acquiredAbility {% ([, , who, , , , had]) => ({ who, had }) %}

asLongAsClause -> "as long as" __ condition {% ([, , c]) => c %}

whileClause -> "while" __ condition {% ([, , c]) => c %}

exceptClause -> "except the first one" __ player __ "draw in each of" __ playersPossessive __ partOfTurn "s":? {% ([, , who, , , , whose, , step]) => ({ who, does: "draw", during: { each: { whose, step } } }) %}


costs -> cost ("," __ cost):* {% ([c, cs]) => cs.length > 0 ? { and: [c, ...cs.map(([, , c2]) => c2)] } : c %}
cost -> "{t}" {% () => "tap" %}
  | sentence {% ([s]) => s %}
  | manacost {% ([mana]) => ({ mana }) %}
  | loyaltyCost {% ([loyalty]) => ({ loyalty }) %}
loyaltyCost -> PLUSMINUS integerValue {% ([pm, int]) => '+' === pm.toString() ? int : -int %}
manacost -> manaSymbol:+ {% ([mg]) => mg %}
  | object SAXON __ "mana cost" (__ "reduced by" __ manacost):? {% ([costOf, , , , reduced]) => reduced ? { costOf, reducedBy: reduced[3] } : { costOf } %}
  | itsPossessive __ "mana cost" (__ "reduced by" __ manacost):? {% ([costOf, , , reduced]) => reduced ? { costOf, reducedBy: reduced[3] } : { costOf } %}
manaSymbols -> manaSymbol:+ {% ([s]) => s %}
manaSymbol -> "{" manaLetter ("/" manaLetter):? "}" {% ([, c, c2]) => c2 ? { hybrid: [c, c2[1]] } : c %}
manaLetter -> (integerValue
  | "x"
  | "y"
  | "z"
  | "w"
  | "u"
  | "b"
  | "r"
  | "g"
  | "c"
  | "p"
  | "s") {% ([[s]]) => s %}

qualifiedPartOfTurn -> turnQualification __ partOfTurn "s":? {% ([qualification, , partOfTurn]) => ({ qualification, partOfTurn }) %}
  | "the beginning of" __ turnQualification __ partOfTurn "s":? {% ([, , qualification, , partOfTurn]) => ({ beginningOf: { qualification, partOfTurn } }) %}
  | "combat on your turn" {% () => ({ qualification: "yourTurn", partOfTurn: "combat" }) %}
  | "combat" {% () => ({ partOfTurn: "combat" }) %}
  | "end of combat" {% () => ({ partOfTurn: "endCombat" }) %}
turnQualification -> (playersPossessive | "the") (__ "next"):? {% ([[whose], next]) => next ? { next: { whose } } : { whose } %}
  | "this" {% () => "this" %}
  | "each" {% () => "each" %}
  | "this turn" SAXON {% () => ({ reference: "this", what: "turn" }) %}
  | "that turn" SAXON {% () => ({ reference: "that", what: "turn" }) %}
  | "the next turn" SAXON {% () => ({ reference: "next", what: "turn" }) %}

playersPossessive -> "your" {% () => "your" %}
  | "their" {% () => "their" %}
  | player (SAXON | "'") {% ([player]) => player %}
