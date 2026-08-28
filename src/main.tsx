import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AppDataProvider } from '@/data';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ConnectivityProvider } from '@/components/ConnectivityProvider';
import { initPwaRegistration } from '@/lib/registerPwa';
import './index.css';

initPwaRegistration();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AppDataProvider>
        <ConnectivityProvider>
          <App />
        </ConnectivityProvider>
      </AppDataProvider>
    </ThemeProvider>
  </StrictMode>
);
