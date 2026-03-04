import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Trophy, Globe, Sun, Moon, Zap, Shield, TrendingUp } from 'lucide-react'
import { BackgroundBeams } from '@/components/ui/background-beams'
import { MovingBorder } from '@/components/ui/moving-border'
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text'
import { useTheme } from '@/contexts/ThemeContext'
import { Link } from 'react-router-dom'

const features = [
  { icon: TrendingUp, label: 'Track scores across halls & games' },
  { icon: Shield, label: 'Role-based permissions & hall admin' },
  { icon: Zap, label: 'Real-time leaderboards & charts' },
]

export function LoginPage() {
  const { t, i18n } = useTranslation()
  const { theme, toggleTheme } = useTheme()

  const toggleLang = () => {
    const next = i18n.language === 'en' ? 'zh' : 'en'
    i18n.changeLanguage(next)
    localStorage.setItem('lang', next)
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[var(--bg)]">
      <BackgroundBeams />

      {/* Top bar controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
        <button
          onClick={toggleLang}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-surface-2)] transition-all text-xs font-bold border border-[var(--border)]"
        >
          <Globe className="h-3.5 w-3.5" />
          {i18n.language.toUpperCase()}
        </button>
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-surface-2)] transition-all border border-[var(--border)]"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      {/* Radial glow effects */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-12 px-4 py-16 w-full max-w-lg mx-auto">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-2xl shadow-violet-500/30">
              <Trophy className="h-10 w-10 text-white" />
            </div>
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 opacity-30 blur-md -z-10" />
          </div>

          <div className="text-center">
            <h1 className="text-5xl font-black tracking-tight">
              <AnimatedGradientText>{t('login.title')}</AnimatedGradientText>
            </h1>
            <p className="mt-2 text-lg text-[var(--fg-muted)]">{t('login.subtitle')}</p>
          </div>
        </motion.div>

        {/* Login card */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full"
        >
          <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)]/80 backdrop-blur-xl p-8">
            {/* Inner glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-3/4 bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

            <p className="text-center text-[var(--fg-muted)] text-sm mb-6">{t('login.description')}</p>

            {/* Features */}
            <div className="mb-6 space-y-2">
              {features.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-3 text-sm text-[var(--fg-muted)]"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/10">
                    <f.icon className="h-3.5 w-3.5 text-violet-400" />
                  </div>
                  {f.label}
                </motion.div>
              ))}
            </div>

            {/* Google Sign-in button */}
            <MovingBorder
              as="div"
              containerClassName="w-full"
              className="w-full"
              duration={2500}
            >
              <Link
                to="/dashboard"
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-[var(--bg-surface-2)] px-6 py-3.5 text-sm font-semibold text-[var(--fg)] transition-all hover:bg-[var(--bg-surface)] hover:shadow-lg"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {t('login.signIn')}
              </Link>
            </MovingBorder>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-xs text-[var(--fg-muted)] text-center"
        >
          Project Knickerbocker · v1.0.0
        </motion.p>
      </div>
    </div>
  )
}
