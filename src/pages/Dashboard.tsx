import { Navigate } from 'react-router-dom'
import { useClinicalMode } from '@/context/useClinicalMode'
import WardRoot from '@/pages/roots/WardRoot'

export function Dashboard() {
  const { mode } = useClinicalMode()
  if (mode === 'acute') return <Navigate to="/on-call" replace />
  if (mode === 'clerking') return <Navigate to="/clerking" replace />
  return <WardRoot />
}
