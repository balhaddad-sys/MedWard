import { useCallback, useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
}

export function BottomSheet({ isOpen, onClose, children, title }: BottomSheetProps) {
  const [closing, setClosing] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef<number>(0)
  const touchCurrentY = useRef<number>(0)

  const handleClose = useCallback(() => {
    setClosing(true)
    setTimeout(() => {
      setClosing(false)
      onClose()
    }, 250)
  }, [onClose])

  // ESC key
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, handleClose])

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isOpen])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    touchCurrentY.current = e.touches[0].clientY
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentY.current = e.touches[0].clientY
    const delta = touchCurrentY.current - touchStartY.current
    if (delta > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${delta}px)`
    }
  }

  const handleTouchEnd = () => {
    const delta = touchCurrentY.current - touchStartY.current
    if (sheetRef.current) {
      sheetRef.current.style.transform = ''
    }
    if (delta > 80) {
      handleClose()
    }
  }

  if (!isOpen && !closing) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className={clsx(
          'fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity',
          closing ? 'opacity-0' : 'opacity-100'
        )}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={clsx(
          'fixed bottom-0 left-0 right-0 z-50',
          'bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/50 rounded-t-2xl',
          'max-h-[85vh] flex flex-col',
          closing ? 'animate-slide-down-sheet' : 'animate-slide-up-sheet'
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-600" />
        </div>

        {/* Title */}
        {title && (
          <div className="px-4 pb-3 flex-shrink-0">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">{title}</h3>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain" style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
          {children}
        </div>
      </div>
    </>
  )
}
