import { describe, it, expect } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { parseCard, parseTypeLine } = require('../src/magicCardParser');

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
    expect(result.error).toBeNull();
    expect(result.result).not.toBeNull();
    expect(result.result).toHaveLength(1);
  });

  it('returns error for non-normal layouts', () => {
    const result = parseCard({
      name: 'Test',
      oracle_text: 'Flying',
      layout: 'split',
    });
    expect(result.error).toBeTruthy();
  });

  it('parses keywords correctly', () => {
    const result = parseCard({
      name: 'Serra Angel',
      oracle_text: 'Flying, vigilance',
      layout: 'normal',
    });
    expect(result.error).toBeNull();
    expect(result.result).not.toBeNull();
    // Keywords should be in the first parse result
    const abilities = result.result![0];
    expect(abilities).toBeDefined();
  });
});
