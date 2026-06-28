import React from 'react'
import { createRoot } from 'react-dom/client'
import { captureOAuthTokenFromUrl } from './lib/oauthBootstrap.js'
import { ErrorBoundary } from './ErrorBoundary.jsx'
import App from './pages/App.jsx'
import './styles.css'

console.log('main.jsx: Starting app initialization')

try {
  captureOAuthTokenFromUrl()
  console.log('main.jsx: OAuth token captured')
} catch (error) {
  console.error('main.jsx: Failed to capture OAuth token:', error)
}

const root = document.getElementById('root')
if (!root) {
  console.error('main.jsx: Root element not found!')
  throw new Error('Root element with id="root" not found in HTML')
}

console.log('main.jsx: Creating React root and rendering app')

try {
  createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  )
  console.log('main.jsx: App rendered successfully')
} catch (error) {
  console.error('main.jsx: Failed to render app:', error)
  root.innerHTML = `<div style="padding:20px;color:red;"><h1>App Error</h1><p>${error.message}</p></div>`
}


