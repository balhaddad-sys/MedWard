import { useState } from 'react'
import { Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const DISCLAIMER_KEY = 'medward-disclaimer-accepted'

function hasAcceptedDisclaimer() {
  try {
    return !!localStorage.getItem(DISCLAIMER_KEY)
  } catch {
    return false
  }
}

export function HIPAADisclaimer() {
  const [visible, setVisible] = useState(() => !hasAcceptedDisclaimer())
  const navigate = useNavigate()

  const handleAccept = () => {
    localStorage.setItem(DISCLAIMER_KEY, new Date().toISOString())
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-ward-border animate-slide-up overflow-hidden">
        <div className="bg-primary-600 px-6 py-4 flex items-center gap-3">
          <Shield className="h-6 w-6 text-white flex-shrink-0" />
          <h2 className="text-white font-semibold text-lg">Clinical Use Notice</h2>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-ward-text leading-relaxed">
            This application contains protected health information (PHI) and is intended exclusively for
            <strong> authorized healthcare professionals</strong>. By proceeding, you acknowledge:
          </p>

          <ul className="text-sm text-ward-muted space-y-2">
            <li className="flex gap-2">
              <span className="text-primary-600 font-bold flex-shrink-0">1.</span>
              <span>You are an authorized user of this clinical system and will maintain patient confidentiality.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary-600 font-bold flex-shrink-0">2.</span>
              <span>AI-generated content is for decision support only and must be verified by qualified clinicians.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary-600 font-bold flex-shrink-0">3.</span>
              <span>All activity is logged for audit and compliance purposes.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary-600 font-bold flex-shrink-0">4.</span>
              <span>You agree to the <button onClick={() => navigate('/terms')} className="text-primary-600 underline hover:text-primary-700">Terms of Service</button> and <button onClick={() => navigate('/privacy')} className="text-primary-600 underline hover:text-primary-700">Privacy Policy</button>.</span>
            </li>
          </ul>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-ward-border flex items-center justify-between gap-3">
          <p className="text-xs text-ward-muted">
            Unauthorized access is prohibited and may be subject to legal action.
          </p>
          <button
            onClick={handleAccept}
            className="px-6 py-2.5 bg-primary-600 text-white font-medium text-sm rounded-lg hover:bg-primary-700 active:bg-primary-800 transition-colors flex-shrink-0"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  )
}
