import { describe, expect, it } from 'vitest';
import { parseEvaluationResult, extractLastJsonBlock } from '../../src/background/llm/parse';

describe('parseEvaluationResult', () => {
  it('extracts JSON from a fenced code block', () => {
    const block = extractLastJsonBlock(
      'Some preamble text\n```json\n{"archetype":"builder"}\n```\nSome trailing text',
    );
    expect(block).toBe('{"archetype":"builder"}');
  });

  it('returns error for text with no JSON', () => {
    const result = parseEvaluationResult(
      'This is just plain text with no JSON blocks at all.',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('no JSON block found');
    }
  });

  it('extracts the last JSON block when multiple exist', () => {
    const text = [
      'Example: ```json\n{"first": true}\n```',
      'Now the real result:',
      '```json\n{"archetype":"operator"}\n```',
    ].join('\n');
    const block = extractLastJsonBlock(text);
    expect(block).toBe('{"archetype":"operator"}');
  });
});
