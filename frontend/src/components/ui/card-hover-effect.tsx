import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/cn'

interface Item {
  title: string
  description: string
  link?: string
}

interface HoverEffectProps {
  items: Item[]
  className?: string
  renderItem?: (item: Item, index: number) => React.ReactNode
}

export function HoverEffect({ items, className, renderItem }: HoverEffectProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      {items.map((item, idx) => (
        <div
          key={idx}
          className="relative group block p-2 h-full w-full cursor-pointer"
          onMouseEnter={() => setHoveredIndex(idx)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <AnimatePresence>
            {hoveredIndex === idx && (
              <motion.span
                className="absolute inset-0 h-full w-full bg-violet-500/10 dark:bg-violet-500/10 block rounded-2xl"
                layoutId="hoverBackground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.15 } }}
                exit={{ opacity: 0, transition: { duration: 0.15, delay: 0.2 } }}
              />
            )}
          </AnimatePresence>
          {renderItem ? renderItem(item, idx) : (
            <div className="rounded-2xl h-full w-full p-4 overflow-hidden bg-[var(--bg-surface)] border border-[var(--border)] relative z-20">
              <h3 className="font-bold text-[var(--fg)] text-lg">{item.title}</h3>
              <p className="text-[var(--fg-muted)] text-sm mt-1">{item.description}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
