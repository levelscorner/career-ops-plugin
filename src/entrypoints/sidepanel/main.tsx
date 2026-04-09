import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../sidepanel/styles/global.css';
import App from '../../sidepanel/App';

const root = document.getElementById('root');
if (!root) throw new Error('career-ops: #root missing from sidepanel.html');

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
