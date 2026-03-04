import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@/contexts/ThemeContext'
import '@/i18n'
import { LoginPage } from '@/pages/LoginPage'
import { PersonalDashboard } from '@/pages/PersonalDashboard'
import { HallList } from '@/pages/HallList'
import { HallDetail } from '@/pages/HallDetail'
import { GameDetail } from '@/pages/GameDetail'

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/dashboard" element={<PersonalDashboard />} />
          <Route path="/halls" element={<HallList />} />
          <Route path="/halls/:id" element={<HallDetail />} />
          <Route path="/halls/:hallId/games/:gameId" element={<GameDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
