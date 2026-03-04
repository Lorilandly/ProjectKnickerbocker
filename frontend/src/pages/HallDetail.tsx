import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard, Table2, Gamepad2, UserPlus, Plus, ChevronLeft,
  Crown, ArrowUpDown, ArrowUp, ArrowDown, Search, Coins, Trophy,
} from 'lucide-react'
import { Layout } from '@/components/Layout'
import { LeaderboardChart } from '@/components/LeaderboardChart'
import { PointsTrendChart } from '@/components/PointsTrendChart'
import { Spotlight } from '@/components/ui/spotlight'
import { halls, hallMembers, games, gameResults, hallPointsTrend } from '@/data/dummy'
import { cn } from '@/lib/cn'

type Tab = 'dashboard' | 'table' | 'games' | 'members'

const TABS: { key: Tab; icon: React.ElementType }[] = [
  { key: 'dashboard', icon: LayoutDashboard },
  { key: 'table', icon: Table2 },
  { key: 'games', icon: Gamepad2 },
  { key: 'members', icon: UserPlus },
]

const TREND_COLORS: Record<string, string> = {
  Alex: '#8b5cf6',
  Sarah: '#06b6d4',
  Emma: '#10b981',
  Mike: '#f43f5e',
  David: '#f59e0b',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

// ─── Dashboard Tab ────────────────────────────────────────────────
function DashboardTab({ hallId }: { hallId: string }) {
  const { t } = useTranslation()
  const members = hallMembers[hallId] || []
  const leaderboardData = [...members]
    .sort((a, b) => b.points - a.points)
    .map(m => ({ name: m.name.split(' ')[0], points: m.points }))

  const trend = hallPointsTrend[hallId] || []
  const trendLines = Object.keys(TREND_COLORS)
    .filter(k => trend.some(d => d[k] !== undefined))
    .map(k => ({ key: k, color: TREND_COLORS[k] }))

  const recentGames = (games[hallId] || []).slice(0, 4)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leaderboard */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6">
          <h3 className="text-base font-semibold text-[var(--fg)] mb-4">{t('hall.leaderboard')}</h3>
          <LeaderboardChart data={leaderboardData} height={260} />
        </div>

        {/* Trend chart */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6">
          <h3 className="text-base font-semibold text-[var(--fg)] mb-4">{t('hall.pointsTrend')}</h3>
          <PointsTrendChart data={trend} lines={trendLines} height={260} showLegend />
        </div>
      </div>

      {/* Recent games */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-[var(--fg)]">{t('hall.recentGames')}</h3>
          <Link to={`?tab=games`} className="text-sm text-violet-400 hover:text-violet-300">View all →</Link>
        </div>
        <div className="space-y-3">
          {recentGames.map(game => {
            const results = gameResults[game.id] || []
            return (
              <div key={game.id} className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-surface-2)] hover:border-violet-500/20 border border-transparent transition-all">
                <div>
                  <p className="font-medium text-[var(--fg)] text-sm">{game.name}</p>
                  <p className="text-xs text-[var(--fg-muted)]">{formatDate(game.played_at)} · {results.length} players</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--fg-muted)]">×{game.point_conversion_rate} rate</span>
                  <Link
                    to={`/halls/${hallId}/games/${game.id}`}
                    className="text-xs font-medium text-violet-400 hover:text-violet-300 px-3 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 transition-all"
                  >
                    View
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Members Tab ──────────────────────────────────────────────────
function MembersTab({ hallId }: { hallId: string }) {
  const { t } = useTranslation()
  const members = [...(hallMembers[hallId] || [])].sort((a, b) => b.points - a.points)

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
      <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
        <h3 className="font-semibold text-[var(--fg)]">{t('hall.members')} ({members.length})</h3>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 text-sm font-medium transition-all">
          <UserPlus className="h-4 w-4" />
          {t('hall.inviteUser')}
        </button>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {members.map((member, i) => (
          <motion.div
            key={member.user_id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-4 p-4 hover:bg-[var(--bg-surface-2)] transition-all"
          >
            <span className="text-sm font-bold text-[var(--fg-muted)] w-6 text-center">
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
            </span>
            <img src={member.avatar_url} alt={member.name} className="h-10 w-10 rounded-full" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-[var(--fg)]">{member.name}</p>
                {member.role === 'admin' && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400">
                    <Crown className="h-2.5 w-2.5" />
                    {t('halls.role.admin')}
                  </span>
                )}
              </div>
            </div>
            <span className={cn(
              'text-lg font-bold',
              member.points >= 0 ? 'text-emerald-400' : 'text-red-400'
            )}>
              {member.points >= 0 ? '+' : ''}{member.points}
              <span className="text-xs font-normal ml-1 text-[var(--fg-muted)]">pts</span>
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ─── Table Tab ────────────────────────────────────────────────────
type SortKey = 'name' | 'played_at' | 'players' | 'point_conversion_rate'

function TableTab({ hallId }: { hallId: string }) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('played_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const allGames = games[hallId] || []
  const filtered = allGames
    .filter(g => g.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let va: string | number = a[sortKey]
      let vb: string | number = b[sortKey]
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb as string) : (vb as string).localeCompare(va)
      return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number)
    })

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
    return sortDir === 'asc'
      ? <ArrowUp className="h-3.5 w-3.5 text-violet-400" />
      : <ArrowDown className="h-3.5 w-3.5 text-violet-400" />
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--fg-muted)]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('common.search') + ' games...'}
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 transition-all"
        />
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-surface-2)]">
                {([
                  { key: 'name', label: t('table.game') },
                  { key: 'played_at', label: t('table.date') },
                  { key: 'players', label: t('table.players') },
                  { key: 'point_conversion_rate', label: t('table.rate') },
                ] as { key: SortKey; label: string }[]).map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-5 py-3.5 text-left font-medium text-[var(--fg-muted)] cursor-pointer hover:text-[var(--fg)] transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      {col.label}
                      <SortIcon k={col.key} />
                    </div>
                  </th>
                ))}
                <th className="px-5 py-3.5 text-left font-medium text-[var(--fg-muted)]">{t('table.results')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map((game, i) => {
                const results = gameResults[game.id] || []
                return (
                  <motion.tr
                    key={game.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="hover:bg-[var(--bg-surface-2)] transition-all group"
                  >
                    <td className="px-5 py-4">
                      <Link
                        to={`/halls/${hallId}/games/${game.id}`}
                        className="font-medium text-[var(--fg)] group-hover:text-violet-400 transition-colors"
                      >
                        {game.name}
                      </Link>
                      {game.description && (
                        <p className="text-xs text-[var(--fg-muted)] mt-0.5">{game.description}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-[var(--fg-muted)]">
                      <div>{formatDate(game.played_at)}</div>
                      <div className="text-xs">{formatTime(game.played_at)}</div>
                    </td>
                    <td className="px-5 py-4 text-[var(--fg-muted)]">{game.players}</td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-1 rounded-md bg-violet-500/10 text-violet-400 text-xs font-medium">
                        ×{game.point_conversion_rate}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {results.map(r => (
                          <span
                            key={r.user_id}
                            className={cn(
                              'px-2 py-0.5 rounded-full text-xs font-medium',
                              r.points >= 0
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-red-500/10 text-red-400'
                            )}
                          >
                            {r.name.split(' ')[0]}: {r.points >= 0 ? '+' : ''}{r.points}
                          </span>
                        ))}
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-[var(--fg-muted)]">
                    {t('table.noGames')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Games Tab ────────────────────────────────────────────────────
function GamesTab({ hallId }: { hallId: string }) {
  const { t } = useTranslation()
  const allGames = [...(games[hallId] || [])].sort(
    (a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime()
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--fg-muted)]">{allGames.length} games total</p>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 transition-all shadow-lg shadow-violet-500/20">
          <Plus className="h-4 w-4" />
          {t('hall.addGame')}
        </button>
      </div>

      <div className="space-y-3">
        {allGames.map((game, i) => {
          const results = [...(gameResults[game.id] || [])].sort((a, b) => b.points - a.points)
          const winner = results[0]

          return (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link to={`/halls/${hallId}/games/${game.id}`} className="block group">
                <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5 transition-all">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-500/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-[var(--fg)] group-hover:text-violet-400 transition-colors">{game.name}</h4>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-500/10 text-violet-400">
                          ×{game.point_conversion_rate}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--fg-muted)]">
                        {formatDate(game.played_at)} · {game.players} players
                        {game.description && ` · ${game.description}`}
                      </p>
                    </div>

                    {winner && (
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-[var(--fg-muted)]">Top scorer</p>
                        <p className="font-semibold text-[var(--fg)]">{winner.name.split(' ')[0]}</p>
                        <p className="text-emerald-400 font-bold text-sm">+{winner.points}</p>
                      </div>
                    )}
                  </div>

                  {/* Player results row */}
                  <div className="relative mt-3 flex flex-wrap gap-1.5">
                    {results.map(r => (
                      <span
                        key={r.user_id}
                        className={cn(
                          'px-2.5 py-1 rounded-full text-xs font-medium',
                          r.points >= 0
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-red-500/10 text-red-400'
                        )}
                      >
                        {r.name.split(' ')[0]} {r.points >= 0 ? '+' : ''}{r.points}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────
export function HallDetail() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  const hall = halls.find(h => h.id === id)
  if (!hall) return <Layout><p>Hall not found</p></Layout>

  const members = hallMembers[id!] || []
  const totalGames = (games[id!] || []).length

  return (
    <Layout>
      <div className="space-y-6">
        {/* Breadcrumb + header */}
        <div>
          <Link
            to="/halls"
            className="flex items-center gap-1 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors mb-3"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('halls.title')}
          </Link>

          <Spotlight className="rounded-2xl">
            <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6">
              {/* Decorative gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/8 via-transparent to-cyan-500/8 pointer-events-none" />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />

              <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                    <Trophy className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-[var(--fg)]">{hall.name}</h1>
                    <p className="text-[var(--fg-muted)] text-sm">{hall.description}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-[var(--fg-muted)]">{members.length} members</span>
                      <span className="text-xs text-[var(--fg-muted)]">·</span>
                      <span className="text-xs text-[var(--fg-muted)]">{totalGames} games</span>
                      {hall.my_role === 'admin' && (
                        <>
                          <span className="text-xs text-[var(--fg-muted)]">·</span>
                          <span className="flex items-center gap-1 text-xs font-medium text-amber-400">
                            <Crown className="h-3 w-3" />
                            Admin
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {hall.my_role === 'admin' && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)] text-sm font-medium transition-all">
                      <Coins className="h-4 w-4" />
                      {t('hall.chipInOut')}
                    </button>
                    <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 transition-all shadow-lg shadow-violet-500/20">
                      <Plus className="h-4 w-4" />
                      {t('hall.addGame')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </Spotlight>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-1 p-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] no-scrollbar">
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200',
                  active
                    ? 'text-[var(--fg)]'
                    : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
                )}
              >
                {active && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border)]"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <Icon className="relative h-4 w-4" />
                <span className="relative">{t(`hall.${tab.key === 'games' ? 'gamesList' : tab.key}`)}</span>
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && <DashboardTab hallId={id!} />}
            {activeTab === 'table' && <TableTab hallId={id!} />}
            {activeTab === 'games' && <GamesTab hallId={id!} />}
            {activeTab === 'members' && <MembersTab hallId={id!} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </Layout>
  )
}
