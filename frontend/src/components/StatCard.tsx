import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  trend?: { value: number; label: string }
  className?: string
  variant?: 'default' | 'positive' | 'negative' | 'accent'
  delay?: number
}

const variantStyles = {
  default: 'from-violet-500/10 to-cyan-500/10 border-violet-500/20',
  positive: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20',
  negative: 'from-red-500/10 to-rose-500/10 border-red-500/20',
  accent: 'from-amber-500/10 to-orange-500/10 border-amber-500/20',
}

const iconStyles = {
  default: 'bg-violet-500/20 text-violet-400',
  positive: 'bg-emerald-500/20 text-emerald-400',
  negative: 'bg-red-500/20 text-red-400',
  accent: 'bg-amber-500/20 text-amber-400',
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
  variant = 'default',
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6',
        'bg-[var(--bg-surface)]',
        variantStyles[variant],
        className
      )}
    >
      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-gradient-to-br opacity-50" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--fg-muted)]">{title}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-[var(--fg)]">
            {typeof value === 'number' && value > 0 ? '+' : ''}
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-xs text-[var(--fg-muted)]">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              'mt-2 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
              trend.value >= 0
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-red-500/10 text-red-400'
            )}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </div>
          )}
        </div>
        {icon && (
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', iconStyles[variant])}>
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  )
}
