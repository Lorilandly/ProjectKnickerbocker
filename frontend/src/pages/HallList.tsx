import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Plus, Search, Trophy, Users, Crown, ChevronRight } from 'lucide-react'
import { Layout } from '@/components/Layout'
import { halls } from '@/data/dummy'
import { cn } from '@/lib/cn'

export function HallList() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')

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
            <p className="text-[var(--fg-muted)] mt-1">{halls.length} halls you're a member of</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500 text-white font-medium text-sm hover:bg-violet-600 transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 active:scale-95">
            <Plus className="h-4 w-4" />
            {t('halls.createHall')}
          </button>
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
                  {/* Hover glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Top line decoration */}
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="relative">
                    {/* Hall header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/20">
                          <Trophy className="h-6 w-6 text-violet-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-[var(--fg)] text-lg leading-tight">{hall.name}</h3>
                          <p className="text-xs text-[var(--fg-muted)]">{hall.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {hall.my_role === 'admin' && (
                          <span className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-400">
                            <Crown className="h-3 w-3" />
                            {t('halls.role.admin')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center p-2 rounded-lg bg-[var(--bg-surface-2)]">
                        <p className="text-xs text-[var(--fg-muted)]">{t('halls.myRank')}</p>
                        <p className="text-lg font-bold text-[var(--fg)]">#{hall.my_rank}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-[var(--bg-surface-2)]">
                        <p className="text-xs text-[var(--fg-muted)]">{t('halls.members')}</p>
                        <p className="text-lg font-bold text-[var(--fg)]">{hall.member_count}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-[var(--bg-surface-2)]">
                        <p className="text-xs text-[var(--fg-muted)]">{t('halls.games')}</p>
                        <p className="text-lg font-bold text-[var(--fg)]">{hall.game_count}</p>
                      </div>
                    </div>

                    {/* Points + CTA */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-[var(--fg-muted)]">{t('halls.myPoints')}</p>
                        <p className={cn(
                          'text-2xl font-black',
                          hall.my_points >= 0 ? 'text-emerald-400' : 'text-red-400'
                        )}>
                          {hall.my_points >= 0 ? '+' : ''}{hall.my_points}
                          <span className="text-sm font-normal ml-1 text-[var(--fg-muted)]">pts</span>
                        </p>
                      </div>
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

        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 text-[var(--fg-muted)]"
          >
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">{t('halls.noHalls')}</p>
          </motion.div>
        )}
      </div>
    </Layout>
  )
}
