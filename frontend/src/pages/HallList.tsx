import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Search, Trophy, Users, Crown, ChevronRight } from 'lucide-react'
import { Layout } from '@/components/Layout'
import { useHalls } from '@/hooks'
import { cn } from '@/lib/cn'

export function HallList() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const state = useHalls()

  const halls = state.status === 'ok' ? state.data : []
  const filtered = halls.filter(h =>
    h.name.toLowerCase().includes(search.toLowerCase())
  )

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
              {state.status === 'ok' ? `${halls.length} halls you're a member of` : t('common.loading')}
            </p>
          </div>
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

        {state.status === 'error' && (
          <p className="text-center py-8 text-red-400">{state.error.message}</p>
        )}

        {/* Hall cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((hall, i) => (
            <motion.div
              key={hall.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
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

        {filtered.length === 0 && state.status === 'ok' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 text-[var(--fg-muted)]"
          >
            <Users className={cn('h-12 w-12 mx-auto mb-3 opacity-30')} />
            <p className="text-lg font-medium">{search ? 'No halls match your search' : t('halls.noHalls')}</p>
          </motion.div>
        )}

        {/* Suppress unused import warning */}
        {false && <Crown />}
      </div>
    </Layout>
  )
}
