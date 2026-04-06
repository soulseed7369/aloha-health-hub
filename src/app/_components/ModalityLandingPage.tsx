'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MapPin, ArrowRight, Building2 } from 'lucide-react';
import type { Provider, Center } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

// ── SSR-safe card components (no react-router-dom dependency) ────────────────

function SSRProviderCard({ provider, highlightModality }: { provider: Provider; highlightModality?: string }) {
  const modalities = provider.modalities ?? (provider.modality ? [provider.modality] : []);
  const tierBorder = provider.tier === 'featured'
    ? 'border-amber-300 bg-amber-50/30'
    : provider.tier === 'premium'
    ? 'border-teal-300 bg-teal-50/30'
    : 'border-slate-200';

  return (
    <Link href={`/profile/${provider.id}`} className="block group">
      <div className={`rounded-lg border ${tierBorder} p-4 transition-shadow hover:shadow-md h-full`}>
        <div className="flex items-start gap-3 mb-3">
          {provider.image ? (
            <img
              src={provider.image}
              alt={provider.name}
              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {provider.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 truncate group-hover:text-teal-600 transition-colors">
              {provider.name}
            </h3>
            {provider.location && (
              <p className="text-sm text-slate-500 flex items-center gap-1">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{provider.location}</span>
              </p>
            )}
          </div>
        </div>
        {modalities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {modalities.slice(0, 4).map((mod) => (
              <span
                key={mod}
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  mod === highlightModality
                    ? 'bg-teal-100 text-teal-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {mod}
              </span>
            ))}
            {modalities.length > 4 && (
              <span className="text-xs text-slate-500">+{modalities.length - 4}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

function SSRCenterCard({ center }: { center: Center }) {
  const modalities = center.modalities ?? (center.modality ? [center.modality] : []);
  const tierBorder = center.tier === 'featured'
    ? 'border-amber-300 bg-amber-50/30'
    : center.tier === 'premium'
    ? 'border-teal-300 bg-teal-50/30'
    : 'border-slate-200';

  return (
    <Link href={`/center/${center.id}`} className="block group">
      <div className={`rounded-lg border ${tierBorder} p-4 transition-shadow hover:shadow-md h-full`}>
        <div className="flex items-start gap-3 mb-3">
          {center.image ? (
            <img
              src={center.image}
              alt={center.name}
              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white flex-shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 truncate group-hover:text-teal-600 transition-colors">
              {center.name}
            </h3>
            {center.location && (
              <p className="text-sm text-slate-500 flex items-center gap-1">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{center.location}</span>
              </p>
            )}
          </div>
        </div>
        {center.description && (
          <p className="text-sm text-slate-600 mb-3 line-clamp-2">{center.description}</p>
        )}
        {modalities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {modalities.slice(0, 4).map((mod) => (
              <span key={mod} className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700">
                {mod}
              </span>
            ))}
            {modalities.length > 4 && (
              <span className="text-xs text-slate-500">+{modalities.length - 4}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

interface ModalityLandingPageProps {
  islandSlug: string;
  islandDisplayName: string;
  modalitySlug: string;
  modalityName: string;
  practitioners: Provider[];
  centers: Center[];
  totalPractitioners: number;
  totalCenters: number;
  citiesServed: string[];
  relatedModalities?: Array<{ slug: string; name: string }>;
}

export default function ModalityLandingPage({
  islandSlug,
  islandDisplayName,
  modalitySlug,
  modalityName,
  practitioners,
  centers,
  totalPractitioners,
  totalCenters,
  citiesServed,
  relatedModalities = [],
}: ModalityLandingPageProps) {
  const [activeTab, setActiveTab] = useState<'practitioners' | 'centers'>('practitioners');

  // Generate FAQ questions dynamically based on modality
  const faqQuestions = [
    {
      q: `What is ${modalityName}?`,
      a: `${modalityName} is a healing practice available on ${islandDisplayName}. Our network of certified practitioners offers personalized sessions tailored to your wellness goals.`,
    },
    {
      q: `How do I find a ${modalityName} practitioner on ${islandDisplayName}?`,
      a: `Browse our directory above to discover ${totalPractitioners} practitioners and ${totalCenters} centers specializing in ${modalityName} across ${islandDisplayName}. Filter by city or use our search to find the right fit.`,
    },
    {
      q: `What are the benefits of ${modalityName}?`,
      a: `${modalityName} supports holistic wellness and can complement other health practices. Consult with one of our practitioners to learn how it may benefit your individual health journey.`,
    },
    {
      q: `Is ${modalityName} available online or in person?`,
      a: `Many of our practitioners offer both in-person sessions on ${islandDisplayName} and online services. Check individual listings for their preferred session types.`,
    },
    {
      q: `How do I book a session?`,
      a: `Most practitioners on our platform offer external booking links or contact information. Click on any listing to view booking details and get in touch directly.`,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Breadcrumbs */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span>/</span>
            <Link href={`/${islandSlug}`} className="hover:text-slate-900">
              {islandDisplayName}
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">{modalityName}</span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            {modalityName} on {islandDisplayName}
          </h1>
          <p className="text-xl text-slate-600 mb-6">
            Discover {totalPractitioners} practitioners and {totalCenters} wellness centers
            {citiesServed.length > 0 && ` across ${citiesServed.slice(0, 3).join(', ')}`}
          </p>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto mb-8">
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="text-2xl font-bold text-slate-900">{totalPractitioners}</div>
              <div className="text-sm text-slate-600">Practitioners</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="text-2xl font-bold text-slate-900">{totalCenters}</div>
              <div className="text-sm text-slate-600">Centers</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="text-2xl font-bold text-slate-900">{citiesServed.length}</div>
              <div className="text-sm text-slate-600">Cities</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="text-2xl font-bold text-slate-900">4</div>
              <div className="text-sm text-slate-600">Islands</div>
            </div>
          </div>
        </div>
      </section>

      {/* Directory Section */}
      <section className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex gap-4 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('practitioners')}
              className={`pb-3 px-4 font-medium transition-colors ${
                activeTab === 'practitioners'
                  ? 'border-b-2 border-teal-500 text-teal-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Practitioners ({totalPractitioners})
            </button>
            <button
              onClick={() => setActiveTab('centers')}
              className={`pb-3 px-4 font-medium transition-colors ${
                activeTab === 'centers'
                  ? 'border-b-2 border-teal-500 text-teal-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Centers ({totalCenters})
            </button>
          </div>
        </div>

        {activeTab === 'practitioners' && (
          <div>
            {practitioners.length > 0 ? (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {practitioners.map((provider) => (
                  <SSRProviderCard key={provider.id} provider={provider} highlightModality={modalityName} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-600">No practitioners found for this modality yet.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'centers' && (
          <div>
            {centers.length > 0 ? (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {centers.map((center) => (
                  <SSRCenterCard key={center.id} center={center} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-600">No centers found for this modality yet.</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Related Modalities */}
      {relatedModalities.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Related Modalities</h2>
          <div className="flex flex-wrap gap-3">
            {relatedModalities.map((mod) => (
              <Link
                key={mod.slug}
                href={`/${islandSlug}/${mod.slug}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-900 transition-colors"
              >
                {mod.name}
                <ArrowRight className="w-4 h-4" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* FAQ Section */}
      <section className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-8">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="w-full">
          {faqQuestions.map((item, idx) => (
            <AccordionItem key={idx} value={`item-${idx}`}>
              <AccordionTrigger>{item.q}</AccordionTrigger>
              <AccordionContent>{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA Banner */}
      <section className="bg-gradient-to-r from-teal-500 to-teal-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Are you a {modalityName} practitioner on {islandDisplayName}?
          </h2>
          <p className="text-lg text-teal-100 mb-8 max-w-2xl mx-auto">
            Join our wellness community and reach clients looking for your services.
          </p>
          <Link href="/list-your-practice">
            <Button size="lg" variant="secondary" className="gap-2">
              List Your Practice
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-8 text-center">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Can't find what you're looking for?</h3>
          <p className="text-slate-600 mb-6">
            Our concierge team can help connect you with the perfect practitioner for your needs.
          </p>
          <Link href="/concierge">
            <Button variant="outline" className="gap-2">
              Get Concierge Help
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
