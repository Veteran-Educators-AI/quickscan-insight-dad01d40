import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last Updated: January 5, 2026</p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Scan Genius ("we," "our," or "us") is committed to protecting the privacy of students, 
              parents, and educators who use our educational assessment platform. This Privacy Policy 
              explains how we collect, use, disclose, and safeguard information in compliance with the 
              Family Educational Rights and Privacy Act (FERPA), the Children's Online Privacy Protection 
              Act (COPPA), and other applicable privacy laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">FERPA Compliance</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We operate as a "school official" under FERPA, meaning we provide services that schools 
              would otherwise use their own employees to perform. We are under the direct control of 
              the school with respect to the use and maintenance of education records.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Under FERPA, parents have certain rights regarding their children's education records 
              until the student turns 18 or attends a postsecondary institution. These rights include:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2 text-muted-foreground">
              <li>The right to inspect and review student education records</li>
              <li>The right to request amendment of records believed to be inaccurate</li>
              <li>The right to consent to disclosures of personally identifiable information</li>
              <li>The right to file a complaint with the U.S. Department of Education</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Information We Collect</h2>
            
            <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Student Education Records</h3>
            <p className="text-muted-foreground leading-relaxed mb-3">
              When teachers use our platform, they may input or scan student work that contains:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Student names and student ID numbers</li>
              <li>Class assignments and responses</li>
              <li>Assessment scores and grades</li>
              <li>Images of student handwritten work</li>
              <li>Teacher feedback and evaluations</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Teacher Account Information</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Name and email address</li>
              <li>School or institution affiliation</li>
              <li>Account credentials (encrypted)</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Technical Information</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Device information and browser type</li>
              <li>IP address and general location</li>
              <li>Usage data and feature interactions</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">How We Use Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We use collected information solely to provide and improve our educational services:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>To analyze and grade student work using AI-assisted technology</li>
              <li>To generate reports and insights for teachers</li>
              <li>To identify learning gaps and provide differentiated instruction recommendations</li>
              <li>To maintain and improve our platform's functionality</li>
              <li>To communicate with teachers about their accounts and our services</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4 font-medium">
              We do NOT use student data for advertising, marketing, or any commercial purpose 
              unrelated to providing educational services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Data Sharing and Disclosure</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We do not sell, rent, or trade student personal information. We may share data only:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>With the school or district that authorized the teacher's use of our platform</li>
              <li>With service providers who assist in platform operations, under strict confidentiality agreements</li>
              <li>As required by law, court order, or government regulation</li>
              <li>To protect the rights, property, or safety of our users or others</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Data Security</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We implement robust security measures to protect student data:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>End-to-end encryption for data in transit and at rest</li>
              <li>Secure cloud infrastructure with regular security audits</li>
              <li>Role-based access controls limiting data access to authorized personnel</li>
              <li>Regular security training for all staff with data access</li>
              <li>Incident response procedures for potential data breaches</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Data Retention and Deletion</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We retain student education records only as long as necessary to provide our services:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Teachers may delete student data at any time through their account settings</li>
              <li>Upon termination of a school's agreement, we delete all associated student data within 60 days</li>
              <li>Parents/eligible students may request deletion by contacting their school</li>
              <li>We maintain anonymized, aggregated data for service improvement purposes</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Parental Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Parents have the right to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Review their child's education records stored in our system by contacting their school</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of their child's data</li>
              <li>Refuse consent for their child's participation (contact your school)</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              All parental requests should be directed to the child's school, which will coordinate 
              with us to fulfill the request.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Children's Privacy (COPPA)</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our service is designed for use by teachers and schools. We do not knowingly collect 
              personal information directly from children under 13. All student data is provided by 
              teachers acting as authorized representatives of their schools, which have obtained 
              appropriate parental consent for the use of educational technology platforms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">AI and Automated Processing</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Our platform uses artificial intelligence to assist in grading and analyzing student work:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>AI analysis is used to support, not replace, teacher judgment</li>
              <li>Teachers review and can override all AI-generated assessments</li>
              <li>We do not use student data to train general AI models</li>
              <li>AI processing occurs on secure, FERPA-compliant infrastructure</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy periodically. We will notify schools and teachers of 
              material changes via email and by posting the updated policy on our platform. Continued 
              use of our services after changes constitutes acceptance of the modified policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              For questions about this Privacy Policy or our data practices, contact us:
            </p>
            <div className="bg-muted/50 p-4 rounded-lg text-muted-foreground">
              <p><strong>Scan Genius Privacy Team</strong></p>
              <p>Email: privacy@scangenius.edu</p>
              <p>Address: [Your Business Address]</p>
            </div>
            <p className="text-muted-foreground leading-relaxed mt-4">
              For FERPA complaints, you may also contact:<br />
              Family Policy Compliance Office<br />
              U.S. Department of Education<br />
              400 Maryland Avenue, SW<br />
              Washington, D.C. 20202-5920
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
