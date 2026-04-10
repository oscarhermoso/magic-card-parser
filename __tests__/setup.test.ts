import { describe, it, expect } from 'vitest';
import { parseCard, parseTypeLine } from '../src/magicCardParser.js';

describe('magic-card-parser setup', () => {
  it('exports parseCard function', () => {
    expect(typeof parseCard).toBe('function');
  });

  it('exports parseTypeLine function', () => {
    expect(typeof parseTypeLine).toBe('function');
  });

  it('parses a simple card successfully', () => {
    const result = parseCard({
      name: 'Birds of Paradise',
      oracle_text: 'Flying\n{T}: Add one mana of any color.',
      layout: 'normal',
    });
    expect(result.error).toBeUndefined();
    expect(result.abilities).not.toBeNull();
  });

  it('parses non-normal layout oracle text without layout-based rejection', () => {
    // Layout field no longer blocks parsing — parseCard attempts to parse oracle_text
    // regardless of layout. Use parseFaces() for multi-face card routing.
    const result = parseCard({
      name: 'Test',
      oracle_text: 'Flying',
      layout: 'split',
    });
    // 'Flying' is valid oracle text regardless of layout — should parse successfully
    expect(result.error).toBeUndefined();
    expect(result.abilities).not.toBeNull();
  });

  it('parses keywords correctly', () => {
    const result = parseCard({
      name: 'Serra Angel',
      oracle_text: 'Flying, vigilance',
      layout: 'normal',
    });
    expect(result.error).toBeUndefined();
    expect(result.abilities).not.toBeNull();
    // Keywords should be in the best parse result
    const abilities = result.abilities!;
    expect(abilities).toBeDefined();
  });
});
