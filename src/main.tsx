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
        // Check for new builds on GitHub/deployment every 30 seconds
        setInterval(() => {
          reg.update().catch(err => console.debug('[ServiceWorker] Periodic update check omitted:', err));
        }, 30000);
      })
      .catch(err => {
        console.warn('[ServiceWorker] Platform registration delayed:', err);
      });
  });

  // Force reload once the new service worker activates and claims the client
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
