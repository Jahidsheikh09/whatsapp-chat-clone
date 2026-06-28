import React from 'react'
import { createRoot } from 'react-dom/client'
import { captureOAuthTokenFromUrl } from './lib/oauthBootstrap.js'
import App from './pages/App.jsx'
import './styles.css'

captureOAuthTokenFromUrl()

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)


