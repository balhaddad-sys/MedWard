import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from './components/ErrorBoundary'
import App from './App'
import './index.css'
import './styles/touch.css'
import './styles/modes.css'
import './styles/drug-card.css'
import './styles/chat-interface.css'

// Dismiss splash screen once React mounts
function dismissSplash() {
  const splash = document.getElementById('splash-screen')
  if (splash) {
    splash.classList.add('fade-out')
    setTimeout(() => splash.remove(), 350)
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)

dismissSplash()

// Register service worker in production
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration failed — app still works without it
    })
  })
}
