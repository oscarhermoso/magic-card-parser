@{%
const CREATURE_TYPES = new Set(["advisor","aetherborn","ally","angel","antelope","ape","archer","archon","army","artificer","assassin","atog","aurochs","avatar","azra","badger","barbarian","basilisk","bat","bear","beast","beeble","berserker","bird","blinkmoth","boar","bringer","brushwagg","camarid","camel","caribou","carrier","cat","centaur","cephalid","chicken","chimera","citizen","cleric","cockatrice","construct","coward","crab","crocodile","cyclops","dauthi","demigod","demon","deserter","devil","dinosaur","djinn","dog","dragon","drake","dreadnought","drone","druid","dryad","dwarf","efreet","egg","elder","eldrazi","elemental","elephant","elf","elk","eye","faerie","ferret","fish","flagbearer","fox","frog","fungus","gargoyle","germ","giant","gnome","goat","goblin","god","golem","gorgon","graveborn","gremlin","griffin","hag","harpy","hellion","hippo","hippogriff","homarid","homunculus","horror","horse","human","hydra","hyena","illusion","imp","incarnation","insect","jackal","jellyfish","juggernaut","kavu","kirin","kithkin","knight","kobold","kor","kraken","lamia","lammasu","leech","leviathan","lhurgoyf","licid","lizard","manticore","masticore","mercenary","merfolk","metathran","minion","minotaur","mole","monger","mongoose","monk","monkey","moonfolk","mouse","mutant","myr","mystic","naga","nautilus","nephilim","nightmare","nightstalker","ninja","noble","noggle","nomad","nymph","octopus","ogre","ooze","orb","orc","orgg","otter","ouphe","ox","oyster","pangolin","peasant","pegasus","pentavite","pest","phelddagrif","phyrexian","phoenix","pilot","pincher","pirate","plant","praetor","prism","processor","rabbit","rat","rebel","reflection","rhino","rigger","rogue","sable","salamander","samurai","sand","saproling","satyr","scarecrow","scion","scorpion","scout","sculpture","serf","serpent","servo","shade","shaman","shapeshifter","shark","sheep","siren","skeleton","slith","sliver","slug","snake","soldier","soltari","spawn","specter","spellshaper","sphinx","spider","spike","spirit","splinter","sponge","squid","squirrel","starfish","surrakar","survivor","tentacle","tetravite","thalakos","thopter","thrull","treefolk","trilobite","triskelavite","troll","turtle","unicorn","vampire","vedalken","viashino","volver","wall","warlock","warrior","weird","werewolf","whale","wizard","wolf","wolverine","wombat","worm","wraith","wurm","yeti","zombie","zubera"]);
const PLANESWALKER_TYPES = new Set(["ajani","aminatou","angrath","arlinn","ashiok","bolas","calix","chandra","dack","daretti","davriel","domri","dovin","elspeth","estrid","freyalise","garruk","gideon","huatli","jace","jaya","karn","kasmina","kaya","kiora","koth","liliana","lukka","nahiri","narset","nissa","nixilis","oko","ral","rowan","saheeli","samut","sarkhan","serra","sorin","tamiyo","teferi","teyo","tezzeret","tibalt","ugin","venser","vivien","vraska","will","windgrace","wrenn","xenagos","yanggu","yanling"]);
const COUNTER_KINDS = new Set(["acorn","age","aim","arrow","arrowhead","awakening","blaze","blood","bounty","bribery","brick","cage","carrion","charge","coin","credit","corpse","crystal","cube","currency","death","deathtouch","delay","depletion","despair","devotion","divinity","doom","dream","echo","egg","elixir","energy","eon","experience","eyeball","eyestalk","fade","fate","feather","fetch","filibuster","flood","flying","fungus","fuse","gem","glyph","gold","growth","hatchling","healing","hexproof","hit","hoofprint","hour","ice","indestructible","infection","intervention","isolation","javelin","ki","knowledge","level","lifelink","lore","loyalty","luck","magnet","manabond","manifestation","mannequin","mask","matrix","menace","mine","mining","mire","music","muster","net","omen","ore","page","pain","paralyzation","petal","petrification","phylactery","pin","plague","poison","polyp","pressure","prey","pupa","quest","reach","rust","scream","shell","shield","silver","shred","sleep","sleight","slime","slumber","soot","soul","spark","spore","storage","strife","study","task","theft","tide","time","tower","training","trample","trap","treasure","velocity","verse","vigilance","vitality","volatile","wage","winch","wind","wish"]);
const ABILITY_WORDS = new Set(["adamant","addendum","battalion","bloodrush","channel","chroma","cohort","constellation","converge","delirium","domain","eminence","enrage","exhaust","ferocious","formidable","grandeur","hellbent","heroic","imprint","inspired","kinship","landfall","lieutenant","metalcraft","morbid","parley","radiance","raid","rally","revolt","strive","sweep","temptingoffer","threshold","undergrowth"]);
const SIMPLE_KEYWORDS = new Set(["deathtouch","defender","flash","flying","haste","hexproof","indestructible","intimidate","lifelink","reach","shroud","trample","vigilance","flanking","phasing","shadow","horsemanship","fear","provoke","storm","sunburst","epic","convoke","haunt","delve","gravestorm","changeling","hideaway","conspire","persist","wither","retrace","exalted","cascade","rebound","infect","undying","soulbond","unleash","cipher","evolve","extort","fuse","dethrone","prowess","exploit","menace","devoid","ingest","myriad","skulk","melee","undaunted","improvise","aftermath","ascend","assist","mentor","riot","partner"]);
const COST_KEYWORDS = new Set(["equip","escape","spectacle","eternalize","embalm","escalate","emerge","surge","awaken","dash","outlast","mutate","bestow","scavenge","overload","buyback","echo","flashback","madness","morph","entwine","ninjutsu","transmute","replicate","recover","fortify","evoke","unearth","miracle","megamorph","prowl","transfigure","multikicker"]);
const NUMBER_KEYWORDS = new Set(["afterlife","afflict","fabricate","crew","renown","tribute","rampage","fading","amplify","modular","bushido","dredge","graft","ripple","vanishing","absorb","poisonous","devour","annihilator","frenzy","soulshift"]);
%}

_ -> " ":?
__ -> " "
counterKind -> ptModification {% ([c]) => c %}
  | "double strike" {% () => "double strike" %}
  | "first strike" {% () => "first strike" %}
  | [a-z]:+ {% (data, ref, reject) => { const w = data[0].join(''); return COUNTER_KINDS.has(w) ? w : reject; } %}
superType -> ("basic"
  | "legendary"
  | "snow"
  | "ongoing"
  | "world") {% ([[t]]) => t %}
subType -> (creatureType
  | artifactType
  | spellSubType
  | enchantmentType
  | planeswalkerType
  | landType) {% ([[t]]) => t %}
permanentTypeInner -> "artifact" {% () => "artifact" %}
  | "creature" {% () => "creature" %}
  | "enchantment" {% () => "enchantment" %}
  | "land" {% () => "land" %}
  | "planeswalker" {% () => "planeswalker" %}
  | "basic" {% () => "basic" %}
  | "permanent" {% () => "permanent" %}
spellType -> "instant" {% () => "instant" %}
  | "sorcery" {% () => "sorcery" %}
permanentTypeSpecifierInner -> (permanentTypeInner
  | creatureType
  | artifactType
  | enchantmentType
  | planeswalkerType
  | landType) {% ([[t]]) => t %}
creatureType -> "assembly-worker" {% () => "assembly-worker" %}
  | [a-z]:+ {% (data, ref, reject) => { const w = data[0].join(''); return CREATURE_TYPES.has(w) ? w : reject; } %}
planeswalkerType -> [a-z]:+ {% (data, ref, reject) => { const w = data[0].join(''); return PLANESWALKER_TYPES.has(w) ? w : reject; } %}
landType -> (basicLandType
  | "desert"
  | "gate"
  | "lair"
  | "locus"
  | "mine"
  | "power-plant"
  | "tower"
  | "urza" "'" "s") {% ([[t]]) => t %}
basicLandType -> ("plains"
  | "island"
  | "swamp"
  | "mountain"
  | "forest") {% ([[t]]) => t %}
enchantmentType -> ("aura"
  | "cartouche"
  | "curse"
  | "saga"
  | "shrine") {% ([[t]]) => t %}
artifactType -> ("clue"
  | "contraption"
  | "equipment"
  | "food"
  | "fortification"
  | "gold"
  | "treasure"
  | "vehicle") {% ([[t]]) => t %}
spellSubType -> ("adventure"
  | "trap"
  | "arcane") {% ([[t]]) => t %}
type -> (permanentTypeInner
  | spellType
  | "tribal"
  | "conspiracy"
  | "plane"
  | "phenomena"
  | "emblem") {% ([[t]]) => t %}

abilityWord -> "council's dilemma" {% () => "council's dilemma" %}
  | "fateful hour" {% () => "fateful hour" %}
  | "join forces" {% () => "join forces" %}
  | "spell mastery" {% () => "spell mastery" %}
  | "will of the council" {% () => "will of the council" %}
  | [a-z]:+ {% (data, ref, reject) => { const w = data[0].join(''); return ABILITY_WORDS.has(w) ? w : reject; } %}

CARD_NAME -> "~" {% () => "CARD_NAME" %}
DASHDASH -> "-" | "--"
PLUSMINUS -> "+" | "-"
SAXON -> "'" "s"

partOfTurn -> "turn" {% () => "turn" %}
  | "untap step" {% () => "untap" %}
  | "upkeep" {% () => "upkeep" %}
  | "draw step" {% () => "drawStep" %}
  | "precombat main phase" {% () => "precombatMain" %}
  | "main phase" {% () => "main" %}
  | "combat" {% () => "combat" %}
  | "declare attackers" {% () => "declareAttackers" %}
  | "declare blockers" {% () => "declareBlockers" %}
  | "combat damage step" {% () => "combatDamage" %}
  | "end of combat" {% () => "endCombat" %}
  | "postcombat main phase" {% () => "postcombatMain" %}
  | "end step" {% () => "end" %}
