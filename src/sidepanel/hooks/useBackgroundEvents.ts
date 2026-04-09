// Subscribe to BackgroundEvent broadcasts and wire them into the store.

import { useEffect } from 'react';
import type { BackgroundEvent } from '../../shared/messages';
import { useEvaluateStore } from '../stores/evaluate';

export function useBackgroundEvents(): void {
  const { start, append, finish, fail } = useEvaluateStore();

  useEffect(() => {
    const listener = (message: unknown) => {
      const evt = message as BackgroundEvent;
      switch (evt?.type) {
        case 'bg:evalStarted':
          start(evt.tempId, evt.jobUrl);
          break;
        case 'bg:evalDelta':
          append(evt.tempId, evt.delta);
          break;
        case 'bg:evalCompleted':
          finish(evt.tempId, evt.application, evt.evaluation);
          break;
        case 'bg:evalFailed':
          fail(evt.tempId, evt.error);
          break;
        default:
          break;
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [start, append, finish, fail]);
}
