import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Search, Trophy, Users, ChevronRight, Plus, X } from 'lucide-react'
import { Layout } from '@/components/Layout'
import { api } from '@/api'
import { useHalls, useApi } from '@/hooks'
import { cn } from '@/lib/cn'

function CreateHallModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      await api.createHall({ name: name.trim(), description: description.trim() || undefined })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create hall')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-2xl"
      >
        <div className="absolute top-0 left-0 right-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-[var(--fg)]">Create Hall</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-surface-2)] transition-all">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--fg-muted)] mb-1.5">
              Hall Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Friday Night Poker"
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)] text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--fg-muted)] mb-1.5">
              Description <span className="text-[var(--fg-muted)] font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Short description of the hall…"
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)] text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 transition-all text-sm resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-surface-2)] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/20"
            >
              {loading ? 'Creating…' : 'Create Hall'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export function HallList() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const hallsState = useHalls()
  const meState = useApi(() => api.getMe())

  const isServerAdmin = meState.status === 'ok' && meState.data.is_server_admin

  const halls = hallsState.status === 'ok' ? hallsState.data : []
  const filtered = halls.filter(h =>
    h.name.toLowerCase().includes(search.toLowerCase())
  )

  function handleCreated() {
    setShowCreate(false)
    window.location.reload()
  }

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
            <h1 className="text-3xl font-bold text-[var(--fg)]">{t('halls.title')}</h1>
            <p className="text-[var(--fg-muted)] mt-1">
              {hallsState.status === 'ok' ? `${halls.length} halls you're a member of` : t('common.loading')}
            </p>
          </div>

          {isServerAdmin && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500 text-white font-medium text-sm hover:bg-violet-600 transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              {t('halls.createHall')}
            </button>
          )}
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--fg-muted)]" />
          <input
            type="text"
            placeholder={t('common.search') + ' halls...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 transition-all"
          />
        </motion.div>

        {hallsState.status === 'error' && (
          <p className="text-center py-8 text-red-400">{hallsState.error.message}</p>
        )}

        {/* Hall cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((hall, i) => (
            <motion.div
              key={hall.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
            >
              <Link to={`/halls/${hall.id}`} className="block group">
                <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 transition-all duration-300 hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/5">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/20">
                          <Trophy className="h-6 w-6 text-violet-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-[var(--fg)] text-lg leading-tight">{hall.name}</h3>
                          {hall.description && (
                            <p className="text-xs text-[var(--fg-muted)]">{hall.description}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-[var(--fg-muted)]">
                        Created {new Date(hall.created_at).toLocaleDateString()}
                      </p>
                      <div className="flex items-center gap-1 text-sm font-medium text-violet-400 group-hover:text-violet-300 transition-colors">
                        {t('halls.viewHall')}
                        <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && hallsState.status === 'ok' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 text-[var(--fg-muted)]"
          >
            <Users className={cn('h-12 w-12 mx-auto mb-3 opacity-30')} />
            <p className="text-lg font-medium">{search ? 'No halls match your search' : t('halls.noHalls')}</p>
          </motion.div>
        )}

      </div>

      <AnimatePresence>
        {showCreate && (
          <CreateHallModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
        )}
      </AnimatePresence>
    </Layout>
  )
}
