import { useMemo } from 'react'
import type { LabPanel } from '@/types'

interface LabTrendChartProps {
  panels: LabPanel[]
  testName: string
  className?: string
}

export function LabTrendChart({ panels, testName, className = '' }: LabTrendChartProps) {
  const dataPoints = useMemo(() => {
    const points: { date: Date; value: number; flag?: string }[] = []

    for (const panel of panels) {
      const test = panel.values.find((v) => v.name === testName)
      if (test?.value) {
        const numValue = parseFloat(test.value.toString())
        if (!isNaN(numValue)) {
          const date = panel.collectedAt
            ? typeof panel.collectedAt === 'string'
              ? new Date(panel.collectedAt)
              : (panel.collectedAt as any).toDate
              ? (panel.collectedAt as any).toDate()
              : new Date()
            : new Date()
          points.push({
            date,
            value: numValue,
            flag: test.flag,
          })
        }
      }
    }

    return points.sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [panels, testName])

  if (dataPoints.length < 2) return null

  const minValue = Math.min(...dataPoints.map((p) => p.value))
  const maxValue = Math.max(...dataPoints.map((p) => p.value))
  const range = maxValue - minValue || 1

  const points = dataPoints.map((point, i) => {
    const x = (i / (dataPoints.length - 1)) * 100
    const y = 100 - ((point.value - minValue) / range) * 100
    return { x, y, ...point }
  })

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox="0 0 100 40"
        className="w-full h-12"
        preserveAspectRatio="none"
      >
        {/* Grid lines */}
        <line x1="0" y1="20" x2="100" y2="20" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />

        {/* Trend line */}
        <path
          d={pathData}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary-500"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((point, i) => {
          const isCritical = point.flag?.includes('critical')
          const isAbnormal = point.flag && point.flag !== 'normal'

          return (
            <g key={i}>
              <circle
                cx={point.x}
                cy={point.y}
                r="2"
                className={
                  isCritical
                    ? 'fill-red-500'
                    : isAbnormal
                    ? 'fill-amber-500'
                    : 'fill-primary-500'
                }
              />
              {isCritical && (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="3"
                  className="fill-none stroke-red-500"
                  strokeWidth="1"
                >
                  <animate
                    attributeName="r"
                    from="2"
                    to="5"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    from="1"
                    to="0"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
            </g>
          )
        })}
      </svg>

      {/* Value labels */}
      <div className="flex justify-between text-[10px] text-ward-muted mt-1">
        <span>{dataPoints[0]?.value.toFixed(1)}</span>
        <span className="font-semibold text-ward-text">{dataPoints[dataPoints.length - 1]?.value.toFixed(1)}</span>
      </div>
    </div>
  )
}

interface LabSparklineProps {
  panels: LabPanel[]
  testName: string
  width?: number
  height?: number
  className?: string
}

export function LabSparkline({ panels, testName, width = 60, height = 24, className = '' }: LabSparklineProps) {
  const dataPoints = useMemo(() => {
    const points: number[] = []

    for (const panel of panels.slice().reverse()) {
      const test = panel.values.find((v) => v.name === testName)
      if (test?.value) {
        const numValue = parseFloat(test.value.toString())
        if (!isNaN(numValue)) {
          points.push(numValue)
        }
      }
    }

    return points.slice(-10) // Last 10 data points
  }, [panels, testName])

  if (dataPoints.length < 2) return null

  const minValue = Math.min(...dataPoints)
  const maxValue = Math.max(...dataPoints)
  const range = maxValue - minValue || 1

  const points = dataPoints.map((value, i) => {
    const x = (i / (dataPoints.length - 1)) * width
    const y = height - ((value - minValue) / range) * height
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ')

  const trend = dataPoints[dataPoints.length - 1] - dataPoints[0]
  const trendColor = trend > 0 ? 'text-red-400' : trend < 0 ? 'text-green-400' : 'text-slate-400'

  return (
    <svg
      width={width}
      height={height}
      className={`inline-block ${trendColor} ${className}`}
      viewBox={`0 0 ${width} ${height}`}
    >
      <path
        d={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
