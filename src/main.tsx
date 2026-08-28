import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AppDataProvider } from '@/data';
import { ThemeProvider } from '@/components/ThemeProvider';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AppDataProvider>
        <App />
      </AppDataProvider>
    </ThemeProvider>
  </StrictMode>
);
