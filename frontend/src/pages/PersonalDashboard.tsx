import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Trophy, Gamepad2, Users, TrendingUp, CheckCircle, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { StatCard } from '@/components/StatCard'
import { PointsTrendChart } from '@/components/PointsTrendChart'
import { useMyStats, useMyHistory } from '@/hooks'

function ActivityIcon({ type, positive }: { type: string; positive: boolean }) {
  if (type === 'game') {
    return positive
      ? <TrendingUp className="h-4 w-4 text-emerald-400" />
      : <TrendingUp className="h-4 w-4 text-red-400 rotate-180" />
  }
  return positive
    ? <CheckCircle className="h-4 w-4 text-emerald-400" />
    : <XCircle className="h-4 w-4 text-red-400" />
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const TREND_COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f43f5e', '#f59e0b']

export function PersonalDashboard() {
  const { t } = useTranslation()
  const statsState   = useMyStats()
  const historyState = useMyHistory()

  // Build a personal trend: cumulative points over time (per-hall breakdown)
  const { trendData, trendLines } = useMemo(() => {
    if (historyState.status !== 'ok') return { trendData: [], trendLines: [] }

    const items = [...historyState.data].reverse()  // chronological order
    let running = 0
    const data = items.map((item, i) => {
      running += item.points
      return { date: String(i + 1), me: parseFloat(running.toFixed(2)) }
    })
    return {
      trendData: data,
      trendLines: [{ key: 'me', color: '#8b5cf6', name: 'Total' }],
    }
  }, [historyState])

  if (statsState.status === 'loading') {
    return <Layout><p className="text-center py-12 text-[var(--fg-muted)]">{t('common.loading')}</p></Layout>
  }
  if (statsState.status === 'error') {
    return <Layout><p className="text-center py-12 text-red-400">{statsState.error.message}</p></Layout>
  }

  const { total_points, halls } = statsState.data
  const historyItems = historyState.status === 'ok' ? historyState.data : []

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-[var(--fg)]">{t('dashboard.title')}</h1>
          </div>
          {historyItems.some(e => e.entry_type === 'chip') && (
            <Link
              to="/invites"
              className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-2"
            >
              <span className="text-sm text-amber-400 font-medium">
                {t('dashboard.pendingInvites')}
              </span>
            </Link>
          )}
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={t('dashboard.totalPoints')}
            value={total_points}
            icon={<Trophy className="h-6 w-6" />}
            variant={total_points >= 0 ? 'positive' : 'negative'}
          />
          <StatCard
            title={t('dashboard.gamesPlayed')}
            value={historyItems.filter(e => e.entry_type === 'game').length}
            icon={<Gamepad2 className="h-6 w-6" />}
          />
          <StatCard
            title={t('dashboard.halls')}
            value={halls.length}
            icon={<Users className="h-6 w-6" />}
          />
          <StatCard
            title="Chip events"
            value={historyItems.filter(e => e.entry_type === 'chip').length}
            icon={<TrendingUp className="h-6 w-6" />}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6"
          >
            <h3 className="text-base font-semibold text-[var(--fg)] mb-4">{t('dashboard.pointsOverTime')}</h3>
            <PointsTrendChart
              data={trendData.length ? trendData : [{ date: '–', me: 0 }]}
              lines={trendLines}
              height={240}
            />
          </motion.div>

          {/* Hall breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6"
          >
            <h3 className="text-base font-semibold text-[var(--fg)] mb-4">{t('dashboard.halls')}</h3>
            <div className="space-y-3">
              {halls.map((h, i) => (
                <Link key={h.hall_id} to={`/halls/${h.hall_id}`}>
                  <div className="flex items-center justify-between rounded-xl p-3 hover:bg-[var(--bg-surface-2)] transition-colors">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full flex-shrink-0"
                        style={{ background: TREND_COLORS[i % TREND_COLORS.length] }}
                      />
                      <span className="text-sm font-medium text-[var(--fg)]">{h.hall_name}</span>
                    </div>
                    <span className={`text-sm font-bold ${h.points >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {h.points >= 0 ? '+' : ''}{h.points.toFixed(1)} pts
                    </span>
                  </div>
                </Link>
              ))}
              {halls.length === 0 && (
                <p className="text-sm text-[var(--fg-muted)] text-center py-4">
                  {t('halls.noHalls')}
                </p>
              )}
            </div>
          </motion.div>
        </div>

        {/* Recent activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6"
        >
          <h3 className="text-base font-semibold text-[var(--fg)] mb-4">{t('dashboard.recentActivity')}</h3>
          <div className="space-y-1">
            {historyState.status === 'loading' && (
              <p className="text-sm text-[var(--fg-muted)] py-4 text-center">{t('common.loading')}</p>
            )}
            {historyItems.slice(0, 10).map((event, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.04 }}
                className="flex items-center gap-4 rounded-xl p-3 hover:bg-[var(--bg-surface-2)] transition-all"
              >
                <ActivityIcon type={event.entry_type} positive={event.points >= 0} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--fg)] truncate">
                    {event.game_name ?? event.note ?? (event.entry_type === 'chip' ? 'Chip adjustment' : 'Game result')}
                  </p>
                  <p className="text-xs text-[var(--fg-muted)]">
                    {event.hall_name} · {formatDate(event.created_at)}
                  </p>
                </div>
                <span className={`text-sm font-bold flex-shrink-0 ${event.points >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {event.points >= 0 ? '+' : ''}{event.points.toFixed(1)}
                </span>
              </motion.div>
            ))}
            {historyItems.length === 0 && historyState.status === 'ok' && (
              <p className="text-sm text-[var(--fg-muted)] text-center py-4">{t('dashboard.noActivity')}</p>
            )}
          </div>
        </motion.div>
      </div>
    </Layout>
  )
}
