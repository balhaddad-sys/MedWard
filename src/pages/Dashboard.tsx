import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClinicalMode } from '@/context/useClinicalMode'
import { MODES } from '@/config/modes'
import WardRoot from '@/pages/roots/WardRoot'
import AcuteRoot from '@/pages/roots/AcuteRoot'
import ClerkingRoot from '@/pages/roots/ClerkingRoot'

export function Dashboard() {
  const { mode } = useClinicalMode()
  const navigate = useNavigate()

  // PHASE 2: Route to Shift View if enabled for current mode
  useEffect(() => {
    const modeConfig = MODES[mode]
    if (modeConfig.features.shiftView) {
      navigate('/shift', { replace: true })
    }
  }, [mode, navigate])

  if (mode === 'acute') return <AcuteRoot />
  if (mode === 'clerking') return <ClerkingRoot />
  return <WardRoot />
}
