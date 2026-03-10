import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeft, Calendar, Users, Zap, Trophy, Trash2, Loader2, X,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import { Layout } from '@/components/Layout'
import { useGame, useGameResults, useMe, useHallMembers } from '@/hooks'
import { api } from '@/api'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/cn'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export function GameDetail() {
  const { hallId, gameId } = useParams<{ hallId: string; gameId: string }>()
  const { t } = useTranslation()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const [deleteError, setDeleteError]     = useState<string | null>(null)

  const gameState    = useGame(Number(gameId))
  const resultsState = useGameResults(Number(hallId), Number(gameId))
  const meState      = useMe()
  const membersState = useHallMembers(Number(hallId))

  const currentUserId = meState.status === 'ok' ? meState.data.id : null
  const isServerAdmin = meState.status === 'ok' && !!meState.data.is_server_admin
  const isHallAdmin   = membersState.status === 'ok'
    && membersState.data.some(m => m.member.user_id === currentUserId && m.member.role === 'admin')
  const canDelete = isServerAdmin || isHallAdmin

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      await api.deleteGame(Number(gameId))
      navigate(`/halls/${hallId}?tab=games`)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete game.')
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  const game    = gameState.status === 'ok' ? gameState.data : null
  const results = resultsState.status === 'ok'
    ? [...resultsState.data].sort((a, b) => b.points - a.points)
    : []

  const gridColor = theme === 'dark' ? '#27272a' : '#e4e4e7'
  const textColor = '#71717a'

  const chartData = results.map(r => ({
    name: r.user_name.split(' ')[0],
    points: r.points,
  }))

  const totalPositive = results.filter(r => r.points > 0).reduce((s, r) => s + r.points, 0)

  if (gameState.status === 'error') {
    return <Layout><p className="text-center py-12 text-red-400">{gameState.error.message}</p></Layout>
  }

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean; payload?: Array<{ value: number }>; label?: string
  }) => {
    if (!active || !payload?.length || !game) return null
    const val = payload[0].value
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 shadow-xl">
        <p className="text-sm font-medium text-[var(--fg)]">{label}</p>
        <p className={`text-xl font-bold ${val >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {val >= 0 ? '+' : ''}{val} pts
        </p>
        <p className="text-xs text-[var(--fg-muted)]">
          After ×{game.point_conversion_rate}: {val >= 0 ? '+' : ''}{(val * game.point_conversion_rate).toFixed(1)} hall pts
        </p>
      </div>
    )
  }

  return (
    <Layout>
      {/* Delete confirmation modal */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDelete(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-2xl"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
              <button onClick={() => setConfirmDelete(false)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[var(--bg-surface-2)] text-[var(--fg-muted)] transition-colors">
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="h-5 w-5 text-red-400" />
                </div>
                <h2 className="font-semibold text-[var(--fg)]">Delete Game</h2>
              </div>
              <p className="text-sm text-[var(--fg-muted)] mb-1">
                Are you sure you want to delete <span className="font-medium text-[var(--fg)]">{game?.name}</span>?
              </p>
              <p className="text-xs text-[var(--fg-muted)] mb-5">
                This will reverse all hall points awarded from this game. This action cannot be undone.
              </p>
              {deleteError && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 mb-4">{deleteError}</p>
              )}
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)] text-sm font-medium text-[var(--fg-muted)] hover:text-[var(--fg)] transition-all">
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-60 transition-all"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-[var(--fg-muted)]">
          <Link to="/halls" className="hover:text-[var(--fg)] transition-colors">{t('halls.title')}</Link>
          <span>/</span>
          <Link to={`/halls/${hallId}`} className="hover:text-[var(--fg)] transition-colors">Hall</Link>
          <span>/</span>
          <span className="text-[var(--fg)]">{game?.name ?? '…'}</span>
        </div>

        {/* Game header card */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-cyan-500/5 pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />

          <div className="relative">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl font-bold text-[var(--fg)]">{game?.name ?? '…'}</h1>
                {game?.description && (
                  <p className="text-[var(--fg-muted)] text-sm mt-1">{game.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {canDelete && (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                )}
                  <Link
                    to={`/halls/${hallId}?tab=games`}
                    className="flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back to hall
                  </Link>
              </div>
            </div>

            {game && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--bg-surface-2)]">
                  <Calendar className="h-4 w-4 text-violet-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[var(--fg-muted)]">{t('game.playedAt')}</p>
                    <p className="text-sm font-medium text-[var(--fg)]">{formatDate(game.played_at)}</p>
                    <p className="text-xs text-[var(--fg-muted)]">{formatTime(game.played_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--bg-surface-2)]">
                  <Users className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[var(--fg-muted)]">{t('game.players')}</p>
                    <p className="text-sm font-medium text-[var(--fg)]">{results.length} players</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--bg-surface-2)]">
                  <Zap className="h-4 w-4 text-amber-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[var(--fg-muted)]">{t('game.conversionRate')}</p>
                    <p className="text-sm font-medium text-[var(--fg)]">×{game.point_conversion_rate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--bg-surface-2)]">
                  <Trophy className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[var(--fg-muted)]">Total winnings</p>
                    <p className="text-sm font-medium text-emerald-400">+{totalPositive} pts</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Chart + Results */}
        {resultsState.status === 'loading' && (
          <p className="text-center py-8 text-[var(--fg-muted)]">Loading results…</p>
        )}
        {resultsState.status === 'error' && (
          <p className="text-center py-8 text-red-400">{resultsState.error.message}</p>
        )}

        {results.length > 0 && game && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6"
            >
              <h2 className="text-base font-semibold text-[var(--fg)] mb-4">{t('game.results')}</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: textColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis
                    domain={['dataMin - 50', 'dataMax + 50']}
                    tick={{ fill: textColor, fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `${v > 0 ? '+' : ''}${v}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke={gridColor} strokeWidth={2} />
                  <Bar dataKey="points" radius={[6, 6, 0, 0]} maxBarSize={70}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.points >= 0 ? 'url(#posGrad)' : 'url(#negGrad)'} />
                    ))}
                  </Bar>
                  <defs>
                    <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.7} />
                    </linearGradient>
                    <linearGradient id="negGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.9} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Results table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden"
            >
              <div className="p-5 border-b border-[var(--border)]">
                <h2 className="text-base font-semibold text-[var(--fg)]">Player Results</h2>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {results.map((r, i) => {
                  const hallPts = r.points * game.point_conversion_rate
                  return (
                    <motion.div
                      key={r.user_id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.07 }}
                      className="flex items-center gap-4 p-5 hover:bg-[var(--bg-surface-2)] transition-all"
                    >
                      <span className="text-base w-6 text-center">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                      </span>
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/30 to-cyan-500/30 text-sm font-bold text-[var(--fg)]">
                        {r.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[var(--fg)]">
                          {r.user_name}
                          {i === 0 && (
                            <span className="ml-2 text-xs font-normal text-amber-400">Winner</span>
                          )}
                        </p>
                        <p className="text-xs text-[var(--fg-muted)]">
                          Hall pts: <span className={hallPts >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {hallPts >= 0 ? '+' : ''}{hallPts.toFixed(1)}
                          </span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={cn('text-xl font-bold', r.points >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                          {r.points >= 0 ? '+' : ''}{r.points}
                        </p>
                        <p className="text-xs text-[var(--fg-muted)]">game pts</p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </Layout>
  )
}
