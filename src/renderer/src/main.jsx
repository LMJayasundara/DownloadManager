import './assets/index.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { HashRouter } from "react-router-dom";
import { DataProvider } from './DownloadContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <HashRouter>
    <DataProvider>
      <App />
    </DataProvider>
  </HashRouter>
);