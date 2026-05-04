import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { UIProvider } from './components/ui/ui-provider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <UIProvider />
  </StrictMode>,
)
