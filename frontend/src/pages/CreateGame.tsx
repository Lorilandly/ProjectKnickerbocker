import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Plus, Trash2, Gamepad2 } from 'lucide-react'
import { Layout } from '@/components/Layout'
import { useHallMembers, useHall, useMe } from '@/hooks'
import { api } from '@/api'
import { cn } from '@/lib/cn'

interface ResultRow {
  user_id: number
  points: string
}

export function CreateGame() {
  const { hallId } = useParams<{ hallId: string }>()
  const navigate = useNavigate()
  const id = Number(hallId)

  const hallState    = useHall(id)
  const membersState = useHallMembers(id)
  const meState      = useMe()
  const members      = membersState.status === 'ok' ? membersState.data : []

  const currentUserId = meState.status === 'ok' ? meState.data.id : null
  const isServerAdmin = meState.status === 'ok' && !!meState.data.is_server_admin
  const isHallAdmin   = membersState.status === 'ok'
    && membersState.data.some(m => m.member.user_id === currentUserId && m.member.role === 'admin')
  const canManage = isServerAdmin || isHallAdmin

  useEffect(() => {
    if (meState.status === 'ok' && membersState.status === 'ok' && !canManage) {
      navigate(`/halls/${id}`, { replace: true })
    }
  }, [meState.status, membersState.status, canManage, navigate, id])

  const [name, setName]               = useState('')
  const [description, setDescription] = useState('')
  const [rate, setRate]               = useState('1')
  const [playedAt, setPlayedAt]       = useState(() => {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
  })
  const [results, setResults]         = useState<ResultRow[]>([{ user_id: 0, points: '' }])
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const hallName = hallState.status === 'ok' ? hallState.data.name : '…'

  const usedIds = new Set(results.map(r => r.user_id).filter(Boolean))

  function addRow() {
    setResults(prev => [...prev, { user_id: 0, points: '' }])
  }

  function removeRow(i: number) {
    setResults(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateRow(i: number, field: keyof ResultRow, value: string) {
    setResults(prev => prev.map((r, idx) =>
      idx === i ? { ...r, [field]: field === 'user_id' ? Number(value) : value } : r
    ))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const validResults = results.filter(r => r.user_id && r.points !== '')
    if (!name.trim()) { setError('Game name is required.'); return }
    if (validResults.length === 0) { setError('At least one player result is required.'); return }

    const parsed = validResults.map(r => ({ user_id: r.user_id, points: parseFloat(r.points) }))
    if (parsed.some(r => isNaN(r.points))) { setError('All point values must be numbers.'); return }

    setSubmitting(true)
    try {
      await api.createGame(id, {
        name: name.trim(),
        description: description.trim() || undefined,
        point_conversion_rate: parseFloat(rate) || 1,
        played_at: new Date(playedAt).toISOString(),
        results: parsed,
      })
      navigate(`/halls/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game.')
      setSubmitting(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-[var(--fg-muted)]">
          <Link to="/halls" className="hover:text-[var(--fg)] transition-colors">Halls</Link>
          <span>/</span>
          <Link to={`/halls/${id}`} className="hover:text-[var(--fg)] transition-colors">{hallName}</Link>
          <span>/</span>
          <span className="text-[var(--fg)]">Add Game</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-cyan-500/5 pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />

          <div className="relative flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Gamepad2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--fg)]">Add Game</h1>
              <p className="text-sm text-[var(--fg-muted)]">{hallName}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="relative space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">
                Game Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Friday Night Poker"
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)] text-[var(--fg)] placeholder:text-[var(--fg-muted)] text-sm focus:outline-none focus:border-violet-500/60 transition-all"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">
                Description <span className="text-[var(--fg-muted)] font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Final table, buy-in 100"
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)] text-[var(--fg)] placeholder:text-[var(--fg-muted)] text-sm focus:outline-none focus:border-violet-500/60 transition-all"
              />
            </div>

            {/* Rate + Date row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">
                  Conversion Rate
                </label>
                <input
                  type="number"
                  value={rate}
                  onChange={e => setRate(e.target.value)}
                  min="0.01"
                  step="0.01"
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)] text-[var(--fg)] text-sm focus:outline-none focus:border-violet-500/60 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">
                  Played At
                </label>
                <input
                  type="datetime-local"
                  value={playedAt}
                  onChange={e => setPlayedAt(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)] text-[var(--fg)] text-sm focus:outline-none focus:border-violet-500/60 transition-all"
                />
              </div>
            </div>

            {/* Results */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-[var(--fg)]">
                  Player Results <span className="text-red-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={addRow}
                  className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add player
                </button>
              </div>

              {membersState.status === 'loading' && (
                <p className="text-sm text-[var(--fg-muted)] py-2">Loading members…</p>
              )}

              <div className="space-y-2">
                {results.map((row, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <select
                      value={row.user_id}
                      onChange={e => updateRow(i, 'user_id', e.target.value)}
                      className="flex-1 px-3 py-2.5 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)] text-[var(--fg)] text-sm focus:outline-none focus:border-violet-500/60 transition-all"
                    >
                      <option value={0} disabled>Select player…</option>
                      {members.map(({ member, name: mName }) => (
                        <option
                          key={member.user_id}
                          value={member.user_id}
                          disabled={usedIds.has(member.user_id) && member.user_id !== row.user_id}
                        >
                          {mName}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      value={row.points}
                      onChange={e => updateRow(i, 'points', e.target.value)}
                      placeholder="Points"
                      step="any"
                      className="w-28 px-3 py-2.5 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)] text-[var(--fg)] text-sm focus:outline-none focus:border-violet-500/60 transition-all"
                    />

                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      disabled={results.length === 1}
                      className={cn(
                        'p-2.5 rounded-xl border transition-colors',
                        results.length === 1
                          ? 'border-[var(--border)] text-[var(--fg-muted)] opacity-30 cursor-not-allowed'
                          : 'border-[var(--border)] text-[var(--fg-muted)] hover:border-red-500/40 hover:text-red-400'
                      )}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Link
                to={`/halls/${id}`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)] text-sm font-medium text-[var(--fg-muted)] hover:text-[var(--fg)] transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/20"
              >
                {submitting ? 'Saving…' : 'Save Game'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </Layout>
  )
}
