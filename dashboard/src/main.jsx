// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { DataProvider } from './contexts/DataContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 用 DataProvider 包裹整个应用 */}
    <DataProvider>
      <App />
    </DataProvider>
  </React.StrictMode>,
)