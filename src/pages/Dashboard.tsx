import { useClinicalMode } from '@/context/useClinicalMode'
import WardRoot from '@/pages/roots/WardRoot'
import AcuteRoot from '@/pages/roots/AcuteRoot'
import ClerkingRoot from '@/pages/roots/ClerkingRoot'

export function Dashboard() {
  const { mode } = useClinicalMode()

  if (mode === 'acute') return <AcuteRoot />
  if (mode === 'clerking') return <ClerkingRoot />
  return <WardRoot />
}
