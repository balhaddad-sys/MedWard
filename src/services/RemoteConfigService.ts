// Firebase Remote Config service for feature gating and AI safety

interface RemoteConfigDefaults {
  ai_enabled: boolean
  labs_enabled: boolean
  smarttext_enabled: boolean
  ai_maintenance_message: string
  labs_maintenance_message: string
  smarttext_maintenance_message: string
  ai_rate_limit_per_minute: number
}

const defaults: RemoteConfigDefaults = {
  ai_enabled: true,
  labs_enabled: true,
  smarttext_enabled: true,
  ai_maintenance_message: 'AI features are temporarily unavailable for maintenance.',
  labs_maintenance_message: 'Lab analysis is temporarily unavailable.',
  smarttext_maintenance_message: 'SmartText is temporarily unavailable.',
  ai_rate_limit_per_minute: 30,
}

class RemoteConfigServiceImpl {
  private config: RemoteConfigDefaults = { ...defaults }
  private initialized = false

  async init(): Promise<void> {
    if (this.initialized) return

    try {
      // TODO: Initialize Firebase Remote Config
      // const remoteConfig = getRemoteConfig(app)
      // remoteConfig.settings.minimumFetchIntervalMillis = 300000 // 5 min
      // await fetchAndActivate(remoteConfig)
      // this.config = { ...defaults, ...getAll(remoteConfig) }
      this.initialized = true
    } catch (error) {
      console.warn('[REMOTE_CONFIG] Failed to fetch, using defaults:', error)
      this.initialized = true
    }
  }

  async isFeatureEnabled(feature: 'ai' | 'labs' | 'smarttext'): Promise<boolean> {
    await this.init()
    const key = `${feature}_enabled` as keyof RemoteConfigDefaults
    return this.config[key] as boolean
  }

  async getMaintenanceMessage(feature: 'ai' | 'labs' | 'smarttext'): Promise<string> {
    await this.init()
    const key = `${feature}_maintenance_message` as keyof RemoteConfigDefaults
    return this.config[key] as string
  }

  async getRateLimit(): Promise<number> {
    await this.init()
    return this.config.ai_rate_limit_per_minute
  }
}

export const remoteConfigService = new RemoteConfigServiceImpl()

// Rate limiter for AI requests
class RateLimiter {
  private requests: number[] = []
  private limitPerMinute: number = defaults.ai_rate_limit_per_minute

  async init(): Promise<void> {
    this.limitPerMinute = await remoteConfigService.getRateLimit()
  }

  canMakeRequest(): boolean {
    const now = Date.now()
    const oneMinuteAgo = now - 60000

    // Clean old entries
    this.requests = this.requests.filter((t) => t > oneMinuteAgo)

    return this.requests.length < this.limitPerMinute
  }

  recordRequest(): void {
    this.requests.push(Date.now())
  }

  getTimeUntilNextSlot(): number {
    if (this.canMakeRequest()) return 0
    const now = Date.now()
    const oneMinuteAgo = now - 60000
    const oldestInWindow = this.requests.find((t) => t > oneMinuteAgo)
    if (!oldestInWindow) return 0
    return oldestInWindow + 60000 - now
  }

  getRemainingRequests(): number {
    const now = Date.now()
    const oneMinuteAgo = now - 60000
    this.requests = this.requests.filter((t) => t > oneMinuteAgo)
    return Math.max(0, this.limitPerMinute - this.requests.length)
  }
}

export const rateLimiter = new RateLimiter()
