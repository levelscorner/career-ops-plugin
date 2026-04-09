import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../sidepanel/styles/global.css';
import Popup from '../../popup/Popup';

const root = document.getElementById('root');
if (!root) throw new Error('career-ops: #root missing from popup.html');

createRoot(root).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
);
