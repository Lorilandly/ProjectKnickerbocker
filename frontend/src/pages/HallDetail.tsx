import { useMemo, useState, useRef, useEffect } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard, Table2, Gamepad2, UserPlus, Plus, ChevronLeft,
  Crown, ArrowUpDown, ArrowUp, ArrowDown, Search, Coins, Trophy, X, Check, Loader2,
} from 'lucide-react'
import { Layout } from '@/components/Layout'
import { LeaderboardChart } from '@/components/LeaderboardChart'
import { PointsTrendChart } from '@/components/PointsTrendChart'
import { Spotlight } from '@/components/ui/spotlight'
import { useMe, useHall, useHallStats, useHallMembers, useHallRecords, useHallGames, useTrendData } from '@/hooks'
import { api, groupRecordsByGame } from '@/api'
import { cn } from '@/lib/cn'
import type { HallRecordEntry, UserSearchResult } from '@/types'

type Tab = 'dashboard' | 'table' | 'games' | 'members'

const TABS: { key: Tab; icon: React.ElementType }[] = [
  { key: 'dashboard', icon: LayoutDashboard },
  { key: 'table',     icon: Table2 },
  { key: 'games',     icon: Gamepad2 },
  { key: 'members',   icon: UserPlus },
]

const TREND_COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f43f5e', '#f59e0b', '#a855f7', '#ec4899']

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function Loading() {
  return <p className="py-8 text-center text-sm text-[var(--fg-muted)]">Loading…</p>
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────

function InviteModal({ hallId, onClose }: { hallId: number; onClose: () => void }) {
  const [query, setQuery]           = useState('')
  const [results, setResults]       = useState<UserSearchResult[]>([])
  const [searching, setSearching]   = useState(false)
  const [invited, setInvited]       = useState<Set<number>>(new Set())
  const [inviting, setInviting]     = useState<number | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setResults([])
    try {
      const data = await api.searchUsers(query.trim())
      setResults(data)
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  async function handleInvite(userId: number) {
    setInviting(userId)
    setInviteError(null)
    try {
      await api.inviteUser(hallId, userId)
      setInvited(prev => new Set(prev).add(userId))
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invite.')
    } finally {
      setInviting(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />

        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-violet-400" />
            <h2 className="font-semibold text-[var(--fg)]">Invite User</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-surface-2)] text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--fg-muted)]" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by name or email…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)] text-sm text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-violet-500/50 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={searching || !query.trim()}
              className="px-4 py-2.5 rounded-xl bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
            </button>
          </form>

          {inviteError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">{inviteError}</p>
          )}

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {results.length === 0 && !searching && query && (
              <p className="text-sm text-center text-[var(--fg-muted)] py-6">No users found.</p>
            )}
            {results.map(user => {
              const isInvited = invited.has(user.id)
              const isInviting = inviting === user.id
              return (
                <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)]">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/30 to-cyan-500/30 text-sm font-bold text-[var(--fg)]">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-[var(--fg)] truncate">{user.name}</p>
                    <p className="text-xs text-[var(--fg-muted)] truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => handleInvite(user.id)}
                    disabled={isInvited || isInviting}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0',
                      isInvited
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default'
                        : 'bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 disabled:opacity-50'
                    )}
                  >
                    {isInviting ? <Loader2 className="h-3 w-3 animate-spin" /> : isInvited ? <Check className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
                    {isInvited ? 'Invited' : 'Invite'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

function DashboardTab({ hallId }: { hallId: number }) {
  const { t } = useTranslation()
  const statsState = useHallStats(hallId)
  const trendState = useTrendData(hallId)

  const leaderboardData = useMemo(() => {
    if (statsState.status !== 'ok') return []
    return statsState.data.leaderboard.map(e => ({
      name: e.name.split(' ')[0],
      points: e.points,
    }))
  }, [statsState])

  const { trendData, trendLines } = useMemo(() => {
    if (trendState.status !== 'ok') return { trendData: [], trendLines: [] }
    const { rows, userMap } = trendState.data
    const keys = new Set<string>()
    for (const row of rows) {
      for (const k of Object.keys(row)) {
        if (k !== 'date' && k !== '_label') keys.add(k)
      }
    }
    const lines = Array.from(keys).map((key, i) => ({
      key,
      color: TREND_COLORS[i % TREND_COLORS.length],
      name: userMap.get(key) ?? key,
    }))
    return { trendData: rows, trendLines: lines }
  }, [trendState])

  const recentGames = statsState.status === 'ok' ? statsState.data.recent_games : []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6">
          <h3 className="text-base font-semibold text-[var(--fg)] mb-4">{t('hall.leaderboard')}</h3>
          {statsState.status === 'loading' ? <Loading /> : <LeaderboardChart data={leaderboardData} height={260} />}
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6">
          <h3 className="text-base font-semibold text-[var(--fg)] mb-4">{t('hall.pointsTrend')}</h3>
          {trendState.status === 'loading' ? <Loading /> : (
            <PointsTrendChart
              data={trendData.length ? trendData : [{ date: '–' }]}
              lines={trendLines}
              height={260}
              showLegend
            />
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-[var(--fg)]">{t('hall.recentGames')}</h3>
          <Link to="?tab=games" className="text-sm text-violet-400 hover:text-violet-300">View all →</Link>
        </div>
        {statsState.status === 'loading' ? <Loading /> : (
          <div className="space-y-3">
            {recentGames.slice(0, 4).map(game => (
              <Link key={game.id} to={`/halls/${hallId}/games/${game.id}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--bg-surface-2)] transition-colors group">
                <div>
                  <p className="font-medium text-[var(--fg)] group-hover:text-violet-400 transition-colors">{game.game_name}</p>
                  <p className="text-xs text-[var(--fg-muted)]">{formatDate(game.played_at)} · {formatTime(game.played_at)}</p>
                </div>
                <ChevronLeft className="h-4 w-4 rotate-180 text-[var(--fg-muted)] group-hover:text-violet-400 transition-colors" />
              </Link>
            ))}
            {recentGames.length === 0 && (
              <p className="text-sm text-[var(--fg-muted)] text-center py-4">{t('table.noGames')}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Table Tab ────────────────────────────────────────────────────────────────

function TableTab({ hallId }: { hallId: number }) {
  const { t } = useTranslation()
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const recordsState = useHallRecords(hallId)

  // Group flat records into game rows (preserves played_at DESC order from backend)
  const gameRows = useMemo(() => {
    if (recordsState.status !== 'ok') return []
    const records = recordsState.data
    const seen = new Set<number>()
    const order: number[] = []
    const map = new Map<number, HallRecordEntry[]>()
    for (const r of records) {
      if (!seen.has(r.game_id)) { seen.add(r.game_id); order.push(r.game_id) }
      const arr = map.get(r.game_id) ?? []
      arr.push(r)
      map.set(r.game_id, arr)
    }
    return order.map(gid => ({ meta: map.get(gid)![0], results: map.get(gid)! }))
  }, [recordsState])

  const filtered = useMemo(() => {
    let rows = gameRows
    if (searchQuery) {
      rows = rows.filter(r => r.meta.game_name.toLowerCase().includes(searchQuery.toLowerCase()))
    }
    return sortDir === 'desc' ? rows : [...rows].reverse()
  }, [gameRows, searchQuery, sortDir])

  return (
    <div className="space-y-4">
      {/* Search + sort bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--fg-muted)]" />
          <input
            type="text"
            placeholder={t('common.search') + '…'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-sm text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-violet-500/50 transition-all"
          />
        </div>
        <button
          onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-sm font-medium text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
        >
          {sortDir === 'desc'
            ? <ArrowDown className="h-4 w-4" />
            : <ArrowUp className="h-4 w-4" />
          }
          {t('common.sort')}
        </button>
      </div>

      {recordsState.status === 'loading' && <Loading />}
      {recordsState.status === 'error' && (
        <p className="text-center py-8 text-red-400">{recordsState.error.message}</p>
      )}

      {recordsState.status === 'ok' && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-5 py-4 font-medium text-[var(--fg-muted)]">
                  <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}>
                    {t('table.game')} <ArrowUpDown className="h-3.5 w-3.5" />
                  </div>
                </th>
                <th className="text-left px-5 py-4 font-medium text-[var(--fg-muted)]">{t('table.date')}</th>
                <th className="text-left px-5 py-4 font-medium text-[var(--fg-muted)]">{t('table.results')}</th>
                <th className="text-right px-5 py-4 font-medium text-[var(--fg-muted)]">{t('table.rate')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ meta, results }) => (
                <tr key={meta.game_id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-surface-2)] transition-colors">
                  <td className="px-5 py-4">
                    <Link
                      to={`/halls/${hallId}/games/${meta.game_id}`}
                      className="font-medium text-[var(--fg)] hover:text-violet-400 transition-colors"
                    >
                      {meta.game_name}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-[var(--fg-muted)]">
                    <div>{formatDate(meta.played_at)}</div>
                    <div className="text-xs">{formatTime(meta.played_at)}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5">
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
                          {r.user_name.split(' ')[0]} {r.points >= 0 ? '+' : ''}{r.points}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right text-[var(--fg-muted)]">×{meta.point_conversion_rate}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-[var(--fg-muted)]">{t('table.noGames')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Games Tab ────────────────────────────────────────────────────────────────

function GamesTab({ hallId }: { hallId: number }) {
  const { t } = useTranslation()
  const gamesState  = useHallGames(hallId)
  const recordsState = useHallRecords(hallId)

  const gameResultsMap = useMemo(() => {
    if (recordsState.status !== 'ok') return new Map()
    return groupRecordsByGame(recordsState.data)
  }, [recordsState])

  const allGames = gamesState.status === 'ok'
    ? [...gamesState.data].sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime())
    : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--fg-muted)]">{allGames.length} games total</p>
        <Link
          to={`/halls/${hallId}/games/new`}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 transition-all shadow-lg shadow-violet-500/20"
        >
          <Plus className="h-4 w-4" />
          {t('hall.addGame')}
        </Link>
      </div>

      {gamesState.status === 'loading' && <Loading />}
      {gamesState.status === 'error' && (
        <p className="text-center py-8 text-red-400">{gamesState.error.message}</p>
      )}

      <div className="space-y-3">
        {allGames.map((game, i) => {
          const results = [...(gameResultsMap.get(game.id) ?? [])].sort((a, b) => b.points - a.points)
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
                        {formatDate(game.played_at)} · {results.length} players
                        {game.description && ` · ${game.description}`}
                      </p>
                    </div>

                    {winner && (
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-[var(--fg-muted)]">Top scorer</p>
                        <p className="font-semibold text-[var(--fg)]">{winner.user_name.split(' ')[0]}</p>
                        <p className="text-emerald-400 font-bold text-sm">+{winner.points}</p>
                      </div>
                    )}
                  </div>

                  {results.length > 0 && (
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
                          {r.user_name.split(' ')[0]} {r.points >= 0 ? '+' : ''}{r.points}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Members Tab ──────────────────────────────────────────────────────────────

function MembersTab({ hallId, canManage }: { hallId: number; canManage: boolean }) {
  const { t } = useTranslation()
  const state = useHallMembers(hallId)
  const [actionPending, setActionPending] = useState<number | null>(null)
  const [roleOverrides, setRoleOverrides] = useState<Map<number, 'admin' | 'member'>>(new Map())
  const [actionError, setActionError]     = useState<string | null>(null)

  const sorted = useMemo(() => {
    if (state.status !== 'ok') return []
    return [...state.data].sort((a, b) => b.member.points - a.member.points)
  }, [state])

  async function handlePromote(userId: number) {
    setActionPending(userId)
    setActionError(null)
    try {
      await api.promoteUser(hallId, userId)
      setRoleOverrides(prev => new Map(prev).set(userId, 'admin'))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to promote user.')
    } finally {
      setActionPending(null)
    }
  }

  async function handleDemote(userId: number) {
    setActionPending(userId)
    setActionError(null)
    try {
      await api.demoteUser(hallId, userId)
      setRoleOverrides(prev => new Map(prev).set(userId, 'member'))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to demote user.')
    } finally {
      setActionPending(null)
    }
  }

  return (
    <div className="space-y-3">
      {state.status === 'loading' && <Loading />}
      {state.status === 'error' && (
        <p className="text-center py-8 text-red-400">{state.error.message}</p>
      )}
      {actionError && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">{actionError}</p>
      )}
      {sorted.map(({ member, name }, i) => {
        const effectiveRole = roleOverrides.get(member.user_id) ?? member.role
        const isAdmin = effectiveRole === 'admin'
        const isPending = actionPending === member.user_id
        return (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 hover:bg-[var(--bg-surface-2)] transition-all"
          >
            <span className="w-7 text-center text-base">
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
            </span>
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/30 to-cyan-500/30 text-sm font-bold text-[var(--fg)]">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-[var(--fg)] truncate">{name}</p>
                {isAdmin && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-400 flex-shrink-0">
                    <Crown className="h-3 w-3" />
                    {t('halls.role.admin')}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--fg-muted)]">
                {t('hall.rank')} #{i + 1} · Joined {new Date(member.joined_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canManage && !isAdmin && (
                <button
                  onClick={() => handlePromote(member.user_id)}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 disabled:opacity-50 transition-all flex-shrink-0"
                >
                  {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Crown className="h-3 w-3" />}
                  Make Admin
                </button>
              )}
              {canManage && isAdmin && (
                <button
                  onClick={() => handleDemote(member.user_id)}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-surface-2)] text-[var(--fg-muted)] border border-[var(--border)] hover:text-red-400 hover:border-red-500/30 disabled:opacity-50 transition-all flex-shrink-0"
                >
                  {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Crown className="h-3 w-3" />}
                  Revoke Admin
                </button>
              )}
              <div className="text-right flex-shrink-0">
                <p className={cn('text-xl font-black', member.points >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {member.points >= 0 ? '+' : ''}{member.points.toFixed(1)}
                </p>
                <p className="text-xs text-[var(--fg-muted)]">{t('hall.points')}</p>
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function HallDetail() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab') as Tab | null
  const VALID_TABS: Tab[] = ['dashboard', 'table', 'games', 'members']
  const [activeTab, setActiveTab] = useState<Tab>(
    tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'dashboard'
  )
  const [inviteOpen, setInviteOpen] = useState(false)

  function switchTab(tab: Tab) {
    setActiveTab(tab)
    setSearchParams(tab === 'dashboard' ? {} : { tab }, { replace: true })
  }

  const hallId = Number(id)
  const meState      = useMe()
  const hallState    = useHall(hallId)
  const membersState = useHallMembers(hallId)

  const hall = hallState.status === 'ok' ? hallState.data : null
  const memberCount = membersState.status === 'ok' ? membersState.data.length : '…'

  const currentUserId   = meState.status === 'ok' ? meState.data.id : null
  const isServerAdmin   = meState.status === 'ok' && !!meState.data.is_server_admin
  const isHallAdmin     = membersState.status === 'ok'
    && membersState.data.some(m => m.member.user_id === currentUserId && m.member.role === 'admin')
  const canManage = isServerAdmin || isHallAdmin

  if (hallState.status === 'error') {
    return <Layout><p className="text-center py-12 text-red-400">{hallState.error.message}</p></Layout>
  }

  return (
    <Layout>
      <AnimatePresence>
        {inviteOpen && <InviteModal hallId={hallId} onClose={() => setInviteOpen(false)} />}
      </AnimatePresence>
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
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/8 via-transparent to-cyan-500/8 pointer-events-none" />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />

              <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                    <Trophy className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-[var(--fg)]">{hall?.name ?? '…'}</h1>
                    {hall?.description && (
                      <p className="text-[var(--fg-muted)] text-sm">{hall.description}</p>
                    )}
                    <p className="text-xs text-[var(--fg-muted)] mt-1">{memberCount} members</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)] text-sm font-medium transition-all">
                    <Coins className="h-4 w-4" />
                    {t('hall.chipInOut')}
                  </button>
                  {canManage && (
                    <button
                      onClick={() => setInviteOpen(true)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)] text-sm font-medium transition-all"
                    >
                      <UserPlus className="h-4 w-4" />
                      {t('hall.inviteUser')}
                    </button>
                  )}
                  <Link
                    to={`/halls/${hallId}/games/new`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 transition-all shadow-lg shadow-violet-500/20"
                  >
                    <Plus className="h-4 w-4" />
                    {t('hall.addGame')}
                  </Link>
                </div>
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
                onClick={() => switchTab(tab.key)}
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
            {activeTab === 'dashboard' && <DashboardTab hallId={hallId} />}
            {activeTab === 'table'     && <TableTab hallId={hallId} />}
            {activeTab === 'games'     && <GamesTab hallId={hallId} />}
            {activeTab === 'members'   && <MembersTab hallId={hallId} canManage={canManage} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </Layout>
  )
}
