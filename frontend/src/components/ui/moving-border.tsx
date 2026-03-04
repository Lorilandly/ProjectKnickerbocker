import { useRef } from 'react'
import { motion, useAnimationFrame, useMotionTemplate, useMotionValue, useTransform } from 'framer-motion'
import { cn } from '@/lib/cn'

interface MovingBorderProps {
  children: React.ReactNode
  duration?: number
  className?: string
  containerClassName?: string
  as?: React.ElementType
}

export function MovingBorder({
  children,
  duration = 3000,
  className,
  containerClassName,
  as: Component = 'button',
}: MovingBorderProps) {
  const pathRef = useRef<SVGRectElement>(null)
  const progress = useMotionValue<number>(0)

  useAnimationFrame(time => {
    const length = pathRef.current?.getTotalLength()
    if (length) {
      const pxPerMs = length / duration
      progress.set((time * pxPerMs) % length)
    }
  })

  const x = useTransform(progress, val => pathRef.current?.getPointAtLength(val)?.x ?? 0)
  const y = useTransform(progress, val => pathRef.current?.getPointAtLength(val)?.y ?? 0)

  const transform = useMotionTemplate`translateX(${x}px) translateY(${y}px) translateX(-50%) translateY(-50%)`

  return (
    <Component className={cn('relative overflow-hidden p-[1px] rounded-xl', containerClassName)}>
      <div className="absolute inset-0">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="absolute h-full w-full"
          width="100%"
          height="100%"
        >
          <rect
            fill="none"
            width="100%"
            height="100%"
            rx="12"
            ry="12"
            ref={pathRef}
          />
        </svg>
        <motion.div
          style={{ transform }}
          className="absolute h-16 w-16 opacity-[0.8]"
        >
          <div className="h-full w-full rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.8)_0%,rgba(6,182,212,0.4)_50%,transparent_70%)]" />
        </motion.div>
      </div>
      <div className={cn('relative', className)}>{children}</div>
    </Component>
  )
}
