import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../sidepanel/styles/global.css';
import Options from '../../options/Options';

const root = document.getElementById('root');
if (!root) throw new Error('career-ops: #root missing from options.html');

createRoot(root).render(
  <React.StrictMode>
    <Options />
  </React.StrictMode>,
);
