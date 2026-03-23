mkdir -p src/generated;
nearleyc nearley/magicCard.ne -o src/generated/magicCardGrammar.cjs;
nearleyc nearley/typeLine.ne -o src/generated/typeLineGrammar.cjs;
