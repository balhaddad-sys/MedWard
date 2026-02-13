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

  // Route to On-Call Dashboard if enabled for current mode
  useEffect(() => {
    const modeConfig = MODES[mode]
    if (modeConfig.features.shiftView) {
      navigate('/on-call', { replace: true })
    }
  }, [mode, navigate])

  if (mode === 'acute') return <AcuteRoot />
  if (mode === 'clerking') return <ClerkingRoot />
  return <WardRoot />
}
