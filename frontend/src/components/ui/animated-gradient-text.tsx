import { cn } from '@/lib/cn'

interface AnimatedGradientTextProps {
  children: React.ReactNode
  className?: string
}

export function AnimatedGradientText({ children, className }: AnimatedGradientTextProps) {
  return (
    <span
      className={cn(
        'inline-block bg-gradient-to-r from-violet-400 via-cyan-400 to-violet-400 bg-[length:200%_auto] bg-clip-text text-transparent animate-[shimmer_3s_linear_infinite]',
        className
      )}
      style={{
        backgroundImage: 'linear-gradient(90deg, #c4b5fd, #22d3ee, #a78bfa, #22d3ee, #c4b5fd)',
        backgroundSize: '200% auto',
        animation: 'shimmer 4s linear infinite',
      }}
    >
      {children}
    </span>
  )
}
