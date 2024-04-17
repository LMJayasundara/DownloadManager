// import './assets/main.css'
import './assets/index.css'

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { HashRouter } from "react-router-dom";
// import { DownloadProvider } from './DownloadContext'; // import the provider
import { DataProvider } from './DownloadContext';

// ReactDOM.createRoot(document.getElementById('root')).render(
//   <React.StrictMode>
//     <App />
//   </React.StrictMode>
// )

// ReactDOM.createRoot(document.getElementById('root')).render(
//   <HashRouter>
//     <App />
//   </HashRouter>
// );

ReactDOM.createRoot(document.getElementById('root')).render(
  <HashRouter>
    <DataProvider>
      <App />
    </DataProvider>
  </HashRouter>
);