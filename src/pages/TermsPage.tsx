import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
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
            <FileText size={24} className="text-gray-400" />
            <h1 className="text-2xl font-bold text-gray-900">Terms of Service</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Last updated: January 1, 2026
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="prose prose-sm prose-gray max-w-none">
          <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                By accessing or using MedWard Pro (&quot;the Application&quot;), you agree to be bound by
                these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not
                use the Application. These Terms apply to all users of the Application, including
                physicians, nurses, residents, pharmacists, and administrative staff.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Description of Service</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                MedWard Pro is a clinical ward management application that provides tools for
                patient management, task tracking, lab analysis, handover generation, structured
                clerking, and AI-powered clinical decision support. The Application is designed to
                support, not replace, clinical decision-making by qualified healthcare professionals.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Eligibility and Access</h2>
              <ul className="list-disc pl-6 text-sm text-gray-600 space-y-2">
                <li>You must be an authorized healthcare professional or staff member affiliated with a healthcare organization that has licensed the Application.</li>
                <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                <li>You must not share your account with other individuals.</li>
                <li>You must immediately notify your organization if you believe your account has been compromised.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Clinical Use Disclaimer</h2>
              <p className="text-sm text-gray-600 leading-relaxed font-medium">
                IMPORTANT: The Application, including all AI-powered features, is provided as a
                clinical decision support tool only. It does not provide medical advice, diagnosis,
                or treatment recommendations.
              </p>
              <ul className="list-disc pl-6 text-sm text-gray-600 space-y-2 mt-2">
                <li>All clinical decisions must be made by qualified healthcare professionals exercising independent professional judgment.</li>
                <li>AI-generated content (including drug information, differential diagnoses, lab interpretations, and SBAR reports) should always be verified against authoritative clinical references.</li>
                <li>The Application does not replace clinical assessment, physical examination, or established clinical protocols.</li>
                <li>You are solely responsible for all clinical decisions made in the care of your patients.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Data Entry and Accuracy</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                You are responsible for the accuracy and completeness of all data you enter into the
                Application. Patient information should be entered in accordance with your
                organization&apos;s documentation standards and policies. The Application maintains
                an audit trail of data modifications for medico-legal compliance purposes.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Acceptable Use</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-2">
                You agree not to:
              </p>
              <ul className="list-disc pl-6 text-sm text-gray-600 space-y-2">
                <li>Use the Application for any purpose other than authorized clinical activities</li>
                <li>Access patient data for any patient not under your direct care or without proper authorization</li>
                <li>Share, export, or transmit patient data outside of authorized clinical channels</li>
                <li>Attempt to circumvent security measures, access controls, or audit mechanisms</li>
                <li>Use the Application in any way that violates applicable laws, regulations, or your organization&apos;s policies</li>
                <li>Reverse engineer, decompile, or disassemble any part of the Application</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Intellectual Property</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                The Application and its original content (excluding patient data entered by users),
                features, and functionality are owned by MedWard Pro and are protected by
                intellectual property laws. You are granted a limited, non-exclusive,
                non-transferable license to use the Application for its intended purpose.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Service Availability</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                While we strive to maintain high availability, the Application is provided on an
                &quot;as is&quot; and &quot;as available&quot; basis. We do not guarantee uninterrupted or
                error-free operation. Planned maintenance windows will be communicated in advance
                where possible. You should maintain alternative procedures for critical clinical
                workflows in case of service interruption.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Limitation of Liability</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                To the maximum extent permitted by law, MedWard Pro and its developers shall not be
                liable for any indirect, incidental, special, consequential, or punitive damages
                resulting from your use of the Application. This includes, but is not limited to,
                damages arising from clinical decisions made using the Application, data loss, or
                service interruptions. Our total liability shall not exceed the amount paid by your
                organization for the Application in the twelve months preceding the claim.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Indemnification</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                You agree to indemnify and hold harmless MedWard Pro, its developers, officers,
                directors, and employees from any claims, damages, losses, or expenses arising from
                your use of the Application, your violation of these Terms, or your violation of
                any applicable law or regulation.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">11. Termination</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                We reserve the right to suspend or terminate your access to the Application at any
                time, with or without cause, upon notice to your organization. Upon termination,
                your right to use the Application ceases immediately. Data retention following
                termination will be handled in accordance with our Privacy Policy and applicable
                regulations.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">12. Changes to Terms</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                We reserve the right to modify these Terms at any time. Material changes will be
                communicated through the Application or via email to registered users. Your
                continued use of the Application after changes are posted constitutes acceptance
                of the revised Terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">13. Governing Law</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of the
                jurisdiction in which your healthcare organization operates, without regard to
                conflict of law provisions. Any disputes arising from these Terms shall be resolved
                through the dispute resolution mechanism specified in your organization&apos;s
                licensing agreement.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">14. Contact</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                For questions about these Terms of Service, please contact your organization&apos;s
                IT department or reach out through the support channels provided within the
                Application.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
