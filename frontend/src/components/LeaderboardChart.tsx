import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import { useTheme } from '@/contexts/ThemeContext'

interface LeaderboardEntry {
  name: string
  points: number
}

interface LeaderboardChartProps {
  data: LeaderboardEntry[]
  height?: number
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) => {
  if (!active || !payload?.length) return null
  const val = payload[0].value
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 shadow-xl">
      <p className="text-sm font-medium text-[var(--fg)]">{label}</p>
      <p className={`text-lg font-bold ${val >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {val >= 0 ? '+' : ''}{val} pts
      </p>
    </div>
  )
}

export function LeaderboardChart({ data, height = 280 }: LeaderboardChartProps) {
  const { theme } = useTheme()
  const gridColor = theme === 'dark' ? '#27272a' : '#e4e4e7'
  const textColor = theme === 'dark' ? '#71717a' : '#71717a'

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: textColor, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={['dataMin - 100', 'dataMax + 100']}
          tick={{ fill: textColor, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `${v > 0 ? '+' : ''}${v}`}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={0} stroke={gridColor} strokeWidth={2} />
        <Bar dataKey="points" radius={[6, 6, 0, 0]} maxBarSize={60}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.points >= 0
                ? 'url(#positiveGradient)'
                : 'url(#negativeGradient)'
              }
            />
          ))}
        </Bar>
        <defs>
          <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.7} />
          </linearGradient>
          <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.7} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.9} />
          </linearGradient>
        </defs>
      </BarChart>
    </ResponsiveContainer>
  )
}
