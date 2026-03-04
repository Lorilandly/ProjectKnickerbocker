import { motion } from 'framer-motion'
import { Bell, Check, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '@/api'
import { useMyInvites } from '@/hooks'
import { Layout } from '@/components/Layout'

export function InvitesPage() {
  const { t } = useTranslation()
  const state = useMyInvites()

  function handleAction(id: number, action: 'accept' | 'decline') {
    const fn = action === 'accept' ? api.acceptInvite : api.declineInvite
    fn(id).then(() => window.location.reload())
  }

  return (
    <Layout>
      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-[var(--fg)]">{t('nav.invites')}</h1>
          <p className="mt-1 text-[var(--fg-muted)]">Hall invitations awaiting your response</p>
        </motion.div>

        {state.status === 'loading' && (
          <p className="text-center py-8 text-[var(--fg-muted)]">{t('common.loading')}</p>
        )}
        {state.status === 'error' && (
          <p className="text-center py-8 text-red-400">{state.error.message}</p>
        )}
        {state.status === 'ok' && state.data.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 text-[var(--fg-muted)]"
          >
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No pending invites</p>
          </motion.div>
        )}
        {state.status === 'ok' && (
          <div className="grid gap-4 sm:grid-cols-2">
            {state.data.map(({ invite, hallName }, i) => (
              <motion.div
                key={invite.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6"
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-[var(--fg-muted)] mb-1">You have been invited to</p>
                    <h3 className="text-xl font-bold text-[var(--fg)]">{hallName}</h3>
                    <p className="mt-1 text-xs text-[var(--fg-muted)]">
                      Invited {new Date(invite.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleAction(invite.id, 'accept')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    <Check className="h-4 w-4" />
                    {t('dashboard.accept')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(invite.id, 'decline')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--fg-muted)] text-sm font-medium hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-all"
                  >
                    <X className="h-4 w-4" />
                    {t('dashboard.decline')}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
