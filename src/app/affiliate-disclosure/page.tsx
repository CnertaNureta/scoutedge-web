import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Affiliate Disclosure',
  description:
    'ScoutEdge affiliate disclosure. Learn how we earn commissions from sports betting partner links on our World Cup 2026 prediction platform.',
  alternates: { canonical: 'https://scoutedge.ai/affiliate-disclosure' },
}

export default function AffiliateDisclosurePage() {
  return (
    <div className="max-w-[900px] mx-auto px-6 py-20 pb-32 md:pb-20">
      <h1 className="font-headline text-4xl md:text-5xl font-bold text-on-surface mb-4">
        Affiliate Disclosure
      </h1>
      <p className="text-on-surface-variant mb-12">Last updated: March 27, 2026</p>

      <div className="prose prose-invert prose-lg max-w-none text-on-surface-variant [&_h2]:text-on-surface [&_h2]:font-headline [&_h2]:text-2xl [&_h2]:mt-12 [&_h2]:mb-4 [&_h3]:text-on-surface [&_h3]:text-xl [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:leading-relaxed [&_p]:mb-4 [&_ul]:mb-4 [&_li]:mb-2">
        <h2>Overview</h2>
        <p>
          ScoutEdge participates in affiliate partnerships with licensed sports betting operators.
          When you click on certain links on our site and place a bet or register an account with
          one of our partner sportsbooks, ScoutEdge may earn a commission at no additional cost to you.
        </p>

        <h2>Our Partners</h2>
        <p>
          ScoutEdge currently partners with the following licensed sportsbook operators:
        </p>
        <ul>
          <li><strong>Bet365</strong> — Available in the UK, Australia, Canada, and select international markets</li>
          <li><strong>FanDuel</strong> — Available in select US states where sports betting is legal</li>
          <li><strong>DraftKings</strong> — Available in select US states where sports betting is legal</li>
          <li><strong>Betway</strong> — Available in Canada</li>
        </ul>

        <h2>How Affiliate Links Work</h2>
        <p>
          Affiliate links on ScoutEdge are clearly marked with an &ldquo;Ad&rdquo; or &ldquo;18+&rdquo; label.
          These links contain tracking parameters that identify ScoutEdge as the referral source.
          When you click an affiliate link:
        </p>
        <ul>
          <li>You are redirected to the sportsbook&apos;s website</li>
          <li>A tracking cookie may be placed by the sportsbook</li>
          <li>If you register or place a qualifying bet, ScoutEdge may receive a commission</li>
        </ul>

        <h2>Editorial Independence</h2>
        <p>
          Our AI-powered predictions, analysis, and match insights are generated independently of our
          affiliate partnerships. Affiliate relationships do not influence our prediction models,
          team ratings, or editorial content in any way.
        </p>

        <h2>Responsible Gambling</h2>
        <p>
          Sports betting involves financial risk. Please gamble responsibly and only bet what you can
          afford to lose. If you or someone you know has a gambling problem, please contact:
        </p>
        <ul>
          <li>
            <strong>UK:</strong>{' '}
            <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              BeGambleAware.org
            </a>{' '}
            (0808 8020 133)
          </li>
          <li>
            <strong>US:</strong>{' '}
            National Council on Problem Gambling — 1-800-522-4700
          </li>
          <li>
            <strong>Canada:</strong>{' '}
            <a href="https://www.responsiblegambling.org" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              ResponsibleGambling.org
            </a>
          </li>
        </ul>

        <h2>Geographic Restrictions</h2>
        <p>
          Sports betting is not available in all regions. ScoutEdge automatically detects your
          location and only displays betting links from operators licensed in your jurisdiction.
          If you are in a region where sports betting is not legal, no affiliate links will be shown.
        </p>
        <p>
          It is your responsibility to ensure that online sports betting is legal in your jurisdiction
          before engaging with any sportsbook.
        </p>

        <h2>Age Restriction</h2>
        <p>
          You must be 18 years of age or older (21+ in some US states) to participate in sports betting.
          ScoutEdge does not knowingly target or market to individuals under the legal gambling age in
          their jurisdiction.
        </p>

        <h2>Contact</h2>
        <p>
          If you have questions about our affiliate relationships, please contact us
          at <a href="mailto:affiliates@scoutedge.ai" className="text-primary underline">affiliates@scoutedge.ai</a>.
        </p>
      </div>
    </div>
  )
}
