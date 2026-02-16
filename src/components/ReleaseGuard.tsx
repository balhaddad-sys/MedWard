import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { getReleaseIssues, RELEASE_STAGE } from '@/config/release'

export function ReleaseGuard({ children }: { children: ReactNode }) {
  const issues = getReleaseIssues()
  const blockingIssues = issues.filter((issue) => issue.severity === 'error')

  if (blockingIssues.length === 0) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white border border-amber-200 rounded-2xl shadow-lg p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-amber-700" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Release Configuration Blocked</h1>
            <p className="text-sm text-slate-600">
              App startup is blocked because the current `{RELEASE_STAGE}` release configuration is unsafe.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Blocking Issues</p>
          <ul className="space-y-2">
            {blockingIssues.map((issue) => (
              <li key={issue.code} className="text-sm text-slate-800">
                <span className="font-semibold">{issue.code}</span>: {issue.message}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
