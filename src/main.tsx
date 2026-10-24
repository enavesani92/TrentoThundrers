import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <main className="p-6 font-display text-3xl text-yellow">THUNDERS TRAINING</main>
  </StrictMode>,
);
