mkdir -p src/generated;
# Use node to compile grammars directly (avoids nearleyc 64KB stream-chunk bug — pa-ylu)
node nearley/compile.cjs nearley/magicCard.ne src/generated/magicCardGrammar.cjs;
node nearley/compile.cjs nearley/typeLine.ne src/generated/typeLineGrammar.cjs;
