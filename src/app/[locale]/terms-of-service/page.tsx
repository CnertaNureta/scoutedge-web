import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { buildAlternates } from '@/lib/seo/build-alternates'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'termsPage' })
  return {
    title: t('heading'),
    description:
      'KickOracle terms of service. Rules and guidelines for using our World Cup 2026 AI intelligence platform.',
    alternates: buildAlternates(locale, '/terms-of-service'),
  }
}

export default async function TermsOfServicePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('termsPage')

  return (
    <div className="max-w-[900px] mx-auto px-6 py-20 pb-32 md:pb-20">
      <h1 className="font-headline text-4xl md:text-5xl font-bold text-on-surface mb-4">
        {t('heading')}
      </h1>
      <p className="text-on-surface-variant mb-12">{t('lastUpdated')}</p>

      <div className="prose prose-invert prose-lg max-w-none text-on-surface-variant [&_h2]:text-on-surface [&_h2]:font-headline [&_h2]:text-2xl [&_h2]:mt-12 [&_h2]:mb-4 [&_h3]:text-on-surface [&_h3]:text-xl [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:leading-relaxed [&_p]:mb-4 [&_ul]:mb-4 [&_li]:mb-2">
        <h2>1. Agreement to Terms</h2>
        <p>
          By accessing or using KickOracle (kickoracle.com), you agree to be bound by these Terms of Service.
          If you do not agree to these terms, please do not use our website.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          KickOracle is an AI-powered intelligence platform providing analysis, predictions, and data
          related to the 2026 FIFA World Cup. Our content includes team analysis, player profiles,
          match predictions, power rankings, and daily briefings.
        </p>

        <h2>3. Use of Content</h2>
        <p>All content on KickOracle is for informational and entertainment purposes only.</p>
        <ul>
          <li>Predictions and analysis are generated using AI models and statistical methods and are not guaranteed to be accurate.</li>
          <li>Content should not be relied upon as the sole basis for financial or other high-stakes decisions.</li>
          <li>We make no representations or warranties regarding the accuracy, completeness, or reliability of any predictions.</li>
        </ul>

        <h2>4. Intellectual Property</h2>
        <p>
          All content, features, and functionality on KickOracle — including text, graphics, logos, data, and software —
          are the exclusive property of KickOracle and are protected by international copyright, trademark, and other intellectual property laws.
        </p>
        <p>You may not:</p>
        <ul>
          <li>Reproduce, distribute, or republish any content without prior written consent</li>
          <li>Use automated systems (bots, scrapers) to extract data from our website</li>
          <li>Modify, adapt, or create derivative works from our content</li>
        </ul>

        <h2>5. User Conduct</h2>
        <p>When using our website, you agree not to:</p>
        <ul>
          <li>Use the website for any unlawful purpose</li>
          <li>Interfere with or disrupt the website or its servers</li>
          <li>Attempt to gain unauthorized access to any portion of the website</li>
          <li>Use the website to transmit any malicious code or harmful content</li>
        </ul>

        <h2>6. Disclaimer of Warranties</h2>
        <p>
          The website and its content are provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis
          without warranties of any kind, either express or implied. We do not warrant that the website will be
          uninterrupted, error-free, or free of viruses or other harmful components.
        </p>

        <h2>7. Limitation of Liability</h2>
        <p>
          In no event shall KickOracle, its owners, or contributors be liable for any indirect, incidental,
          special, consequential, or punitive damages arising out of or related to your use of the website,
          including but not limited to financial losses from decisions based on our content.
        </p>

        <h2>8. Third-Party Links</h2>
        <p>
          Our website may contain links to third-party websites. We are not responsible for the content
          or practices of any linked third-party sites and encourage you to review their terms and privacy policies.
        </p>

        <h2>9. Changes to Terms</h2>
        <p>
          We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting.
          Your continued use of the website after any changes constitutes acceptance of the new terms.
        </p>

        <h2>10. Governing Law</h2>
        <p>
          These Terms shall be governed by and construed in accordance with applicable laws,
          without regard to conflict of law provisions.
        </p>

        <h2>11. Contact</h2>
        <p>
          For questions about these Terms of Service, please contact us at legal@kickoracle.com.
        </p>
      </div>
    </div>
  )
}
