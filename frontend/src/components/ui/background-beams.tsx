import { useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'

export function BackgroundBeams({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const beams = Array.from({ length: 12 }, (_, i) => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      length: Math.random() * 300 + 100,
      angle: (i / 12) * Math.PI * 2,
      opacity: Math.random() * 0.3 + 0.1,
      hue: Math.random() > 0.5 ? 270 : 190,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      beams.forEach(beam => {
        beam.x += beam.vx
        beam.y += beam.vy
        beam.angle += 0.002

        if (beam.x < -beam.length) beam.x = canvas.width + beam.length
        if (beam.x > canvas.width + beam.length) beam.x = -beam.length
        if (beam.y < -beam.length) beam.y = canvas.height + beam.length
        if (beam.y > canvas.height + beam.length) beam.y = -beam.length

        const x2 = beam.x + Math.cos(beam.angle) * beam.length
        const y2 = beam.y + Math.sin(beam.angle) * beam.length

        const gradient = ctx.createLinearGradient(beam.x, beam.y, x2, y2)
        gradient.addColorStop(0, `hsla(${beam.hue}, 80%, 65%, 0)`)
        gradient.addColorStop(0.5, `hsla(${beam.hue}, 80%, 65%, ${beam.opacity})`)
        gradient.addColorStop(1, `hsla(${beam.hue}, 80%, 65%, 0)`)

        ctx.beginPath()
        ctx.strokeStyle = gradient
        ctx.lineWidth = 1.5
        ctx.moveTo(beam.x, beam.y)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      })

      animationId = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={cn('pointer-events-none absolute inset-0 z-0', className)}
    />
  )
}
