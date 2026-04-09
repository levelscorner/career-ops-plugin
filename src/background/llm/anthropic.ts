// Raw-fetch Anthropic Messages API client for the MV3 service worker.
//
// Why not @anthropic-ai/sdk? The official SDK reaches for Node APIs that
// aren't available in a service worker and pulls in ~200kb of shims.
// fetch() + manual SSE parsing is ~100 lines, zero dependencies, and
// gives us exactly the hooks we need for streaming tokens into the UI.
//
// Docs: https://docs.anthropic.com/en/api/messages

import type { ModelId } from '../../shared/constants';

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

// ---- types -------------------------------------------------------------

export type Role = 'user' | 'assistant';

export interface TextBlock {
  type: 'text';
  text: string;
}

export interface Message {
  role: Role;
  content: string | TextBlock[];
}

export interface MessageRequest {
  model: ModelId;
  system?: string;
  messages: Message[];
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
  metadata?: Record<string, string>;
}

export interface StreamEvent {
  type:
    | 'message_start'
    | 'content_block_start'
    | 'content_block_delta'
    | 'content_block_stop'
    | 'message_delta'
    | 'message_stop'
    | 'ping'
    | 'error';
  [k: string]: unknown;
}

export interface FinalMessage {
  text: string;
  stopReason: string | null;
  inputTokens: number;
  outputTokens: number;
}

export class AnthropicApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string | null,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'AnthropicApiError';
  }
}

// ---- client ------------------------------------------------------------

export interface AnthropicClientOptions {
  apiKey: string;
  defaultMaxTokens?: number;
  defaultTemperature?: number;
  fetchImpl?: typeof fetch;
}

export class AnthropicClient {
  readonly #apiKey: string;
  readonly #defaultMaxTokens: number;
  readonly #defaultTemperature: number;
  readonly #fetch: typeof fetch;

  constructor(options: AnthropicClientOptions) {
    if (!options.apiKey) throw new Error('AnthropicClient: apiKey is required');
    this.#apiKey = options.apiKey;
    this.#defaultMaxTokens = options.defaultMaxTokens ?? 4096;
    this.#defaultTemperature = options.defaultTemperature ?? 0.3;
    this.#fetch = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  /**
   * Stream a message. Yields SSE events as they arrive. The caller is
   * responsible for accumulating text_delta events into a final string.
   * Use {@link streamText} for the common "give me the final string + text
   * deltas" case.
   */
  async *stream(request: MessageRequest, signal?: AbortSignal): AsyncIterable<StreamEvent> {
    const body = JSON.stringify({
      model: request.model,
      system: request.system,
      messages: request.messages,
      max_tokens: request.maxTokens ?? this.#defaultMaxTokens,
      temperature: request.temperature ?? this.#defaultTemperature,
      stop_sequences: request.stopSequences,
      metadata: request.metadata,
      stream: true,
    });

    const init: RequestInit = {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'text/event-stream',
        'anthropic-version': API_VERSION,
        'x-api-key': this.#apiKey,
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body,
    };
    if (signal) init.signal = signal;
    const response = await this.#fetch(API_URL, init);

    if (!response.ok || !response.body) {
      await this.#throwApiError(response);
    }

    yield* parseSSEStream(response.body!);
  }

  /**
   * Convenience wrapper over stream(). Calls onDelta for every text chunk
   * and resolves to the full final message when the stream ends.
   */
  async streamText(
    request: MessageRequest,
    onDelta: (delta: string) => void,
    signal?: AbortSignal,
  ): Promise<FinalMessage> {
    let text = '';
    let stopReason: string | null = null;
    let inputTokens = 0;
    let outputTokens = 0;
    for await (const event of this.stream(request, signal)) {
      if (event.type === 'content_block_delta') {
        const delta = (event as { delta?: { type: string; text?: string } }).delta;
        if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
          text += delta.text;
          onDelta(delta.text);
        }
      } else if (event.type === 'message_delta') {
        const d = event as {
          delta?: { stop_reason?: string };
          usage?: { output_tokens?: number };
        };
        if (d.delta?.stop_reason) stopReason = d.delta.stop_reason;
        if (d.usage?.output_tokens) outputTokens = d.usage.output_tokens;
      } else if (event.type === 'message_start') {
        const m = event as {
          message?: { usage?: { input_tokens?: number; output_tokens?: number } };
        };
        inputTokens = m.message?.usage?.input_tokens ?? 0;
        outputTokens = m.message?.usage?.output_tokens ?? 0;
      } else if (event.type === 'error') {
        const err = event as { error?: { type?: string; message?: string } };
        throw new AnthropicApiError(
          err.error?.message ?? 'stream error',
          0,
          err.error?.type ?? null,
          false,
        );
      }
    }
    return { text, stopReason, inputTokens, outputTokens };
  }

  async #throwApiError(response: Response): Promise<never> {
    let message = `Anthropic API error ${response.status}`;
    let code: string | null = null;
    try {
      const body = await response.json();
      const err = (body as { error?: { type?: string; message?: string } }).error;
      if (err?.message) message = err.message;
      if (err?.type) code = err.type;
    } catch {
      // body wasn't JSON
    }
    const retryable = response.status === 429 || response.status >= 500;
    throw new AnthropicApiError(message, response.status, code, retryable);
  }
}

// ---- SSE parser (no dependencies) --------------------------------------

async function* parseSSEStream(
  stream: ReadableStream<Uint8Array>,
): AsyncIterable<StreamEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let eventEnd: number;
      while ((eventEnd = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, eventEnd);
        buffer = buffer.slice(eventEnd + 2);
        const event = parseSSEBlock(block);
        if (event) yield event;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function parseSSEBlock(block: string): StreamEvent | null {
  let eventType: string | null = null;
  let dataLines: string[] = [];
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) {
      eventType = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }
  if (!eventType || dataLines.length === 0) return null;
  try {
    const parsed = JSON.parse(dataLines.join('\n')) as Record<string, unknown>;
    return { ...(parsed as object), type: eventType as StreamEvent['type'] };
  } catch {
    return null;
  }
}

// ---- retry wrapper -----------------------------------------------------

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { maxRetries?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const maxRetries = opts.maxRetries ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 500;
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const retryable =
        err instanceof AnthropicApiError && err.retryable && attempt < maxRetries;
      if (!retryable) throw err;
      const delay = baseDelayMs * 2 ** attempt + Math.random() * 200;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}
