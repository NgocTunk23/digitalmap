import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
// Tuyệt đối không để dòng import './index.css' ở đây nữa nhé

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)