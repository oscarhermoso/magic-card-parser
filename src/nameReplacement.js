/** @typedef {import('./index.d.ts').CardInput} CardInput */

/**
 * Common MTG words that should NOT be treated as name abbreviations.
 * These appear as first words of card names but are too generic to replace.
 */
const BLOCKED_FIRST_WORDS = /^(goblin|dragon|angel|demon|human|zombie|soldier|knight|wizard|elf|beast|spirit|vampire|bear|cat|dog|bird|snake|spider|wolf|giant|troll|ogre|orc|golem|elemental|artifact|creature|land|enchant|instant|sorcery|planeswalker|legendary|token|tribal|snow|basic|world|forest|island|swamp|mountain|plains)$/i;

/**
 * Self-reference patterns: "this <type>" → ~
 */
const SELF_REFERENCE_RE = /\bthis (creature|artifact|land|enchantment|permanent|card|aura)\b/g;

/**
 * Replace card name references in oracle text with ~.
 *
 * Handles:
 * 1. Full name → ~
 * 2. Comma-shortened → ~ (e.g. "Kozilek, Butcher of Truth" → "Kozilek")
 * 3. Title-shortened → ~ (e.g. "Loran of the Third Path" → "Loran")
 * 4. "this creature/artifact/land/enchantment/permanent/card/aura" → ~
 * 5. Lowercases the result
 *
 * @param {string} oracleText - The card's oracle text
 * @param {string} name - The card's name
 * @returns {string} Normalized oracle text with ~ substitutions
 */
export function replaceCardName(oracleText, name) {
    const shortenedName = name.split(',')[0];

    // Replace full name and comma-shortened name
    let result = oracleText.split(name).join('~').split(shortenedName).join('~');

    // Replace first-word references (title shortening)
    // e.g. "Loran" from "Loran of the Third Path", "Hazoret" from "Hazoret the Fervent"
    const firstName = shortenedName.split(' ')[0];
    if (
        firstName.length > 3 &&
        firstName !== shortenedName &&
        !BLOCKED_FIRST_WORDS.test(firstName)
    ) {
        result = result.split(firstName).join('~');
    }

    // Lowercase
    result = result.toLowerCase();

    // Replace self-references
    result = result.replace(SELF_REFERENCE_RE, '~');

    // Normalize Unicode to ASCII equivalents
    result = result
        .replace(/\u2019/g, "'")   // right single quote → apostrophe
        .replace(/\u2014/g, "--")  // em dash → double hyphen
        .replace(/\u2212/g, "-")   // minus sign → hyphen-minus
        .replace(/[\u201c\u201d]/g, '"')  // smart double quotes → straight quotes
        .replace(/\bsimultaneously /g, '');  // remove adverb (no grammatical effect)

    return result;
}
