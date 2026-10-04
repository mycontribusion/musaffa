import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Last line of defence: without this a single render throw unmounts the
        whole root and the user is left with a blank page. */}
    <ErrorBoundary>
      <App />
      <Analytics />
    </ErrorBoundary>
  </StrictMode>,
)
