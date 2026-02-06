import {
  fetchAndActivate,
  getBoolean,
  getString,
  getValue,
} from 'firebase/remote-config'
import { remoteConfig } from './firebase'

const DEFAULTS: Record<string, string | boolean | number> = {
  enable_ai_clinical: true,
  enable_ai_lab_analysis: true,
  enable_ai_drug_interactions: true,
  enable_ai_discharge_summary: true,
  ai_model_haiku: 'claude-haiku-4-5-20251001',
  ai_model_sonnet: 'claude-sonnet-4-5-20250929',
  enable_smarttext: true,
  enable_offline_mode: true,
  enable_semantic_cache: true,
  maintenance_mode: false,
  announcement_banner: '',
  max_ai_requests_per_hour: 50,
  min_app_version: '12.0.0',
  smarttext_dictionary_version: '1',
}

let isInitialized = false

export async function initRemoteConfig(): Promise<void> {
  if (isInitialized) return

  const isDev = import.meta.env.DEV
  remoteConfig.settings.minimumFetchIntervalMillis = isDev ? 300000 : 3600000

  remoteConfig.defaultConfig = DEFAULTS

  try {
    await fetchAndActivate(remoteConfig)
  } catch (err) {
    console.warn('[RemoteConfig] Fetch failed, using defaults:', err)
  }

  isInitialized = true
}

export function getFeatureFlag(key: string): boolean {
  try {
    return getBoolean(remoteConfig, key)
  } catch {
    return (DEFAULTS[key] as boolean) ?? false
  }
}

export function getConfigString(key: string): string {
  try {
    return getString(remoteConfig, key)
  } catch {
    return (DEFAULTS[key] as string) ?? ''
  }
}

export function getConfigNumber(key: string): number {
  try {
    const value = getValue(remoteConfig, key)
    return Number(value.asString()) || (DEFAULTS[key] as number) || 0
  } catch {
    return (DEFAULTS[key] as number) || 0
  }
}

export function isAIEnabled(): boolean {
  return (
    getFeatureFlag('enable_ai_clinical') ||
    getFeatureFlag('enable_ai_lab_analysis') ||
    getFeatureFlag('enable_ai_drug_interactions')
  )
}

export function isMaintenanceMode(): boolean {
  return getFeatureFlag('maintenance_mode')
}

export function getAIModel(taskType: 'fast' | 'complex'): string {
  if (taskType === 'fast') {
    return getConfigString('ai_model_haiku')
  }
  return getConfigString('ai_model_sonnet')
}
