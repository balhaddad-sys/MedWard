import { useState, useRef, useCallback } from 'react'
import { clsx } from 'clsx'

interface SwipeAction {
  label: string
  icon?: React.ReactNode
  color: string
  onClick: () => void
}

interface SwipeableRowProps {
  children: React.ReactNode
  leftActions?: SwipeAction[]
  rightActions?: SwipeAction[]
  className?: string
  threshold?: number
}

const ACTION_WIDTH = 72

export function SwipeableRow({
  children,
  leftActions = [],
  rightActions = [],
  className,
  threshold = 40,
}: SwipeableRowProps) {
  const [offsetX, setOffsetX] = useState(0)
  const [isOpen, setIsOpen] = useState<'left' | 'right' | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const startXRef = useRef(0)
  const startOffsetRef = useRef(0)
  const isDraggingRef = useRef(false)
  const rowRef = useRef<HTMLDivElement>(null)

  const rightWidth = rightActions.length * ACTION_WIDTH
  const leftWidth = leftActions.length * ACTION_WIDTH

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX
    startOffsetRef.current = offsetX
    isDraggingRef.current = false
    setIsDragging(false)
  }, [offsetX])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const diff = e.touches[0].clientX - startXRef.current
    if (Math.abs(diff) > 8) {
      isDraggingRef.current = true
      setIsDragging(true)
    }
    if (!isDraggingRef.current) return

    let newOffset = startOffsetRef.current + diff

    // Clamp: allow left swipe up to rightWidth, right swipe up to leftWidth
    if (rightActions.length > 0) {
      newOffset = Math.max(-rightWidth, newOffset)
    } else {
      newOffset = Math.max(0, newOffset)
    }
    if (leftActions.length > 0) {
      newOffset = Math.min(leftWidth, newOffset)
    } else {
      newOffset = Math.min(0, newOffset)
    }

    setOffsetX(newOffset)
  }, [rightActions.length, leftActions.length, rightWidth, leftWidth])

  const handleTouchEnd = useCallback(() => {
    if (!isDraggingRef.current) return

    setIsDragging(false)

    // Snap open or closed based on threshold
    if (offsetX < -threshold && rightActions.length > 0) {
      setOffsetX(-rightWidth)
      setIsOpen('right')
    } else if (offsetX > threshold && leftActions.length > 0) {
      setOffsetX(leftWidth)
      setIsOpen('left')
    } else {
      setOffsetX(0)
      setIsOpen(null)
    }
  }, [offsetX, threshold, rightActions.length, leftActions.length, rightWidth, leftWidth])

  const close = useCallback(() => {
    setOffsetX(0)
    setIsOpen(null)
  }, [])

  const handleClick = useCallback(() => {
    // If actions are open, close them on tap instead of navigating
    if (isOpen) {
      close()
    }
  }, [isOpen, close])

  return (
    <div className={clsx('relative overflow-hidden rounded-lg', className)}>
      {/* Right actions (revealed on swipe left) */}
      {rightActions.length > 0 && (
        <div className="absolute inset-y-0 right-0 flex">
          {rightActions.map((action, i) => (
            <button
              key={i}
              onClick={() => {
                action.onClick()
                close()
              }}
              className={clsx(
                'flex flex-col items-center justify-center text-white text-[10px] font-semibold transition-colors touch',
                action.color
              )}
              style={{ width: ACTION_WIDTH }}
            >
              {action.icon}
              <span className="mt-0.5">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Left actions (revealed on swipe right) */}
      {leftActions.length > 0 && (
        <div className="absolute inset-y-0 left-0 flex">
          {leftActions.map((action, i) => (
            <button
              key={i}
              onClick={() => {
                action.onClick()
                close()
              }}
              className={clsx(
                'flex flex-col items-center justify-center text-white text-[10px] font-semibold transition-colors touch',
                action.color
              )}
              style={{ width: ACTION_WIDTH }}
            >
              {action.icon}
              <span className="mt-0.5">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main content */}
      <div
        ref={rowRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClickCapture={isOpen ? handleClick : undefined}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? 'none' : 'transform 0.25s ease-out',
        }}
        className="relative z-10"
      >
        {children}
      </div>
    </div>
  )
}
