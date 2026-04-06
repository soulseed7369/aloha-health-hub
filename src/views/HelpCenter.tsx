import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Mail } from 'lucide-react';
import { generateFAQSchema, type FAQItem, type FAQSection } from '@/lib/faqSchema';
import { JsonLd } from '@/components/JsonLd';

function Accordion({ question, answer }: FAQItem) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        className="flex w-full items-center justify-between py-4 text-left text-sm font-medium hover:text-primary transition-colors"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span>{question}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-in-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="pb-4 text-sm text-muted-foreground leading-relaxed">
            {answer}
          </div>
        </div>
      </div>
    </div>
  );
}

const sections: FAQSection[] = [
  {
    title: 'About Hawaiʻi Wellness',
    items: [
      {
        question: 'What is Hawaiʻi Wellness?',
        answer: (
          <p>
            Hawaiʻi Wellness is a curated online directory of holistic health and wellness
            providers across the Hawaiian Islands — including Maui, Oahu, the Big Island,
            and Kauai. We connect people seeking healing, balance, and well-being with local
            practitioners and wellness centers.
          </p>
        ),
      },
      {
        question: 'What kinds of practitioners and services are listed?',
        answer: (
          <p>
            Our directory includes acupuncturists, massage therapists, yoga instructors,
            naturopathic doctors, energy healers, sound bath practitioners, life coaches,
            nutritionists, meditation teachers, Lomilomi practitioners, and many more. We
            also feature wellness centers and spas.
          </p>
        ),
      },
      {
        question: 'Is Hawaiʻi Wellness affiliated with any health providers?',
        answer: (
          <p>
            No. We are an independent directory platform operated by Hawaii Wellness LLC.
            We do not refer patients, provide medical advice, or endorse any specific
            practitioner or service. Always consult a qualified healthcare professional
            before beginning a new wellness program.
          </p>
        ),
      },
      {
        question: 'Which islands are covered?',
        answer: (
          <p>
            We currently feature providers on the Big Island (Hawaiʻi), Maui, Oahu, and
            Kauai. We are continually adding listings across all islands.
          </p>
        ),
      },
    ],
  },
  {
    title: 'For Wellness Seekers',
    items: [
      {
        question: 'Do I need an account to browse the directory?',
        answer: (
          <p>
            No. The directory and articles are completely free to browse
            without creating an account. You only need an account if you are a provider
            listing your own practice.
          </p>
        ),
      },
      {
        question: 'How do I find a practitioner near me?',
        answer: (
          <p>
            Visit the <Link to="/directory" className="text-primary underline underline-offset-2">Directory</Link> page
            and use the island, city, and modality filters to narrow down results. Each
            listing includes contact details, a website link, and a booking link where
            available.
          </p>
        ),
      },
      {
        question: 'How do I book a session with a practitioner?',
        answer: (
          <p>
            Booking is handled directly by each provider — we don't process bookings
            ourselves. Look for the "Book Now" or "Visit Website" button on a listing's
            profile page to be taken to the provider's own booking system.
          </p>
        ),
      },
      {
        question: 'What does the Featured badge mean?',
        answer: (
          <p>
            Featured listings are providers who have subscribed to our Featured tier. They
            appear prominently on island homepages and in the directory. The badge does not
            imply any endorsement or quality certification by Hawaiʻi Wellness — it is a
            paid placement.
          </p>
        ),
      },
      {
        question: 'A listing looks outdated or incorrect. What can I do?',
        answer: (
          <p>
            You can flag a listing for review using the "Report listing" link on any
            profile page. Our team will review and follow up with the provider. You can
            also email us at{' '}
            <a href="mailto:aloha@hawaiiwellness.net" className="text-primary underline underline-offset-2">
              aloha@hawaiiwellness.net
            </a>.
          </p>
        ),
      },
    ],
  },
  {
    title: 'For Providers — Getting Listed',
    items: [
      {
        question: 'How do I add my practice to the directory?',
        answer: (
          <p>
            Go to the{' '}
            <Link to="/list-your-practice" className="text-primary underline underline-offset-2">
              List Your Practice
            </Link>{' '}
            page, choose a plan, and create your account. Once you're signed in, complete
            your profile in the Provider Dashboard and your listing will go live after a
            quick review.
          </p>
        ),
      },
      {
        question: 'My practice is already listed — how do I claim it?',
        answer: (
          <p>
            If you find an existing listing for your practice, click the "Claim this
            listing" link on the profile page. You'll be asked to verify your identity and
            sign in or create an account. Once claimed, you can edit all listing details
            from your dashboard.
          </p>
        ),
      },
      {
        question: 'What information should I include in my listing?',
        answer: (
          <p>
            At minimum: your name or practice name, island and city, services and
            modalities offered, and a way for clients to reach you (phone, email, or
            website). A clear photo and a well-written bio significantly improve your
            listing's visibility and the number of inquiries you receive.
          </p>
        ),
      },
      {
        question: 'Can I list multiple locations or practices?',
        answer: (
          <p>
            Yes. Each provider account can manage multiple practitioner profiles and
            wellness center listings from a single dashboard. Each listing is managed and
            billed separately.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Plans & Pricing',
    items: [
      {
        question: 'What are the subscription tiers?',
        answer: (
          <div className="space-y-2">
            <p>We offer three tiers:</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>
                <strong>Free</strong> — A basic listing with your name, location, modalities,
                bio, and contact info. Visible in the directory and searchable by island and
                specialty.
              </li>
              <li>
                <strong>Premium — $39/month</strong> — Everything in Free, plus the ability
                to add social media links, display your working hours,
                and add client testimonials to your profile.
              </li>
              <li>
                <strong>Featured — $69/month</strong> — Everything in Premium, plus
                prominent placement on your island's homepage, a Featured badge on your
                listing, offerings and classes calendar, and priority positioning in search results.
              </li>
            </ul>
          </div>
        ),
      },
      {
        question: 'How does the Featured slot limit work?',
        answer: (
          <p>
            Each island has a maximum of 5 Featured slots. If all slots are filled for your
            island, you'll be placed on a waitlist and will not be charged until a slot
            opens up. You'll receive an email notification when your spot becomes available.
          </p>
        ),
      },
      {
        question: 'Can I upgrade or downgrade my plan?',
        answer: (
          <p>
            Yes. You can change your plan at any time from the Billing section of your
            dashboard. Upgrades take effect immediately. Downgrades take effect at the end
            of the current billing cycle.
          </p>
        ),
      },
      {
        question: 'Do you offer annual billing or discounts?',
        answer: (
          <p>
            Not at this time. All paid plans are billed monthly. We may introduce annual
            billing and nonprofit or multi-listing discounts in the future — subscribe to
            our newsletter or check back for updates.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Billing & Cancellations',
    items: [
      {
        question: 'How do I cancel my subscription?',
        answer: (
          <p>
            Log in to your dashboard and go to <strong>Billing</strong>. Click "Cancel
            subscription." Your listing will remain active at your current tier until the
            end of the billing period, then revert to the Free tier automatically. You
            won't be charged again.
          </p>
        ),
      },
      {
        question: 'What is your refund policy?',
        answer: (
          <p>
            Monthly subscription fees are <strong>non-refundable</strong>. If you cancel
            mid-cycle, you retain access to your paid features through the end of that
            billing period. We do not issue partial-month refunds. If you believe you were
            charged in error, contact us at{' '}
            <a href="mailto:aloha@hawaiiwellness.net" className="text-primary underline underline-offset-2">
              aloha@hawaiiwellness.net
            </a>{' '}
            and we'll investigate promptly.
          </p>
        ),
      },
      {
        question: 'What payment methods do you accept?',
        answer: (
          <p>
            We accept all major credit and debit cards (Visa, Mastercard, American Express,
            Discover) through our secure payment processor, Stripe. We do not store your
            card details on our servers.
          </p>
        ),
      },
      {
        question: 'What happens to my listing if I miss a payment?',
        answer: (
          <p>
            If a payment fails, Stripe will automatically retry over several days. If the
            payment still cannot be collected, your account will be downgraded to the Free
            tier and your paid features (social links, Featured placement)
            will be removed until billing is resolved. Your basic listing remains visible.
          </p>
        ),
      },
      {
        question: 'How do I update my payment method?',
        answer: (
          <p>
            Go to <strong>Billing</strong> in your dashboard and click "Manage billing."
            This opens the Stripe billing portal where you can update your card, view
            invoices, and manage your subscription directly.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Account & Technical Help',
    items: [
      {
        question: 'I didn\'t receive a sign-in email. What should I do?',
        answer: (
          <p>
            Check your spam or junk folder first. If it's not there, wait a minute and
            try requesting a new link on the{' '}
            <Link to="/auth" className="text-primary underline underline-offset-2">sign-in page</Link>.
            Each magic link expires after 60 minutes. If you continue to have trouble,
            email{' '}
            <a href="mailto:aloha@hawaiiwellness.net" className="text-primary underline underline-offset-2">
              aloha@hawaiiwellness.net
            </a>.
          </p>
        ),
      },
      {
        question: 'How do I update my listing information?',
        answer: (
          <p>
            Sign in and go to your Provider Dashboard. Select <strong>My Profile</strong>{' '}
            (for practitioner listings) or <strong>My Centers</strong> to edit your
            wellness center. Changes are saved immediately and reflected on your public
            profile.
          </p>
        ),
      },
      {
        question: 'How do I delete my account?',
        answer: (
          <p>
            Email{' '}
            <a href="mailto:aloha@hawaiiwellness.net" className="text-primary underline underline-offset-2">
              aloha@hawaiiwellness.net
            </a>{' '}
            from the address associated with your account and request deletion. We will
            remove your account and all associated data within 90 days, per our{' '}
            <Link to="/privacy-policy" className="text-primary underline underline-offset-2">Privacy Policy</Link>.
            Any active subscription will be cancelled at the same time.
          </p>
        ),
      },
      {
        question: 'I found a bug or something isn\'t working. Who do I contact?',
        answer: (
          <p>
            Please email{' '}
            <a href="mailto:aloha@hawaiiwellness.net" className="text-primary underline underline-offset-2">
              aloha@hawaiiwellness.net
            </a>{' '}
            with a description of the issue, the device and browser you're using, and a
            screenshot if possible. We aim to respond within one business day.
          </p>
        ),
      },
    ],
  },
];

export default function HelpCenter() {
  const faqSchema = generateFAQSchema(sections);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <JsonLd id="faq-schema" data={faqSchema} />
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="mb-3 font-display text-4xl font-bold">Help Center</h1>
        <p className="text-muted-foreground">
          Everything you need to know about Hawaiʻi Wellness. Can't find an answer?{' '}
          <a href="mailto:aloha@hawaiiwellness.net" className="text-primary underline underline-offset-2">
            Email us
          </a>.
        </p>
      </div>

      {/* FAQ sections */}
      <div className="space-y-10">
        {sections.map(section => (
          <section key={section.title}>
            <h2 className="mb-3 font-display text-xl font-semibold">{section.title}</h2>
            <div className="rounded-lg border border-border bg-card px-4">
              {section.items.map(item => (
                <Accordion key={item.question} {...item} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Still need help CTA */}
      <div className="mt-14 rounded-xl bg-primary/5 border border-primary/20 p-8 text-center">
        <Mail className="mx-auto mb-3 h-8 w-8 text-primary" />
        <h2 className="mb-2 font-display text-xl font-semibold">Still have questions?</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Our team is happy to help. We typically respond within one business day.
        </p>
        <a
          href="mailto:aloha@hawaiiwellness.net"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Mail className="h-4 w-4" />
          aloha@hawaiiwellness.net
        </a>
      </div>
    </div>
  );
}
