// Offscreen document — MV3 hidden DOM used for PDF generation.
// Receives messages from the background service worker, runs the
// pdf-lib renderer, and posts the PDF back as a Uint8Array.
import { runOffscreenWorker } from '../../offscreen/worker';

runOffscreenWorker();
