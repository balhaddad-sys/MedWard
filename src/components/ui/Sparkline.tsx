import { clsx } from 'clsx'

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  className?: string
  showDots?: boolean
  referenceMin?: number
  referenceMax?: number
}

export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = '#3b82f6',
  className,
  showDots = false,
  referenceMin,
  referenceMax,
}: SparklineProps) {
  if (data.length < 2) return null

  const padding = 2
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data.map((value, i) => {
    const x = padding + (i / (data.length - 1)) * (width - 2 * padding)
    const y = height - padding - ((value - min) / range) * (height - 2 * padding)
    return { x, y, value }
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={clsx('inline-block', className)}
    >
      {referenceMin !== undefined && (
        <line
          x1={padding}
          x2={width - padding}
          y1={height - padding - ((referenceMin - min) / range) * (height - 2 * padding)}
          y2={height - padding - ((referenceMin - min) / range) * (height - 2 * padding)}
          stroke="#e5e7eb"
          strokeWidth={0.5}
          strokeDasharray="2,2"
        />
      )}
      {referenceMax !== undefined && (
        <line
          x1={padding}
          x2={width - padding}
          y1={height - padding - ((referenceMax - min) / range) * (height - 2 * padding)}
          y2={height - padding - ((referenceMax - min) / range) * (height - 2 * padding)}
          stroke="#e5e7eb"
          strokeWidth={0.5}
          strokeDasharray="2,2"
        />
      )}
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {showDots &&
        points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={1.5} fill={color} />
        ))}
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={2} fill={color} />
    </svg>
  )
}
