import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Auto-register service worker immediately for offline capability
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('App update available');
  },
  onOfflineReady() {
    console.log('Grandmaster Dark Chess is ready to work offline');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
