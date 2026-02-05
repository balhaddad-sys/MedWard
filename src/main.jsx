/**
 * MedWard Pro - Main Entry Point
 * v9.0.0
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// Styles
import './styles/index.css';
import './styles/components.css';
import './styles/animations.css';

// Initialize app
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Hide splash screen after React mounts
window.addEventListener('load', () => {
  const splash = document.getElementById('splash');
  if (splash) {
    setTimeout(() => {
      splash.classList.add('hidden');
    }, 300);
  }
});

// Register service worker for PWA (production only)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration failed
    });
  });
}
