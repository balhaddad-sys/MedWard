import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { APP_NAME } from '@/config/constants'

export function PrivacyPage() {
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

        <h1 className="text-3xl font-bold text-ward-text mb-2">Privacy Policy</h1>
        <p className="text-sm text-ward-muted mb-8">Last updated: February 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-ward-text">
          <section>
            <h2 className="text-lg font-semibold mb-2">1. Introduction</h2>
            <p className="text-sm text-ward-muted leading-relaxed">
              {APP_NAME} is a clinical ward management application designed for authorized healthcare professionals.
              This Privacy Policy describes how we collect, use, and protect information within the application.
              By using {APP_NAME}, you agree to the practices described in this policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">2. Information We Collect</h2>
            <p className="text-sm text-ward-muted leading-relaxed">
              <strong>Account Information:</strong> When you sign in, we collect your email address, display name, and authentication credentials via Firebase Authentication.
            </p>
            <p className="text-sm text-ward-muted leading-relaxed mt-2">
              <strong>Clinical Data:</strong> Patient records, lab results, tasks, notes, and handover reports entered by authorized users are stored securely in Firebase Firestore.
            </p>
            <p className="text-sm text-ward-muted leading-relaxed mt-2">
              <strong>Usage Data:</strong> We collect anonymous usage metrics to improve application performance and reliability.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">3. Data Security</h2>
            <p className="text-sm text-ward-muted leading-relaxed">
              All data is encrypted in transit (TLS 1.2+) and at rest. Access is restricted to authenticated users only.
              Firestore security rules enforce role-based access control. Audit logs track all data modifications.
              We follow industry-standard security practices consistent with healthcare data protection requirements.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">4. Data Retention</h2>
            <p className="text-sm text-ward-muted leading-relaxed">
              Clinical data is retained according to your institution's data retention policies and applicable healthcare regulations.
              Audit logs are retained indefinitely for compliance purposes. Users may request data deletion through their
              institution's data governance procedures.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">5. Third-Party Services</h2>
            <p className="text-sm text-ward-muted leading-relaxed">
              {APP_NAME} uses the following third-party services: Google Firebase (authentication, database, hosting),
              and Anthropic Claude API (clinical AI assistance). All third-party services are configured to
              process data in compliance with applicable data protection regulations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">6. Your Rights</h2>
            <p className="text-sm text-ward-muted leading-relaxed">
              You have the right to access, correct, or request deletion of your personal data.
              To exercise these rights, contact your institution's data protection officer or system administrator.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">7. Contact</h2>
            <p className="text-sm text-ward-muted leading-relaxed">
              For questions about this Privacy Policy, contact your hospital's IT department or system administrator.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
