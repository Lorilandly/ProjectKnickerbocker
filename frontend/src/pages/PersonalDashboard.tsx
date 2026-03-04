import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Trophy, Gamepad2, Users, TrendingUp, CheckCircle, XCircle, Clock } from 'lucide-react'
import { Layout } from '@/components/Layout'
import { StatCard } from '@/components/StatCard'
import { PointsTrendChart } from '@/components/PointsTrendChart'
import {
  personalPointsHistory, halls, recentActivity, invites,
} from '@/data/dummy'

function ActivityIcon({ type, positive }: { type: string; positive: boolean }) {
  if (type === 'game_result') {
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

export function PersonalDashboard() {
  const { t } = useTranslation()

  const totalPoints = halls.reduce((sum, h) => sum + h.my_points, 0)
  const gamesPlayed = 9
  const winRate = 56

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
            <p className="text-[var(--fg-muted)] mt-1">Welcome back, Alex Chen</p>
          </div>
          {invites.length > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-2">
              <Clock className="h-4 w-4 text-amber-400" />
              <span className="text-sm text-amber-400 font-medium">
                {invites.length} {t('dashboard.pendingInvites')}
              </span>
            </div>
          )}
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={t('dashboard.totalPoints')}
            value={totalPoints}
            icon={<Trophy className="h-6 w-6" />}
            variant={totalPoints >= 0 ? 'positive' : 'negative'}
            trend={{ value: 12, label: 'this week' }}
            delay={0}
          />
          <StatCard
            title={t('dashboard.gamesPlayed')}
            value={gamesPlayed}
            icon={<Gamepad2 className="h-6 w-6" />}
            variant="default"
            delay={0.1}
          />
          <StatCard
            title={t('dashboard.halls')}
            value={halls.length}
            icon={<Users className="h-6 w-6" />}
            variant="accent"
            delay={0.2}
          />
          <StatCard
            title={t('dashboard.winRate')}
            value={`${winRate}%`}
            icon={<TrendingUp className="h-6 w-6" />}
            variant={winRate >= 50 ? 'positive' : 'negative'}
            trend={{ value: 3, label: 'vs last month' }}
            delay={0.3}
          />
        </div>

        {/* Charts + activity grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Points over time chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6"
          >
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-4">{t('dashboard.pointsOverTime')}</h2>
            <PointsTrendChart
              data={personalPointsHistory}
              lines={[{ key: 'points', color: '#8b5cf6', name: 'Total Points' }]}
              height={240}
            />
          </motion.div>

          {/* Recent activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6"
          >
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-4">{t('dashboard.recentActivity')}</h2>
            <div className="space-y-3 overflow-y-auto max-h-[260px]">
              {recentActivity.map((act, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.05 }}
                  className="flex items-start gap-3 py-2 border-b border-[var(--border)] last:border-0"
                >
                  <div className="mt-0.5 flex-shrink-0">
                    <ActivityIcon type={act.type} positive={act.positive} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[var(--fg)] truncate">{act.game || act.note}</p>
                    <p className="text-xs text-[var(--fg-muted)] truncate">{act.hall}</p>
                  </div>
                  <span className={`text-sm font-bold flex-shrink-0 ${act.positive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {act.positive ? '+' : ''}{act.points}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Halls summary + Pending invites */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Halls summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6"
          >
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-4">{t('halls.title')}</h2>
            <div className="space-y-3">
              {halls.map(hall => (
                <div
                  key={hall.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-surface-2)] hover:border-violet-500/30 border border-transparent transition-all cursor-pointer"
                >
                  <div>
                    <p className="font-medium text-[var(--fg)]">{hall.name}</p>
                    <p className="text-xs text-[var(--fg-muted)]">Rank #{hall.my_rank} · {hall.member_count} members</p>
                  </div>
                  <span className={`text-lg font-bold ${hall.my_points >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {hall.my_points >= 0 ? '+' : ''}{hall.my_points}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Pending invites */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6"
          >
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-4">{t('dashboard.pendingInvites')}</h2>
            {invites.length === 0 ? (
              <p className="text-sm text-[var(--fg-muted)]">{t('dashboard.noActivity')}</p>
            ) : (
              <div className="space-y-3">
                {invites.map(inv => (
                  <div key={inv.id} className="p-4 rounded-xl bg-[var(--bg-surface-2)] space-y-3">
                    <div>
                      <p className="font-medium text-[var(--fg)]">{inv.hall_name}</p>
                      <p className="text-xs text-[var(--fg-muted)]">
                        {t('dashboard.invitedBy')} {inv.invited_by} · {formatDate(inv.created_at)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-all text-sm font-medium">
                        <CheckCircle className="h-4 w-4" />
                        {t('dashboard.accept')}
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-sm font-medium">
                        <XCircle className="h-4 w-4" />
                        {t('dashboard.decline')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </Layout>
  )
}
