import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { APP_NAME } from '@/config/constants'

export function TermsPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-ward-bg">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-ward-muted hover:text-ward-text mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <h1 className="text-3xl font-bold text-ward-text mb-2">Terms of Service</h1>
        <p className="text-sm text-ward-muted mb-8">Last updated: February 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-ward-text">
          <section>
            <h2 className="text-lg font-semibold mb-2">1. Acceptance of Terms</h2>
            <p className="text-sm text-ward-muted leading-relaxed">
              By accessing and using {APP_NAME}, you accept and agree to be bound by these Terms of Service.
              {APP_NAME} is intended exclusively for authorized healthcare professionals within approved medical institutions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">2. Authorized Use</h2>
            <p className="text-sm text-ward-muted leading-relaxed">
              {APP_NAME} is a clinical decision-support tool. It must only be used by licensed healthcare professionals
              for legitimate patient care purposes. You must not share your login credentials or allow unauthorized
              access to the system. All access and actions are logged for audit purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">3. Clinical Disclaimer</h2>
            <p className="text-sm text-ward-muted leading-relaxed">
              {APP_NAME} provides clinical decision support and AI-assisted analysis. These features are intended to
              assist — not replace — professional clinical judgment. All AI-generated suggestions, lab interpretations,
              and clinical recommendations must be independently verified by qualified healthcare professionals before
              any clinical decisions are made. {APP_NAME} does not provide medical diagnoses.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">4. Data Responsibility</h2>
            <p className="text-sm text-ward-muted leading-relaxed">
              Users are responsible for the accuracy and completeness of data entered into the system.
              Patient data must be handled in accordance with your institution's data governance policies,
              applicable privacy laws, and healthcare regulations. Do not enter patient data into the system
              unless authorized to do so by your institution.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">5. Availability</h2>
            <p className="text-sm text-ward-muted leading-relaxed">
              While we strive for continuous availability, {APP_NAME} is provided "as is" without warranty
              of uninterrupted service. Do not rely solely on {APP_NAME} for critical clinical workflows.
              Maintain appropriate backup procedures as required by your institution.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">6. Limitation of Liability</h2>
            <p className="text-sm text-ward-muted leading-relaxed">
              To the maximum extent permitted by law, {APP_NAME} and its developers shall not be liable
              for any direct, indirect, incidental, or consequential damages arising from the use or inability
              to use the application, including but not limited to clinical outcomes influenced by application-generated content.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">7. Modifications</h2>
            <p className="text-sm text-ward-muted leading-relaxed">
              We reserve the right to modify these Terms of Service at any time. Changes will be communicated
              through the application. Continued use of {APP_NAME} after modifications constitutes acceptance
              of the updated terms.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
