import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Fix: The environment is expected to provide process.env.API_KEY natively.
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);