import { useClinicalMode } from '@/context/useClinicalMode'
import WardRoot from '@/pages/roots/WardRoot'
import AcuteRoot from '@/pages/roots/AcuteRoot'
import ClinicRoot from '@/pages/roots/ClinicRoot'

export function Dashboard() {
  const { mode } = useClinicalMode()

  if (mode === 'acute') return <AcuteRoot />
  if (mode === 'clinic') return <ClinicRoot />
  return <WardRoot />
}
