export type ReleaseStage = 'pilot' | 'production'

const rawReleaseStage = (import.meta.env.VITE_RELEASE_STAGE || 'pilot').toLowerCase()

export const RELEASE_STAGE: ReleaseStage = rawReleaseStage === 'production' ? 'production' : 'pilot'
export const IS_PRODUCTION_RELEASE = RELEASE_STAGE === 'production'
export const IS_PILOT_RELEASE = RELEASE_STAGE === 'pilot'

export interface ReleaseIssue {
  code: string
  message: string
  severity: 'error' | 'warning'
}

export function getReleaseIssues(): ReleaseIssue[] {
  const issues: ReleaseIssue[] = []

  if (IS_PRODUCTION_RELEASE && import.meta.env.VITE_USE_EMULATORS === 'true') {
    issues.push({
      code: 'EMULATORS_ENABLED',
      message: 'Production release cannot run with VITE_USE_EMULATORS=true.',
      severity: 'error',
    })
  }

  if (IS_PRODUCTION_RELEASE && !import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
    issues.push({
      code: 'APP_CHECK_MISSING',
      message: 'Production release requires VITE_RECAPTCHA_SITE_KEY for App Check.',
      severity: 'error',
    })
  }

  return issues
}

export function hasBlockingReleaseIssues(): boolean {
  return getReleaseIssues().some((issue) => issue.severity === 'error')
}
