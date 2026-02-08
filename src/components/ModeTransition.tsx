import { useClinicalMode } from '@/context/useClinicalMode'
import { clsx } from 'clsx'

export function ModeTransition({ children }: { children: React.ReactNode }) {
  const { isTransitioning } = useClinicalMode()

  return (
    <div
      className={clsx(
        'transition-all duration-150',
        isTransitioning ? 'opacity-50 scale-[0.99] blur-[1px]' : 'opacity-100 scale-100'
      )}
    >
      {children}
    </div>
  )
}
