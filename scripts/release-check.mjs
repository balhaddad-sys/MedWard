import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const errors = []
const warnings = []

function checkExists(relativePath, category = 'required file') {
  const fullPath = path.join(root, relativePath)
  if (!fs.existsSync(fullPath)) {
    errors.push(`[${category}] Missing ${relativePath}`)
  }
}

function checkContains(relativePath, pattern, description) {
  const fullPath = path.join(root, relativePath)
  if (!fs.existsSync(fullPath)) {
    errors.push(`[content] Missing ${relativePath}`)
    return
  }
  const content = fs.readFileSync(fullPath, 'utf8')
  if (!pattern.test(content)) {
    errors.push(`[content] ${description} not found in ${relativePath}`)
  }
}

checkExists('capacitor.config.ts', 'mobile')
checkExists('android', 'mobile')
checkExists('ios', 'mobile')
checkExists('src/config/release.ts', 'release')
checkExists('src/components/ReleaseGuard.tsx', 'release')
checkExists('functions/src/tasks/maintenanceJobs.ts', 'backend')

checkContains('.env.example', /VITE_RELEASE_STAGE=/, 'VITE_RELEASE_STAGE')
checkContains('.env.example', /VITE_RECAPTCHA_SITE_KEY=/, 'VITE_RECAPTCHA_SITE_KEY')
checkContains('src/config/firebase.ts', /initializeAppCheck/, 'App Check initialization')
checkContains('functions/src/utils/rateLimiter.ts', /checkRateLimitDetailed/, 'detailed rate limiter')

if (!fs.existsSync(path.join(root, 'DEPLOYMENT_CHECKLIST.md'))) {
  warnings.push('[docs] DEPLOYMENT_CHECKLIST.md not found.')
}

if (warnings.length > 0) {
  console.log('Release Check Warnings:')
  warnings.forEach((warning) => console.log(`- ${warning}`))
}

if (errors.length > 0) {
  console.error('Release Check Failed:')
  errors.forEach((error) => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Release check passed.')
