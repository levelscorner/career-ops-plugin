// WXT background entrypoint. The real logic lives in ../background/*.
// This file is a thin shim so WXT auto-detects the service worker.
import { defineBackground } from 'wxt/sandbox';
import { main as startBackground } from '../background';

export default defineBackground({
  type: 'module',
  persistent: false,
  main() {
    startBackground();
  },
});
