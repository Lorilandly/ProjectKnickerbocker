import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { useTheme } from '@/contexts/ThemeContext'

interface PointsTrendChartProps {
  data: Array<Record<string, string | number>>
  lines: Array<{ key: string; color: string; name?: string }>
  height?: number
  showLegend?: boolean
}

const COLORS = ['#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#f43f5e']

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ dataKey: string; value: number; color: string; name: string; payload?: Record<string, string | number> }>
  label?: string
}) => {
  if (!active || !payload?.length) return null
  const gameLabel = (payload[0]?.payload?._label as string | undefined) ?? label
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 shadow-xl min-w-[140px]">
      <p className="text-xs font-medium text-[var(--fg-muted)] mb-2">{gameLabel}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            <span className="text-xs text-[var(--fg-muted)]">{p.name || p.dataKey}</span>
          </div>
          <span className={`text-sm font-bold ${p.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {p.value >= 0 ? '+' : ''}{p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export function PointsTrendChart({ data, lines, height = 280, showLegend = false }: PointsTrendChartProps) {
  const { theme } = useTheme()
  const gridColor = theme === 'dark' ? '#27272a' : '#e4e4e7'
  const textColor = theme === 'dark' ? '#71717a' : '#71717a'

  const labelMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const row of data) {
      if (typeof row.date === 'string' && typeof row._label === 'string') {
        m.set(row.date, row._label)
      }
    }
    return m
  }, [data])

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis
          dataKey="date"
          tick={{ fill: textColor, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: string) => labelMap.get(v) ?? v}
        />
        <YAxis
          domain={['auto', 'auto']}
          tick={{ fill: textColor, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `${v > 0 ? '+' : ''}${v}`}
        />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && <Legend />}
        <ReferenceLine y={0} stroke={gridColor} strokeWidth={1.5} strokeDasharray="4 4" />
        {lines.map((line, i) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.name || line.key}
            stroke={line.color || COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={{ fill: line.color || COLORS[i % COLORS.length], strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
