import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';

export default function PrivacyPolicy() {
  usePageMeta(
    'Privacy Policy',
    'Read the Hawaiʻi Wellness privacy policy — how we collect, use, and protect your personal information.',
  );
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link
        to="/"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>

      <h1 className="mb-2 font-display text-4xl font-bold">Privacy Policy</h1>
      <p className="mb-10 text-sm text-muted-foreground">Last updated: March 2026</p>

      <div className="prose prose-stone max-w-none">

        <p>
          Hawaii Wellness ("we," "us," or "our") operates the Hawaiʻi Wellness platform
          at <strong>hawaiiwellness.net</strong> (the "Site"). This Privacy Policy explains how we
          collect, use, disclose, and protect your information when you use our Site.
          By using the Site, you agree to the practices described in this policy.
        </p>

        <h2>1. Information We Collect</h2>

        <h3>Information you provide directly</h3>
        <ul>
          <li><strong>Account information:</strong> when you register as a provider, we collect your name, email address, and business information.</li>
          <li><strong>Listing content:</strong> practice name, bio, address, phone number, website, photos, services, and modalities you enter in your provider profile.</li>
          <li><strong>Payment information:</strong> billing is processed by Stripe. We do not store your credit card number on our servers. Stripe's privacy policy governs payment data.</li>
          <li><strong>Communications:</strong> messages you send us via contact forms or email.</li>
        </ul>

        <h3>Information collected automatically</h3>
        <ul>
          <li><strong>Usage data:</strong> pages viewed, time spent on pages, links clicked, and referring URLs.</li>
          <li><strong>Device and browser data:</strong> IP address, browser type, operating system, and device identifiers.</li>
          <li><strong>Cookies and similar technologies:</strong> we use cookies to maintain your session and remember preferences. You can disable cookies in your browser settings, though some features may not work correctly.</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use collected information to:</p>
        <ul>
          <li>Create and manage your provider account and listings</li>
          <li>Process subscription payments through Stripe</li>
          <li>Display your business information in the public directory</li>
          <li>Send transactional emails (account confirmation, billing receipts)</li>
          <li>Respond to your questions and support requests</li>
          <li>Improve the Site's features and content</li>
          <li>Comply with legal obligations</li>
        </ul>
        <p>
          We do not sell your personal information to third parties. We do not use your data
          for advertising profiling.
        </p>

        <h2>3. Information Sharing</h2>
        <p>We may share your information with:</p>
        <ul>
          <li><strong>Service providers:</strong> Supabase (database and authentication), Stripe (payments), and hosting infrastructure — only as necessary to operate the Site.</li>
          <li><strong>Public directory:</strong> if you create a provider listing, the information you enter in that listing (name, bio, location, contact info, photos) is publicly visible on the Site by design.</li>
          <li><strong>Law enforcement:</strong> when required by law, court order, or to protect the rights, property, or safety of Hawaii Wellness, our users, or the public.</li>
        </ul>

        <h2>4. Data Retention</h2>
        <p>
          We retain your account data for as long as your account is active. If you close your
          account, we will delete or anonymize your personal data within 90 days, except where
          we are required to retain it for legal or financial compliance purposes.
        </p>

        <h2>5. Security</h2>
        <p>
          We implement reasonable technical and organizational measures — including encryption in
          transit (HTTPS), database-level row-level security, and access controls — to protect
          your information. No method of transmission over the internet is 100% secure, and we
          cannot guarantee absolute security.
        </p>

        <h2>6. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li><strong>Access:</strong> request a copy of the personal data we hold about you.</li>
          <li><strong>Correction:</strong> update inaccurate or incomplete information through your account dashboard or by contacting us.</li>
          <li><strong>Deletion:</strong> request that we delete your account and personal data, subject to legal retention requirements.</li>
          <li><strong>Opt-out:</strong> unsubscribe from marketing emails at any time using the unsubscribe link in any email we send.</li>
        </ul>
        <p>
          To exercise any of these rights, email us at{' '}
          <a href="mailto:aloha@hawaiiwellness.net">aloha@hawaiiwellness.net</a>.
        </p>

        <h2>7. Children's Privacy</h2>
        <p>
          The Site is not directed to children under 13 years of age. We do not knowingly collect
          personal information from children under 13. If you believe a child has provided us
          personal information, please contact us and we will delete it promptly.
        </p>

        <h2>8. Third-Party Links</h2>
        <p>
          The Site may contain links to third-party websites (practitioner websites, booking platforms,
          etc.). We are not responsible for the privacy practices of those sites and encourage you
          to review their policies.
        </p>

        <h2>9. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. When we do, we will revise the
          "Last updated" date at the top of this page. Your continued use of the Site after any
          changes constitutes your acceptance of the new policy.
        </p>

        <h2>10. Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy or how we handle your data, please
          contact us at:
        </p>
        <address className="not-italic">
          <strong>Hawaii Wellness</strong><br />
          Email: <a href="mailto:aloha@hawaiiwellness.net">aloha@hawaiiwellness.net</a>
        </address>
      </div>
    </div>
  );
}
