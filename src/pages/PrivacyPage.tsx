import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            iconLeft={<ArrowLeft size={16} />}
            className="mb-4"
          >
            Back
          </Button>
          <div className="flex items-center gap-3">
            <Shield size={24} className="text-slate-400" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Privacy Policy</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Last updated: January 1, 2026
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="prose prose-sm prose-gray max-w-none">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">1. Introduction</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                MedWard Pro (&quot;the Application&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is a clinical ward
                management application designed for healthcare professionals. This Privacy Policy
                describes how we collect, use, store, and protect information, including Protected
                Health Information (PHI), when you use our Application. We are committed to
                maintaining the confidentiality, integrity, and security of all data entrusted to us.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">2. Information We Collect</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
                We collect the following categories of information:
              </p>
              <ul className="list-disc pl-6 text-sm text-slate-600 dark:text-slate-300 space-y-2">
                <li>
                  <strong>Account Information:</strong> Name, email address, professional role,
                  department, and authentication credentials used to create and manage your account.
                </li>
                <li>
                  <strong>Patient Data:</strong> Patient demographics, clinical information,
                  diagnoses, lab results, medications, and other health-related data that you enter
                  into the Application. This data is considered Protected Health Information (PHI).
                </li>
                <li>
                  <strong>Usage Data:</strong> Information about how you interact with the
                  Application, including feature usage patterns, session duration, and error logs.
                  This data does not include PHI.
                </li>
                <li>
                  <strong>Device Information:</strong> Browser type, operating system, and device
                  identifiers used for security and compatibility purposes.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">3. How We Use Your Information</h2>
              <ul className="list-disc pl-6 text-sm text-slate-600 dark:text-slate-300 space-y-2">
                <li>To provide and maintain the clinical ward management services</li>
                <li>To authenticate your identity and manage your account</li>
                <li>To facilitate clinical workflows including patient management, task tracking, lab analysis, and handover generation</li>
                <li>To provide AI-powered clinical decision support features</li>
                <li>To send notifications about critical clinical events (e.g., critical lab values, overdue tasks)</li>
                <li>To improve the Application through anonymized, aggregated usage analytics</li>
                <li>To comply with legal and regulatory requirements</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">4. Data Storage and Security</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
                We implement robust security measures to protect your data:
              </p>
              <ul className="list-disc pl-6 text-sm text-slate-600 dark:text-slate-300 space-y-2">
                <li>All data is stored in Google Cloud Firebase with encryption at rest and in transit</li>
                <li>Access to patient data is restricted through role-based access controls and team-based permissions</li>
                <li>Authentication is handled through Firebase Authentication with support for multi-factor authentication</li>
                <li>PHI is automatically cleared from client-side storage upon sign-out</li>
                <li>All data modifications are tracked through an audit trail for medico-legal compliance</li>
                <li>App Check is enabled in production to prevent unauthorized API access</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">5. Data Sharing</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                We do not sell, rent, or trade your personal information or patient data to third
                parties. Patient data may be shared with other authorized clinicians within your
                clinical team as configured within the Application. We may share anonymized,
                aggregated data for research or quality improvement purposes. We may disclose
                information when required by law, regulation, or legal process.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">6. AI-Powered Features</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                The Application includes AI-powered features such as clinical chat assistance, drug
                information lookup, lab analysis, and SBAR handover generation. When using these
                features, relevant clinical data may be transmitted to AI processing services. AI
                responses are provided for clinical decision support only and should not replace
                professional medical judgment. We do not use patient data to train AI models.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">7. Data Retention</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Patient data is retained for as long as your account is active and as required by
                applicable healthcare record retention regulations. Completed tasks are automatically
                purged after a configurable retention period. You may request deletion of your
                account and associated data by contacting our support team, subject to legal
                retention requirements.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">8. Your Rights</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Depending on your jurisdiction, you may have rights to access, correct, or delete
                your personal data. Healthcare professionals may access audit trails for their
                activities within the Application. To exercise your data rights, please contact
                your organization&apos;s data protection officer or our support team.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">9. Changes to This Policy</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify users of
                material changes through the Application or via email. Continued use of the
                Application after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">10. Contact Us</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                If you have questions about this Privacy Policy or our data practices, please
                contact our Data Protection team through your organization&apos;s IT department or
                via the support channels provided within the Application.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
