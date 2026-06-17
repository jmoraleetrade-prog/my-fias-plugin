import React from 'react';
import ReactDOM from 'react-dom/client';
import { FiasProvider } from '@fias/arche-sdk';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FiasProvider>
      <App />
    </FiasProvider>
  </React.StrictMode>,
);
