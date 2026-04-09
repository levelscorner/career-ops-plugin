// Live streaming evaluation state. Each in-flight evaluation has a
// tempId; deltas from the background worker are appended to the buffer
// and exposed to the UI via this store.

import { create } from 'zustand';
import type { Application, EvaluationResult } from '../../shared/types';

interface StreamState {
  tempId: string | null;
  jobUrl: string | null;
  buffer: string;
  status: 'idle' | 'streaming' | 'done' | 'error';
  error: string | null;
  result: {
    application: Application;
    evaluation: EvaluationResult;
  } | null;
}

interface Actions {
  start(tempId: string, jobUrl: string): void;
  append(tempId: string, delta: string): void;
  finish(
    tempId: string,
    application: Application,
    evaluation: EvaluationResult,
  ): void;
  fail(tempId: string, error: string): void;
  reset(): void;
}

export const useEvaluateStore = create<StreamState & Actions>((set, get) => ({
  tempId: null,
  jobUrl: null,
  buffer: '',
  status: 'idle',
  error: null,
  result: null,

  start: (tempId, jobUrl) =>
    set({
      tempId,
      jobUrl,
      buffer: '',
      status: 'streaming',
      error: null,
      result: null,
    }),

  append: (tempId, delta) => {
    if (get().tempId !== tempId) return;
    set((state) => ({ buffer: state.buffer + delta }));
  },

  finish: (tempId, application, evaluation) => {
    if (get().tempId !== tempId) return;
    set({ status: 'done', result: { application, evaluation } });
  },

  fail: (tempId, error) => {
    if (get().tempId !== tempId) return;
    set({ status: 'error', error });
  },

  reset: () =>
    set({ tempId: null, jobUrl: null, buffer: '', status: 'idle', error: null, result: null }),
}));
