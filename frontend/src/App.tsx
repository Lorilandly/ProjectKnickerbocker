import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@/contexts/ThemeContext'
import '@/i18n'
import { captureTokenFromHash, getToken } from '@/api'
import { LoginPage } from '@/pages/LoginPage'
import { PersonalDashboard } from '@/pages/PersonalDashboard'
import { HallList } from '@/pages/HallList'
import { HallDetail } from '@/pages/HallDetail'
import { GameDetail } from '@/pages/GameDetail'
import { CreateGame } from '@/pages/CreateGame'
import { InvitesPage } from '@/pages/InvitesPage'

// Run once at module load — before any React component renders.
// captureTokenFromHash reads window.location.hash and calls history.replaceState
// exactly once; placing it here avoids re-running it on every render.
captureTokenFromHash()

function AuthGate() {
  const token = getToken()

  if (!token) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/"                            element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard"                   element={<PersonalDashboard />} />
      <Route path="/halls"                       element={<HallList />} />
      <Route path="/halls/:id"                   element={<HallDetail />} />
      <Route path="/halls/:hallId/games/new"      element={<CreateGame />} />
      <Route path="/halls/:hallId/games/:gameId" element={<GameDetail />} />
      <Route path="/invites"                     element={<InvitesPage />} />
      <Route path="*"                            element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthGate />
      </BrowserRouter>
    </ThemeProvider>
  )
}
