import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link
        to="/"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>

      <h1 className="mb-2 font-display text-4xl font-bold">Terms of Service</h1>
      <p className="mb-10 text-sm text-muted-foreground">Last updated: March 2026</p>

      <div className="prose prose-stone max-w-none">

        <p>
          These Terms of Service ("Terms") govern your use of the Hawaiʻi Wellness website
          and platform operated by <strong>Hawaii Wellness LLC</strong> ("we," "us," or "our").
          By accessing or using the Site, you agree to be bound by these Terms. If you do not
          agree, please do not use the Site.
        </p>

        <h2>1. Who Can Use the Site</h2>
        <p>
          You must be at least 18 years old to use the Site. By using it, you represent and
          warrant that you meet this requirement and that your use complies with all applicable
          laws and regulations.
        </p>

        <h2>2. The Platform</h2>
        <p>
          Hawaiʻi Wellness is a directory platform connecting wellness seekers with holistic
          practitioners, wellness centers, and retreat providers in Hawaii. We do not provide
          medical, therapeutic, or health services ourselves. We are not responsible for the
          quality, accuracy, or outcomes of services offered by listed providers.
        </p>

        <h2>3. Provider Accounts and Listings</h2>

        <h3>Account responsibility</h3>
        <p>
          If you create a provider account, you are responsible for maintaining the
          confidentiality of your login credentials and for all activity that occurs under
          your account. Notify us immediately at{' '}
          <a href="mailto:aloha@hawaiiwellness.net">aloha@hawaiiwellness.net</a> if you
          suspect unauthorized use.
        </p>

        <h3>Listing content</h3>
        <p>By submitting a listing, you represent and warrant that:</p>
        <ul>
          <li>All information is accurate, current, and not misleading.</li>
          <li>You are authorized to offer the services described.</li>
          <li>You hold any licenses or certifications required by Hawaii state law for your practice.</li>
          <li>Your listing does not infringe any third-party intellectual property rights.</li>
          <li>Photos you upload are owned by you or you have permission to use them.</li>
        </ul>
        <p>
          We reserve the right to remove or edit any listing at our sole discretion, including
          listings that are inaccurate, misleading, outdated, or in violation of these Terms.
        </p>

        <h3>Prohibited content</h3>
        <p>You may not post listings or content that:</p>
        <ul>
          <li>Is false, deceptive, or fraudulent</li>
          <li>Promotes illegal services or activities</li>
          <li>Contains defamatory, obscene, or harassing material</li>
          <li>Impersonates another person or organization</li>
          <li>Contains malware, spam, or unsolicited advertising</li>
        </ul>

        <h2>4. Subscription Plans and Payments</h2>

        <h3>Plans</h3>
        <p>
          We offer three tiers: Free, Premium ($39/month), and Featured ($69/month).
          Paid plans are billed monthly on a recurring basis through Stripe.
        </p>

        <h3>Cancellation</h3>
        <p>
          You may cancel your subscription at any time from your billing dashboard. Your
          access to paid features will continue until the end of the current billing period.
          No refunds are issued for partial periods.
        </p>

        <h3>Price changes</h3>
        <p>
          We reserve the right to change subscription prices with at least 30 days' notice.
          Continued use after a price change takes effect constitutes acceptance of the new price.
        </p>

        <h3>Featured slots</h3>
        <p>
          Featured placement is limited to 5 providers per island. If the Featured tier is
          sold out for your island, you will be placed on a waitlist and not charged until
          a slot becomes available.
        </p>

        <h2>5. Intellectual Property</h2>
        <p>
          All Site design, code, text, and branding (excluding provider-submitted content) is
          owned by Hawaii Wellness LLC. You may not reproduce, distribute, or create derivative
          works without our written permission.
        </p>
        <p>
          By submitting listing content (text, photos, etc.), you grant Hawaii Wellness LLC a
          non-exclusive, royalty-free, worldwide license to display and promote that content on
          the Site and in related marketing materials.
        </p>

        <h2>6. Disclaimer of Warranties</h2>
        <p>
          THE SITE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.
          WE DO NOT WARRANT THAT THE SITE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF
          VIRUSES. WE MAKE NO WARRANTIES REGARDING THE ACCURACY OR COMPLETENESS OF DIRECTORY
          LISTINGS OR THE QUALITY OF SERVICES PROVIDED BY LISTED PRACTITIONERS.
        </p>
        <p>
          Nothing on this Site constitutes medical advice. Always consult a qualified healthcare
          professional before beginning any wellness program.
        </p>

        <h2>7. Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, HAWAII WELLNESS LLC SHALL NOT BE LIABLE FOR
          ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM
          YOUR USE OF THE SITE OR SERVICES LISTED THEREIN, EVEN IF WE HAVE BEEN ADVISED OF
          THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL LIABILITY TO YOU FOR ANY CLAIMS ARISING
          UNDER THESE TERMS SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING
          THE CLAIM.
        </p>

        <h2>8. Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless Hawaii Wellness LLC, its officers, employees,
          and agents from any claims, damages, or expenses (including reasonable attorneys' fees)
          arising from your use of the Site, your listings, or your violation of these Terms.
        </p>

        <h2>9. Governing Law</h2>
        <p>
          These Terms are governed by the laws of the State of Hawaii, without regard to
          conflict-of-law principles. Any disputes shall be resolved in the state or federal
          courts located in Honolulu, Hawaii.
        </p>

        <h2>10. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. We will notify registered users by
          email of material changes. Continued use of the Site after changes become effective
          constitutes acceptance of the revised Terms.
        </p>

        <h2>11. Contact</h2>
        <p>Questions about these Terms? Contact us at:</p>
        <address className="not-italic">
          <strong>Hawaii Wellness LLC</strong><br />
          Email: <a href="mailto:aloha@hawaiiwellness.net">aloha@hawaiiwellness.net</a>
        </address>
      </div>
    </div>
  );
}
