import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ThemeProvider } from './theme/ThemeProvider';
import { MotionConfig } from 'motion/react';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      {/* Respect prefers-reduced-motion everywhere. */}
      <MotionConfig reducedMotion="user">
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
          <App />
        </BrowserRouter>
      </MotionConfig>
    </ThemeProvider>
  </React.StrictMode>,
);
