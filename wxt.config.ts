import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// WXT config for career-ops-plugin. Cross-browser MV3 extension with React.
// https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'career-ops',
    short_name: 'career-ops',
    description:
      'AI-powered job search pipeline. Evaluate offers A-F, generate ATS CVs, track applications.',
    version: '0.1.0',
    default_locale: 'en',
    permissions: [
      'storage',
      'sidePanel',
      'offscreen',
      'alarms',
      'clipboardRead',
      'scripting',
      'activeTab',
    ],
    host_permissions: [
      'https://*.linkedin.com/*',
      'https://boards.greenhouse.io/*',
      'https://boards-api.greenhouse.io/*',
      'https://jobs.ashbyhq.com/*',
      'https://api.ashbyhq.com/*',
      'https://jobs.lever.co/*',
      'https://api.lever.co/*',
      'https://wellfound.com/*',
      'https://*.workable.com/*',
      'https://jobs.smartrecruiters.com/*',
      'https://api.smartrecruiters.com/*',
      'https://api.anthropic.com/*',
    ],
    action: {
      default_title: 'career-ops',
      default_popup: 'popup.html',
    },
    side_panel: {
      default_path: 'sidepanel.html',
    },
    // icons intentionally omitted until real PNGs land in src/public/icons/.
    // Chrome uses a default puzzle-piece icon meanwhile.
    web_accessible_resources: [
      {
        resources: ['fonts/*.woff2'],
        matches: ['<all_urls>'],
      },
    ],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
