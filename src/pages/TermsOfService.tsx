import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/login">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login
          </Button>
        </Link>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <h1 className="text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last Updated: January 5, 2026</p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using NYCLogic Ai ("Service"), you agree to be bound by these Terms of 
              Service ("Terms"). If you are using the Service on behalf of a school, district, or 
              organization, you represent that you have the authority to bind that entity to these Terms. 
              If you do not agree to these Terms, do not use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              NYCLogic Ai is an educational technology platform that enables teachers to scan, analyze, 
              and assess student work using AI-assisted technology. The Service includes features for:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2 text-muted-foreground">
              <li>Scanning and digitizing student handwritten work</li>
              <li>AI-powered analysis and grading assistance</li>
              <li>Class and student management</li>
              <li>Assessment creation and administration</li>
              <li>Performance reporting and analytics</li>
              <li>Differentiated instruction recommendations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">3. User Accounts</h2>
            
            <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Account Registration</h3>
            <p className="text-muted-foreground leading-relaxed">
              To use the Service, you must create an account with accurate and complete information. 
              You are responsible for maintaining the confidentiality of your account credentials and 
              for all activities that occur under your account.
            </p>

            <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Account Types</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Teacher Accounts:</strong> For educators to manage classes, scan work, and view reports</li>
              <li><strong>Administrator Accounts:</strong> For school/district administrators with additional oversight capabilities</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Account Security</h3>
            <p className="text-muted-foreground leading-relaxed">
              You must immediately notify us of any unauthorized use of your account or any other 
              security breach. We are not liable for any loss resulting from unauthorized use of your account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">4. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              You agree to use the Service only for lawful educational purposes. You shall not:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Upload content that is illegal, harmful, threatening, abusive, or otherwise objectionable</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Use the Service to collect personal information about students without proper authorization</li>
              <li>Interfere with or disrupt the Service or servers connected to the Service</li>
              <li>Reverse engineer, decompile, or disassemble any portion of the Service</li>
              <li>Use the Service for any commercial purpose unrelated to education</li>
              <li>Share account credentials with unauthorized individuals</li>
              <li>Upload student data without proper consent from your school or district</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">5. User Content</h2>
            
            <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Ownership</h3>
            <p className="text-muted-foreground leading-relaxed">
              You retain ownership of all content you upload to the Service, including student work, 
              questions, assessments, and other materials ("User Content"). By uploading User Content, 
              you grant us a limited license to process, store, and display this content solely for 
              the purpose of providing the Service.
            </p>

            <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Responsibility</h3>
            <p className="text-muted-foreground leading-relaxed">
              You are solely responsible for User Content you upload and must ensure you have the 
              right to upload such content. You must obtain all necessary consents before uploading 
              student information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">6. AI-Assisted Features</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              The Service uses artificial intelligence to assist with grading and analysis:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>AI suggestions are provided as assistance tools and should be reviewed by teachers</li>
              <li>Teachers maintain full control and responsibility for final grades and assessments</li>
              <li>AI features may not be 100% accurate and should not be relied upon exclusively</li>
              <li>We continuously work to improve AI accuracy but make no guarantees of perfection</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">7. Privacy and Data Protection</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your use of the Service is also governed by our{" "}
              <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, 
              which is incorporated into these Terms by reference. We are committed to protecting 
              student data in accordance with FERPA, COPPA, and other applicable privacy laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">8. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service, including its design, features, and content (excluding User Content), is 
              owned by NYCLogic Ai and protected by copyright, trademark, and other intellectual 
              property laws. You may not copy, modify, distribute, or create derivative works based 
              on the Service without our express written permission.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">9. Subscription and Payment</h2>
            
            <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Pricing</h3>
            <p className="text-muted-foreground leading-relaxed">
              Certain features of the Service may require a paid subscription. Pricing and available 
              plans are described on our website and may be updated from time to time with reasonable notice.
            </p>

            <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Billing</h3>
            <p className="text-muted-foreground leading-relaxed">
              Subscription fees are billed in advance on a monthly or annual basis. You authorize us 
              to charge your designated payment method for all fees due.
            </p>

            <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Cancellation</h3>
            <p className="text-muted-foreground leading-relaxed">
              You may cancel your subscription at any time. Upon cancellation, you will retain access 
              until the end of your current billing period. Refunds are provided in accordance with 
              our refund policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">10. Service Availability</h2>
            <p className="text-muted-foreground leading-relaxed">
              We strive to maintain high availability but do not guarantee uninterrupted access. 
              The Service may be temporarily unavailable due to maintenance, updates, or circumstances 
              beyond our control. We will make reasonable efforts to notify users of planned downtime.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">11. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, 
              EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF 
              MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT 
              WARRANT THAT THE SERVICE WILL BE ERROR-FREE, SECURE, OR UNINTERRUPTED.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">12. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, NYCLOGIC AI SHALL NOT BE LIABLE FOR ANY 
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF 
              PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, 
              USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">13. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to indemnify, defend, and hold harmless NYCLogic Ai and its officers, 
              directors, employees, and agents from any claims, damages, losses, or expenses 
              (including reasonable attorneys' fees) arising from your use of the Service, 
              violation of these Terms, or infringement of any third-party rights.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">14. Termination</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We may suspend or terminate your access to the Service at any time for:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Violation of these Terms</li>
              <li>Non-payment of subscription fees</li>
              <li>Conduct that we believe is harmful to other users or the Service</li>
              <li>Legal or regulatory requirements</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Upon termination, your right to use the Service will immediately cease. We will 
              provide you with an opportunity to export your data before deletion, in accordance 
              with our data retention policies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">15. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may modify these Terms at any time. We will notify you of material changes by 
              email or through the Service. Your continued use of the Service after changes become 
              effective constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">16. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the 
              State of [Your State], without regard to its conflict of law provisions. Any disputes 
              arising under these Terms shall be resolved in the courts located in [Your Jurisdiction].
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">17. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              For questions about these Terms, please contact us:
            </p>
            <div className="bg-muted/50 p-4 rounded-lg text-muted-foreground">
              <p><strong>NYCLogic Ai Legal Team</strong></p>
              <p>Email: legal@nyclogic.ai</p>
              <p>Address: [Your Business Address]</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">18. Entire Agreement</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms, together with the Privacy Policy, constitute the entire agreement between 
              you and NYCLogic Ai regarding the Service and supersede all prior agreements and 
              understandings.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
