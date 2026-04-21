import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'KickOracle privacy policy. Learn how we collect, use, and protect your data on our World Cup 2026 AI intelligence platform.',
  alternates: { canonical: 'https://kickoracle.com/privacy-policy' },
}

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-[900px] mx-auto px-6 py-20 pb-32 md:pb-20">
      <h1 className="font-headline text-4xl md:text-5xl font-bold text-on-surface mb-4">
        Privacy Policy
      </h1>
      <p className="text-on-surface-variant mb-12">Last updated: March 25, 2026</p>

      <div className="prose prose-invert prose-lg max-w-none text-on-surface-variant [&_h2]:text-on-surface [&_h2]:font-headline [&_h2]:text-2xl [&_h2]:mt-12 [&_h2]:mb-4 [&_h3]:text-on-surface [&_h3]:text-xl [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:leading-relaxed [&_p]:mb-4 [&_ul]:mb-4 [&_li]:mb-2">
        <h2>1. Introduction</h2>
        <p>
          KickOracle (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates the website kickoracle.com (the &ldquo;Service&rdquo;).
          This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website.
        </p>

        <h2>2. Information We Collect</h2>
        <h3>Automatically Collected Information</h3>
        <p>When you visit our website, we may automatically collect certain information, including:</p>
        <ul>
          <li>Browser type and version</li>
          <li>Operating system</li>
          <li>Referring URLs and pages visited</li>
          <li>Time and date of your visit</li>
          <li>Approximate geographic location (country/city level)</li>
        </ul>

        <h3>Analytics</h3>
        <p>
          We use Google Analytics to understand how visitors interact with our website.
          Google Analytics collects information such as how often users visit the site, what pages they visit,
          and what other sites they used prior to coming to this site.
        </p>

        <h2>3. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Operate and maintain the website</li>
          <li>Improve user experience and content</li>
          <li>Analyze usage trends and traffic patterns</li>
          <li>Display relevant advertisements</li>
        </ul>

        <h2>4. Advertising</h2>
        <p>
          We may use third-party advertising companies, including Google AdSense, to serve ads when you visit our website.
          These companies may use cookies and similar technologies to serve ads based on your prior visits to our website
          or other websites. You can opt out of personalized advertising by visiting{' '}
          <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Google Ads Settings
          </a>.
        </p>

        <h2>5. Cookies</h2>
        <p>
          Our website uses cookies to enhance your browsing experience. Cookies are small data files stored on your device.
          You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
          However, if you do not accept cookies, some features of our website may not function properly.
        </p>

        <h2>6. Third-Party Links</h2>
        <p>
          Our website may contain links to third-party websites or services that are not operated by us.
          We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party sites.
        </p>

        <h2>7. Data Security</h2>
        <p>
          We use commercially reasonable measures to protect the information collected through our website.
          However, no method of transmission over the Internet or electronic storage is 100% secure.
        </p>

        <h2>8. Children&apos;s Privacy</h2>
        <p>
          Our Service is not directed to anyone under the age of 13. We do not knowingly collect personal information from children under 13.
        </p>

        <h2>9. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page
          and updating the &ldquo;Last updated&rdquo; date.
        </p>

        <h2>10. Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy, please contact us at privacy@kickoracle.com.
        </p>
      </div>
    </div>
  )
}
