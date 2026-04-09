// Parse the structured JSON block out of an LLM response.
//
// Contract with the prompt: the evaluation modes end their system message
// with an instruction to emit a single ```json ... ``` code fence containing
// the EvaluationResult shape. We extract the LAST such block (ignoring any
// earlier blocks used as inline examples), parse it, and hand it off to
// zod for validation.

import { zEvaluationResult } from '../../shared/schemas';
import type { EvaluationResult } from '../../shared/types';

export interface ParseError {
  ok: false;
  error: string;
  raw: string;
}

export interface ParseSuccess {
  ok: true;
  value: EvaluationResult;
}

export type ParseResult = ParseSuccess | ParseError;

const JSON_FENCE_RE = /```(?:json)?\s*([\s\S]*?)```/g;

export function extractLastJsonBlock(text: string): string | null {
  const matches = [...text.matchAll(JSON_FENCE_RE)].map((m) => m[1]?.trim() ?? '');
  if (matches.length > 0) return matches[matches.length - 1] ?? null;
  // Fallback: last balanced-brace object in the string.
  const last = findLastJsonObject(text);
  return last;
}

function findLastJsonObject(text: string): string | null {
  let depth = 0;
  let end = -1;
  for (let i = text.length - 1; i >= 0; i -= 1) {
    const ch = text[i];
    if (ch === '}') {
      if (depth === 0) end = i;
      depth += 1;
    } else if (ch === '{') {
      depth -= 1;
      if (depth === 0 && end !== -1) {
        return text.slice(i, end + 1);
      }
    }
  }
  return null;
}

export function parseEvaluationResult(rawText: string): ParseResult {
  const block = extractLastJsonBlock(rawText);
  if (!block) {
    return { ok: false, error: 'no JSON block found in response', raw: rawText };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(block);
  } catch (err) {
    return {
      ok: false,
      error: `JSON.parse failed: ${(err as Error).message}`,
      raw: block,
    };
  }
  const validated = zEvaluationResult.safeParse(parsed);
  if (!validated.success) {
    return {
      ok: false,
      error: `schema mismatch: ${validated.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')}`,
      raw: block,
    };
  }
  return { ok: true, value: validated.data as EvaluationResult };
}
