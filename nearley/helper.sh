mkdir -p src/generated;
nearleyc nearley/magicCard.ne -o src/generated/magicCardGrammar.cjs;
nearleyc nearley/typeLine.ne -o src/generated/typeLineGrammar.cjs;
# Prepend @ts-nocheck to generated files so TypeScript ignores them
sed -i '1s/^/\/\/ @ts-nocheck\n/' src/generated/magicCardGrammar.cjs;
sed -i '1s/^/\/\/ @ts-nocheck\n/' src/generated/typeLineGrammar.cjs;
