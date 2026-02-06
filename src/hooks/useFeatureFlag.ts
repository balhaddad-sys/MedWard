import { useState, useEffect } from 'react'
import {
  getFeatureFlag as getFlag,
  getConfigString as getString,
  getConfigNumber as getNumber,
} from '@/config/remoteConfig'

export function useFeatureFlag(flagKey: string): boolean {
  const [value, setValue] = useState(() => getFlag(flagKey))

  useEffect(() => {
    setValue(getFlag(flagKey))
  }, [flagKey])

  return value
}

export function useConfigString(configKey: string): string {
  const [value, setValue] = useState(() => getString(configKey))

  useEffect(() => {
    setValue(getString(configKey))
  }, [configKey])

  return value
}

export function useConfigNumber(configKey: string): number {
  const [value, setValue] = useState(() => getNumber(configKey))

  useEffect(() => {
    setValue(getNumber(configKey))
  }, [configKey])

  return value
}
