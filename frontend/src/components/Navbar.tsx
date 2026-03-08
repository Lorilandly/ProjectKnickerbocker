import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Trophy, Sun, Moon, Globe, Menu, X, Bell, LogOut, Shield } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { api, clearToken } from '@/api'
import { useApi } from '@/hooks'
import { cn } from '@/lib/cn'

const NAV_ITEMS = [
  { key: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
  { key: 'halls',     href: '/halls',     icon: Trophy },
  { key: 'invites',   href: '/invites',   icon: Bell },
]

export function Navbar() {
  const { t, i18n } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const meState = useApi(() => api.getMe())
  const me = meState.status === 'ok' ? meState.data : null

  const toggleLang = () => {
    const next = i18n.language === 'en' ? 'zh' : 'en'
    i18n.changeLanguage(next)
    localStorage.setItem('lang', next)
  }

  function handleLogout() {
    api.logout().catch(() => null).finally(() => {
      clearToken()
      window.location.href = '/'
    })
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 shadow-lg group-hover:shadow-violet-500/25 transition-shadow">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <span className="hidden sm:block font-bold text-lg tracking-tight text-[var(--fg)]">
              Score<span className="text-violet-500">Tracker</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon
              const active = location.pathname.startsWith(item.href)
              return (
                <Link
                  key={item.key}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    active
                      ? 'bg-violet-500/10 text-violet-500'
                      : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-surface-2)]'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t(`nav.${item.key}`)}
                </Link>
              )
            })}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLang}
              className="flex items-center gap-1 p-2 rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-surface-2)] transition-all text-xs font-bold"
              title="Toggle language"
            >
              <Globe className="h-4 w-4" />
              {i18n.language.toUpperCase()}
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-surface-2)] transition-all"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Server admin badge */}
            {me?.is_server_admin && (
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 text-amber-500 text-xs font-medium">
                <Shield className="h-3 w-3" />
                {t('common.serverAdmin')}
              </div>
            )}

            {/* User avatar */}
            {me && (
              <div className="flex items-center gap-2 pl-2 border-l border-[var(--border)]">
                {me.avatar_url ? (
                  <img
                    src={me.avatar_url}
                    alt={me.name}
                    className="h-8 w-8 rounded-full ring-2 ring-violet-500/20"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-xs font-bold text-white ring-2 ring-violet-500/20">
                    {me.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="hidden lg:block text-sm font-medium text-[var(--fg)]">{me.name}</span>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="hidden md:flex p-2 rounded-lg text-[var(--fg-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all"
              title={t('nav.logout')}
            >
              <LogOut className="h-4 w-4" />
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(o => !o)}
              className="md:hidden p-2 rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-surface-2)] transition-all"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden border-t border-[var(--border)] bg-[var(--bg)]"
          >
            <nav className="p-4 flex flex-col gap-2">
              {NAV_ITEMS.map(item => {
                const Icon = item.icon
                const active = location.pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.key}
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                      active
                        ? 'bg-violet-500/10 text-violet-500'
                        : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-surface-2)]'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {t(`nav.${item.key}`)}
                  </Link>
                )
              })}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all"
              >
                <LogOut className="h-5 w-5" />
                {t('nav.logout')}
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
