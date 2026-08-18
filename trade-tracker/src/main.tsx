import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { systemClock } from './core/clock';
import { browserDurableStorage } from './storage/durability';
import { createIndexedDbEventStore } from './storage/indexedDbEventStore';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('No #root element to mount into.');

createRoot(container).render(
  <StrictMode>
    <App
      store={createIndexedDbEventStore()}
      clock={systemClock}
      durableStorage={browserDurableStorage}
    />
  </StrictMode>,
);
