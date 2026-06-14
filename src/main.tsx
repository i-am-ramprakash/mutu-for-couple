import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './ThemeContext.tsx';

// Register Service Worker for robust smartphone native notifications and PWA capabilities
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('[ServiceWorker] Active & synchronized onto platform scope:', reg.scope);
      })
      .catch(err => {
        console.warn('[ServiceWorker] Platform registration delayed:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
