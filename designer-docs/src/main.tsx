import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { AuthGate } from './AuthGate.tsx'
import './styles/app.css'

createRoot(document.getElementById('root')!).render(
  <AuthGate>
    <App />
  </AuthGate>,
)
