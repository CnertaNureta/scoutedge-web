/**
 * FAQ Schema Data — World Cup 2026
 *
 * Provides FAQ structured data (JSON-LD) for all 46 confirmed teams.
 * Use this to generate FAQPage schema on each team page for Google rich snippets.
 *
 * Implementation note for engineer:
 *   1. Import TEAM_FAQS and look up by team slug on [slug]/page.tsx
 *   2. Render the JSON-LD in a <Script type="application/ld+json"> tag in the <head>
 *   3. The schema should wrap the FAQEntry[] in the FAQPage format below
 *
 * Example JSON-LD output:
 * {
 *   "@context": "https://schema.org",
 *   "@type": "FAQPage",
 *   "mainEntity": [
 *     {
 *       "@type": "Question",
 *       "name": "...",
 *       "acceptedAnswer": { "@type": "Answer", "text": "..." }
 *     }
 *   ]
 * }
 */

export type FAQEntry = {
  question: string
  answer: string
}

export type TeamFAQ = {
  slug: string
  name: string
  group: string
  faqs: FAQEntry[]
}

export const TEAM_FAQS: Record<string, TeamFAQ> = {
  // ─── GROUP A ────────────────────────────────────────────────────────────────
  mexico: {
    slug: "mexico",
    name: "Mexico",
    group: "A",
    faqs: [
      {
        question: "Will Mexico qualify from the group stage at World Cup 2026?",
        answer: "Mexico are heavy favorites to qualify from Group A as co-hosts. Drawn alongside South Africa, South Korea, and Denmark, El Tri hold the significant advantage of home crowds and familiarity with Mexican venues. They are expected to top the group, though their infamous 'quinto partido' barrier — seven consecutive Round of 16 exits — means nothing is guaranteed beyond the group stage.",
      },
      {
        question: "Who is Mexico's best player at World Cup 2026?",
        answer: "Edson Alvarez is Mexico's most important player — a commanding defensive midfielder whose positional intelligence and tackling quality anchor the entire team. Santiago Gimenez provides goal-scoring threat up front, while Alexis Vega's creativity on the wing and Guillermo Ochoa's goalkeeping experience (if selected) are additional key factors.",
      },
      {
        question: "What is Mexico's World Cup record?",
        answer: "Mexico have appeared in 17 FIFA World Cups and reached the quarter-finals in 1970 and 1986 — both tournaments hosted on Mexican soil. They have made the Round of 16 in seven consecutive tournaments but have never advanced beyond it. As a 2026 co-host, they enter with one of their best-ever chances to finally reach the quarter-finals again.",
      },
      {
        question: "Is Mexico hosting the 2026 World Cup?",
        answer: "Yes, Mexico is one of three co-hosts of the 2026 FIFA World Cup alongside the United States and Canada. The Estadio Azteca in Mexico City will make history as the first venue to host matches at three separate World Cups (1970, 1986, 2026), including the tournament opener.",
      },
    ],
  },
  "south-africa": {
    slug: "south-africa",
    name: "South Africa",
    group: "A",
    faqs: [
      {
        question: "Will South Africa qualify from the group stage at World Cup 2026?",
        answer: "South Africa face a challenging Group A alongside Mexico, South Korea, and Denmark. Under Hugo Broos's rebuilt young squad, Bafana Bafana have improved significantly — their AFCON 2023 semi-final run showed genuine progress. However, qualifying from this group would require either South Africa's best-ever World Cup performance or upsets against the higher-ranked teams. Their best realistic target is a competitive campaign that earns points against Denmark or South Korea.",
      },
      {
        question: "Who is South Africa's best player at World Cup 2026?",
        answer: "Percy Tau is South Africa's most experienced attacking player, bringing Premier League and European club experience to his creative role. Ronwen Williams has emerged as one of Africa's best goalkeepers. The squad's strength is collective under Hugo Broos's youthful rebuild rather than reliant on a single star.",
      },
      {
        question: "What is South Africa's World Cup record?",
        answer: "South Africa have made four World Cup appearances (1998, 2002, 2010, 2026). Their best result was the 2010 tournament, which they hosted — Siphiwe Tshabalala scored one of the World Cup's most iconic opening goals against Mexico. They have never advanced beyond the group stage at a World Cup.",
      },
    ],
  },
  "south-korea": {
    slug: "south-korea",
    name: "South Korea",
    group: "A",
    faqs: [
      {
        question: "Will South Korea qualify from the group stage at World Cup 2026?",
        answer: "South Korea are competitive in Group A and have a genuine chance of advancing, either as second-place automatic qualifiers or through the best third-place team route. Their pressing intensity under Hong Myung-bo, combined with Son Heung-min's leadership, gives them an edge over South Africa. The Denmark match will be decisive for their automatic qualification hopes.",
      },
      {
        question: "Who is South Korea's best player at World Cup 2026?",
        answer: "Son Heung-min, the Tottenham Hotspur captain, is South Korea's iconic leader and goal threat. Kim Min-jae provides world-class defensive quality at center-back, and Lee Kang-in's creative midfield play has become increasingly important. The 2026 tournament is widely expected to be Son's final World Cup.",
      },
      {
        question: "What is South Korea's World Cup record?",
        answer: "South Korea have made eleven consecutive World Cup appearances. Their greatest achievement was co-hosting the 2002 tournament and reaching the semi-finals — the best result by any Asian nation in World Cup history. They famously beat Germany 2-0 in 2018 and Portugal in a dramatic 2022 qualifier.",
      },
    ],
  },
  denmark: {
    slug: "denmark",
    name: "Denmark",
    group: "A",
    faqs: [
      {
        question: "Will Denmark qualify from the group stage at World Cup 2026?",
        answer: "Denmark qualified via the playoff route but are a strong side who should be competitive for second place in Group A. Their tactical cohesion under Kasper Hjulmand and squad continuity — featuring Christian Eriksen and Pierre-Emile Hojbjerg — make them genuine contenders to advance, most likely in second place behind Mexico.",
      },
      {
        question: "Who is Denmark's best player at World Cup 2026?",
        answer: "Christian Eriksen remains Denmark's creative heartbeat — his return from a cardiac arrest at Euro 2020 is one of football's most inspiring stories, and his set-piece delivery and passing vision are crucial. Pierre-Emile Hojbjerg provides midfield energy, and the squad's collective identity means no single player carries the full burden.",
      },
      {
        question: "What is Denmark's World Cup record?",
        answer: "Denmark have appeared in six World Cups, reaching the quarter-finals in 1998. Known as 'Danish Dynamite' in the 1980s for their attacking football, the modern team is renowned for collective discipline under Kasper Hjulmand. Their Euro 2020 semi-final run — following Christian Eriksen's cardiac arrest — was one of football's most emotional campaigns.",
      },
    ],
  },

  // ─── GROUP B ────────────────────────────────────────────────────────────────
  switzerland: {
    slug: "switzerland",
    name: "Switzerland",
    group: "B",
    faqs: [
      {
        question: "Will Switzerland qualify from the group stage at World Cup 2026?",
        answer: "Switzerland are strong favorites to qualify from Group B alongside Italy. As the seeded team in the group, their tactical solidity, squad depth, and track record of major tournament advancement (they've reached the knockout rounds in recent World Cups) make qualification the minimum expectation under Murat Yakin.",
      },
      {
        question: "Who is Switzerland's best player at World Cup 2026?",
        answer: "Granit Xhaka's evolution at Bayer Leverkusen into one of Europe's best midfielders makes him Switzerland's most important player. Xherdan Shaqiri brings veteran experience, and the goalkeeper Yann Sommer (or his successor) has been consistently world-class. Switzerland's strength is their collective system rather than a single star.",
      },
      {
        question: "What is Switzerland's World Cup record?",
        answer: "Switzerland have appeared in 13 World Cups, reaching the quarter-finals three times (1934, 1938, 1954). In the modern era, they are consistent Round of 16 participants. Their most notable recent achievement was beating reigning European champions Italy in World Cup 2022 qualifying, denying the Azzurri a spot at the tournament.",
      },
    ],
  },
  canada: {
    slug: "canada",
    name: "Canada",
    group: "B",
    faqs: [
      {
        question: "Will Canada qualify from the group stage at World Cup 2026?",
        answer: "Canada are co-hosts of the 2026 World Cup and carry significant home advantage in Group B. With Alphonso Davies (Bayern Munich) and Jonathan David, they have genuine world-class quality. Their path to advancing as second or third — behind Italy and Switzerland — depends on Jonathan David's goal-scoring form and the home crowd's ability to inspire performances in tight matches.",
      },
      {
        question: "Who is Canada's best player at World Cup 2026?",
        answer: "Alphonso Davies is Canada's most world-famous player — Bayern Munich's left-back is regarded as one of the world's best in his position. Jonathan David's extraordinary goal-scoring record in European football makes him the team's most reliable goal threat. Together, they represent Canada's best-ever attacking combination.",
      },
      {
        question: "What is Canada's World Cup record?",
        answer: "Canada have appeared in two FIFA World Cups. Their debut in 1986 saw them exit in the group stage without scoring. Their 2022 return after 36 years — the first time they qualified as outright CONCACAF winners — also ended in the group stage, but their performances showed a team ready to compete. 2026 is Canada's first home World Cup.",
      },
    ],
  },
  qatar: {
    slug: "qatar",
    name: "Qatar",
    group: "B",
    faqs: [
      {
        question: "Will Qatar qualify from the group stage at World Cup 2026?",
        answer: "Qatar face significant challenges qualifying from Group B without home advantage. Their 2022 squad was built specifically for a home tournament; without that advantage, they face the established quality of Italy and Switzerland as significant favorites. Qatar's best hope is to take points from one of the group's weaker matches and make every game as uncomfortable as possible.",
      },
      {
        question: "Who is Qatar's best player at World Cup 2026?",
        answer: "Al-Moez Ali remains Qatar's most dangerous attacking player — the striker developed through the Aspire Academy system has shown quality at Asian level. Akram Afif provides creative quality from wide positions. Qatar's strength comes from their collectively drilled system rather than individual world-class players.",
      },
      {
        question: "What is Qatar's World Cup record?",
        answer: "Qatar made their only World Cup appearance as hosts in 2022, becoming the first host nation to exit in the group stage. They lost to Ecuador and Senegal before beating the Netherlands-eliminated spot. Their 2026 campaign represents their first World Cup appearance without home advantage.",
      },
    ],
  },
  italy: {
    slug: "italy",
    name: "Italy",
    group: "B",
    faqs: [
      {
        question: "Will Italy qualify from the group stage at World Cup 2026?",
        answer: "Italy are the favorites to top Group B. After the humiliation of missing the 2022 World Cup — eliminated in a playoff by North Macedonia — Luciano Spalletti's rebuild has produced a motivated, younger squad hungry to restore Italy's global standing. Switzerland are the main competition, but Italy's talent depth should see them through.",
      },
      {
        question: "Who is Italy's best player at World Cup 2026?",
        answer: "Italy's squad has no single dominant star but rather world-class quality across positions. Federico Dimarco brings creative quality from left wing-back. Sandro Tonali provides midfield dynamism when available. The new generation of Serie A forwards means Italy have goal threats from multiple positions — a strength of Spalletti's collective approach.",
      },
      {
        question: "What is Italy's World Cup record?",
        answer: "Italy are four-time World Cup champions, winning in 1934, 1938, 1966, and 2006. They are also four-time European champions. The shock failure to qualify for the 2018 and 2022 World Cups was the lowest point in Italian football history. Their return to the 2026 tournament is one of the competition's great comeback stories.",
      },
    ],
  },

  // ─── GROUP C ────────────────────────────────────────────────────────────────
  morocco: {
    slug: "morocco",
    name: "Morocco",
    group: "C",
    faqs: [
      {
        question: "Will Morocco qualify from the group stage at World Cup 2026?",
        answer: "Morocco are the seeded team in Group C and are strong favorites to advance. As 2022 semi-finalists — the first African team to reach the World Cup last four — Walid Regragui's squad brings extraordinary experience and tactical sophistication. They should advance comfortably, likely in second place behind Brazil, unless they can spring the group's defining upset.",
      },
      {
        question: "Who is Morocco's best player at World Cup 2026?",
        answer: "Achraf Hakimi (Paris Saint-Germain) is Morocco's most influential player — a world-class right wing-back who combines elite defensive work with explosive attacking contributions. Sofyan Amrabat's midfield power and Yassine Bounou's goalkeeping quality are also central to Morocco's system.",
      },
      {
        question: "What is Morocco's World Cup record?",
        answer: "Morocco have appeared in seven World Cups and made history in 2022 by becoming the first African nation to reach the semi-finals. They eliminated Spain and Portugal en route before narrowly losing to eventual champions France. Their run in Qatar 2022 changed the global conversation about African football forever.",
      },
    ],
  },
  brazil: {
    slug: "brazil",
    name: "Brazil",
    group: "C",
    faqs: [
      {
        question: "Will Brazil qualify from the group stage at World Cup 2026?",
        answer: "Brazil are heavy favorites to top Group C, which also contains Morocco, Scotland, and Haiti. As five-time world champions and one of the tournament's top three favorites overall, the Seleção should advance easily. The more important question for Brazil is their form entering the knockout rounds.",
      },
      {
        question: "Who is Brazil's best player at World Cup 2026?",
        answer: "Vinicius Junior (Real Madrid) is Brazil's most dangerous attacking weapon — his pace, dribbling, and finishing make him one of the two or three best players in world football. Rodrygo provides additional attacking quality, while Ederson's world-class goalkeeping gives Brazil security at the back.",
      },
      {
        question: "What is Brazil's World Cup record?",
        answer: "Brazil are the most successful nation in World Cup history, winning five titles (1958, 1962, 1970, 1994, 2002). They have appeared in every World Cup ever held and are consistently among the tournament's top three favorites. Their last title came in 2002 in South Korea/Japan with Ronaldo's famous tournament.",
      },
    ],
  },
  scotland: {
    slug: "scotland",
    name: "Scotland",
    group: "C",
    faqs: [
      {
        question: "Will Scotland qualify from the group stage at World Cup 2026?",
        answer: "Scotland face a very difficult Group C alongside Brazil, Morocco, and Haiti. Qualification would require extraordinary performances against Brazil and Morocco, two of the world's elite teams. Scotland's most realistic target is competitive showings that reflect well on Scottish football and, potentially, points in the Haiti match. Advancing from this group would be one of football's greatest upsets.",
      },
      {
        question: "Who is Scotland's best player at World Cup 2026?",
        answer: "Andrew Robertson (Liverpool) is Scotland's world-class left-back — one of the best in his position in world football. Scott McTominay's physicality and goal contributions from midfield have made him Scotland's most important outfield influence. Kieran Tierney provides additional defensive quality and energy.",
      },
      {
        question: "What is Scotland's World Cup record?",
        answer: "Scotland have appeared in eight World Cups but have never advanced beyond the group stage. Their last appearance was in 1998 in France. The 2026 tournament marks Scotland's return after a 28-year absence, making it one of the competition's most anticipated national returns.",
      },
    ],
  },
  haiti: {
    slug: "haiti",
    name: "Haiti",
    group: "C",
    faqs: [
      {
        question: "Will Haiti qualify from the group stage at World Cup 2026?",
        answer: "Haiti face a very challenging Group C alongside Brazil, Morocco, and Scotland. Advancing from the group would be an extraordinary achievement given the quality of opponents. Haiti's goals are to represent their nation with distinction, compete with spirit in every match, and create moments that inspire the next generation of Haitian footballers.",
      },
      {
        question: "Who is Haiti's best player at World Cup 2026?",
        answer: "Haiti's squad is built on collective effort rather than a single star. Their French-based players bring technical quality above their FIFA ranking. The squad's shared experience of qualifying for only their second-ever World Cup creates a unity and motivation that is their greatest asset.",
      },
      {
        question: "What is Haiti's World Cup record?",
        answer: "Haiti made their only previous World Cup appearance in 1974 in West Germany. Emmanuel Sanon scored one of the tournament's most celebrated goals, beating Italy's legendary goalkeeper Dino Zoff — a moment still celebrated in Haiti. The 2026 tournament is their second-ever World Cup appearance.",
      },
    ],
  },

  // ─── GROUP D ────────────────────────────────────────────────────────────────
  usa: {
    slug: "usa",
    name: "United States",
    group: "D",
    faqs: [
      {
        question: "Will the USA qualify from the group stage at World Cup 2026?",
        answer: "The USA are heavy favorites to top Group D on home soil. As co-hosts with the strongest squad in USMNT history, Mauricio Pochettino's side should advance comfortably. Their home advantage, European club quality throughout the roster, and the high expectations of a footballing nation coming of age make them one of the tournament's most compelling stories.",
      },
      {
        question: "Who is the USA's best player at World Cup 2026?",
        answer: "Christian Pulisic (AC Milan) is the USMNT's most important player — a creative attacker who brings Champions League experience and Premier League pedigree. Gio Reyna provides creative unpredictability when fit, and Tyler Adams' midfield leadership gives the team its tactical foundation.",
      },
      {
        question: "What is the USA's World Cup record?",
        answer: "The United States have appeared in eleven World Cups, with their best finish being the quarter-finals in 2002 (South Korea/Japan). As co-hosts in 2026, they carry enormous expectation and the infrastructure of a football revolution that has been building since the 1994 home World Cup. They missed the 2018 tournament entirely.",
      },
    ],
  },
  paraguay: {
    slug: "paraguay",
    name: "Paraguay",
    group: "D",
    faqs: [
      {
        question: "Will Paraguay qualify from the group stage at World Cup 2026?",
        answer: "Paraguay face a tough Group D with USA, Turkey, and Australia. Their path to qualifying requires beating the group's weaker opponents and hoping for results to fall their way. Paraguay's defensive resilience and South American qualifying experience make them competitive, but the USA's home advantage and Turkey's individual quality make second place difficult.",
      },
      {
        question: "Who is Paraguay's best player at World Cup 2026?",
        answer: "Paraguay's strength lies in collective organization rather than individual stars. Their squad, developed through the rigorous South American qualifying campaign, is built on defensive discipline, physical intensity, and team unity under organized coaching.",
      },
      {
        question: "What is Paraguay's World Cup record?",
        answer: "Paraguay have appeared in nine World Cups, reaching the quarter-finals in 2010 in South Africa — their best-ever finish. That run included a dramatic penalty win over Japan. They are one of South America's most consistent qualifiers but have never gone beyond the quarter-final stage.",
      },
    ],
  },
  australia: {
    slug: "australia",
    name: "Australia",
    group: "D",
    faqs: [
      {
        question: "Will Australia qualify from the group stage at World Cup 2026?",
        answer: "Australia are competitive in Group D and have a genuine chance of advancing, based on their 2022 quarter-final run and improving squad quality. Their most likely path is second or third in the group behind the USA. The Turkey match is decisive — the Socceroos need to outperform Turkey to secure a top-two finish.",
      },
      {
        question: "Who is Australia's best player at World Cup 2026?",
        answer: "Mitchell Duke's physical presence and leadership up front are central to Australia's attacking system. Goalkeeper Mat Ryan brings Major League Soccer and European championship experience. The squad's European-based players — particularly those in the Bundesliga and Championship — provide technical quality throughout.",
      },
      {
        question: "What is Australia's World Cup record?",
        answer: "Australia have appeared in six World Cups. Their best finish was the quarter-finals in 2006 in Germany. More recently, they reached the quarter-finals of the 2022 World Cup in Qatar, beating Denmark and Tunisia before losing narrowly to Argentina. The Socceroos are now consistent tournament performers.",
      },
    ],
  },
  turkey: {
    slug: "turkey",
    name: "Turkey",
    group: "D",
    faqs: [
      {
        question: "Will Turkey qualify from the group stage at World Cup 2026?",
        answer: "Turkey are the group's most dangerous challenger to USA's dominance and are strong favorites for second place in Group D. Hakan Çalhanoğlu's creative control and Ferdi Kadıoğlu's wing-back quality give Turkey the tactical tools to compete with any opponent. Vincenzo Montella's coaching experience adds sophistication to their system.",
      },
      {
        question: "Who is Turkey's best player at World Cup 2026?",
        answer: "Hakan Çalhanoğlu (Inter Milan) has transformed into one of Europe's best deep-lying playmakers and is Turkey's most important player. Ferdi Kadıoğlu provides world-class quality at left wing-back, and Kerem Aktürkoğlu's pace and dribbling create danger from wide positions.",
      },
      {
        question: "What is Turkey's World Cup record?",
        answer: "Turkey have appeared in three World Cups, with their greatest achievement being third place at the 2002 World Cup in South Korea/Japan — Hakan Şükür famously scored the fastest goal in World Cup history (11 seconds) against South Korea in the third-place play-off. Their 2026 squad aims to match that generation's achievement.",
      },
    ],
  },

  // ─── GROUP E ────────────────────────────────────────────────────────────────
  germany: {
    slug: "germany",
    name: "Germany",
    group: "E",
    faqs: [
      {
        question: "Will Germany qualify from the group stage at World Cup 2026?",
        answer: "Germany are the overwhelming favorites to top Group E. Under Julian Nagelsmann's progressive coaching system, with Jamal Musiala and Florian Wirtz leading the attack, Germany should advance comfortably. Their recent back-to-back group exits in 2018 and 2022 create extra psychological motivation to prove those were anomalies rather than a trend.",
      },
      {
        question: "Who is Germany's best player at World Cup 2026?",
        answer: "Jamal Musiala (Bayern Munich) is Germany's most exciting talent — a technically brilliant attacking midfielder with world-class dribbling, vision, and composure. Florian Wirtz provides similar creative quality from a different angle. Toni Rüdiger's defensive authority and experience complement the younger attacking talents.",
      },
      {
        question: "What is Germany's World Cup record?",
        answer: "Germany are four-time World Cup champions (1954, 1974, 1990, 2014), with 20 total appearances. Their 2014 triumph — the famous 7-1 semi-final win over Brazil remains one of football's most astonishing results. Their back-to-back group exits in 2018 and 2022 were the worst modern World Cup record for the nation.",
      },
    ],
  },
  "ivory-coast": {
    slug: "ivory-coast",
    name: "Ivory Coast",
    group: "E",
    faqs: [
      {
        question: "Will Ivory Coast qualify from the group stage at World Cup 2026?",
        answer: "Ivory Coast are strong contenders for second place in Group E, having won the 2023 Africa Cup of Nations in dramatic fashion on home soil. Emerse Faé's squad has shown the character to come back from adversity. Their targets are second place behind Germany and a place in the Round of 32.",
      },
      {
        question: "Who is Ivory Coast's best player at World Cup 2026?",
        answer: "Sébastien Haller provides a powerful physical presence as the target striker, while Simon Adingra's electric pace on the wing creates consistent danger. Franck Kessié's box-to-box midfield quality adds competitive depth. The AFCON 2023 title was won through collective excellence rather than individual brilliance.",
      },
      {
        question: "What is Ivory Coast's World Cup record?",
        answer: "Ivory Coast have appeared in four World Cups (2006, 2010, 2014, 2026), reaching the Round of 16 once. The so-called 'Golden Generation' of Didier Drogba, Yaya Touré, and the Touré brothers were consistently drawn into difficult groups. The current squad, under Emerse Faé, has rebuilt with new talent and the hunger of AFCON champions.",
      },
    ],
  },
  ecuador: {
    slug: "ecuador",
    name: "Ecuador",
    group: "E",
    faqs: [
      {
        question: "Will Ecuador qualify from the group stage at World Cup 2026?",
        answer: "Ecuador are competitive in Group E and have a realistic chance of advancing as second or qualifying through the best third-place route. Their track record of solid World Cup campaigns — including beating hosts Qatar in the 2022 opener — shows they can compete at this level. The Ivory Coast match is their decisive game.",
      },
      {
        question: "Who is Ecuador's best player at World Cup 2026?",
        answer: "Enner Valencia is Ecuador's all-time leading scorer and provides veteran leadership and positional intelligence in attack. Ecuador's emerging European-based players add technical quality. Coach Sebastián Beccacece has instilled Argentine tactical discipline throughout the squad.",
      },
      {
        question: "What is Ecuador's World Cup record?",
        answer: "Ecuador have appeared in four World Cups (2002, 2006, 2014, 2022). Their best finish was the Round of 16 in 2006. At the 2022 World Cup, they famously beat hosts Qatar in the tournament opener — one of the competition's signature moments. Ecuador consistently qualify from CONMEBOL as reliable performers.",
      },
    ],
  },
  curacao: {
    slug: "curacao",
    name: "Curaçao",
    group: "E",
    faqs: [
      {
        question: "Will Curaçao qualify from the group stage at World Cup 2026?",
        answer: "Curaçao face an extremely challenging Group E alongside Germany, Ivory Coast, and Ecuador. Advancing from the group stage would be a miraculous achievement for a nation of approximately 150,000 people. Their World Cup debut is a historic celebration of what small nations can achieve through dedication and development.",
      },
      {
        question: "Who is Curaçao's best player at World Cup 2026?",
        answer: "Curaçao's squad draws heavily on players who qualified through the Dutch football development system due to the island's status as part of the Kingdom of the Netherlands. The team's strength is their collective spirit and determination rather than individual world-class players at this stage of their development.",
      },
      {
        question: "What is Curaçao's World Cup record?",
        answer: "The 2026 FIFA World Cup is Curaçao's debut at the tournament finals. With a population of approximately 150,000, they are one of the smallest nations ever to qualify for the World Cup, making their presence an historic milestone for CONCACAF and Caribbean football.",
      },
    ],
  },

  // ─── GROUP F ────────────────────────────────────────────────────────────────
  netherlands: {
    slug: "netherlands",
    name: "Netherlands",
    group: "F",
    faqs: [
      {
        question: "Will the Netherlands qualify from the group stage at World Cup 2026?",
        answer: "The Netherlands are the seeded team in Group F and are strong favorites to advance, likely as group winners. Under Ronald Koeman's system built around Virgil Van Dijk's defensive authority, Oranje should navigate Group F's challenges. Their quarter-final in 2022 showed they have the quality to go deep in this tournament.",
      },
      {
        question: "Who is the Netherlands' best player at World Cup 2026?",
        answer: "Virgil Van Dijk (Liverpool) is one of the world's best center-backs and the foundation of the Dutch defensive system. Cody Gakpo provides attacking versatility and goals from wide positions. The squad's collective Premier League and European experience gives them a quality platform throughout.",
      },
      {
        question: "What is the Netherlands' World Cup record?",
        answer: "The Netherlands have reached the World Cup final three times (1974, 1978, 2010) without winning, making them the most successful nation never to have won the title. The 1974 generation of Johan Cruyff invented 'Total Football'. Their most recent final was in 2010, where they lost to Spain's only World Cup title.",
      },
    ],
  },
  japan: {
    slug: "japan",
    name: "Japan",
    group: "F",
    faqs: [
      {
        question: "Will Japan qualify from the group stage at World Cup 2026?",
        answer: "Japan are strong favorites to advance from Group F, most likely in second place behind the Netherlands. Their 2022 tournament — in which they topped a group containing Germany and Spain — showed a team capable of the highest upsets. Hajime Moriyasu's tactical system and Japan's European club depth make them genuine competitors.",
      },
      {
        question: "Who is Japan's best player at World Cup 2026?",
        answer: "Japan's strength is their collective system rather than a single player, but Takehiro Tomiyasu (Arsenal), Ritsu Doan, and Junya Ito represent world-class quality at club level. The squad's near-total European club experience — particularly Bundesliga representation — gives Japan a technical foundation that previous generations lacked.",
      },
      {
        question: "What is Japan's World Cup record?",
        answer: "Japan have appeared in eight World Cups, consistently reaching the knockout stages in their modern era. Their greatest performance was the 2022 tournament, where they topped a group containing Germany and Spain before losing to Croatia in the Round of 16. They previously co-hosted with South Korea in 2002.",
      },
    ],
  },
  tunisia: {
    slug: "tunisia",
    name: "Tunisia",
    group: "F",
    faqs: [
      {
        question: "Will Tunisia qualify from the group stage at World Cup 2026?",
        answer: "Tunisia face a very competitive Group F alongside the Netherlands, Japan, and Ukraine. Qualifying would require Tunisia to outperform at least two stronger nations — a significant challenge given their historical limitation of never advancing beyond the group stage in six World Cup appearances.",
      },
      {
        question: "Who is Tunisia's best player at World Cup 2026?",
        answer: "Tunisia's squad is built on collective defensive organization rather than individual world-class players. Their Eagles of Carthage identity relies on tactical discipline, physical intensity, and the ability to frustrate more talented opponents. Youssef Msakni has provided creative quality in recent tournaments.",
      },
      {
        question: "What is Tunisia's World Cup record?",
        answer: "Tunisia have appeared in six World Cups without ever advancing beyond the group stage. Their most celebrated moment was holding eventual runners-up France to a goalless draw in 2022. In 1978, they became the first African team to win a World Cup match, beating Mexico.",
      },
    ],
  },
  ukraine: {
    slug: "ukraine",
    name: "Ukraine",
    group: "F",
    faqs: [
      {
        question: "Will Ukraine qualify from the group stage at World Cup 2026?",
        answer: "Ukraine have a genuine chance of advancing from Group F. Their World Cup return carries extraordinary emotional weight — their qualification campaign represented a nation's defiance during an ongoing conflict. Mykhailo Mudryk's individual brilliance and Oleksandr Zinchenko's technical quality give Ukraine competitive tools.",
      },
      {
        question: "Who is Ukraine's best player at World Cup 2026?",
        answer: "Mykhailo Mudryk (Chelsea) is Ukraine's most exciting attacking talent — his pace, dribbling, and increasing goal contributions make him one of Europe's most watchable wingers. Oleksandr Zinchenko (Arsenal) provides creative quality and leadership from his wing-back role, shaped by Pep Guardiola's positional philosophy.",
      },
      {
        question: "What is Ukraine's World Cup record?",
        answer: "Ukraine have appeared in three World Cups (2006, 2014, 2026). Their best performance was a quarter-final in 2006 in Germany, where they were eliminated by eventual champions Italy. Their 2026 qualification carried exceptional symbolic weight given Ukraine's national circumstances.",
      },
    ],
  },

  // ─── GROUP G ────────────────────────────────────────────────────────────────
  portugal: {
    slug: "portugal",
    name: "Portugal",
    group: "G",
    faqs: [
      {
        question: "Will Portugal qualify from the group stage at World Cup 2026?",
        answer: "Portugal are the seeded team in Group G and strong favorites to advance as group winners. Roberto Martínez's squad — featuring Bernardo Silva, Rafael Leão, and a deep pool of European-based talent — should handle Iran and Egypt comfortably. The Belgium match is the defining game for group leadership.",
      },
      {
        question: "Who is Portugal's best player at World Cup 2026?",
        answer: "Bernardo Silva (Manchester City) is Portugal's most complete and important player — his technical brilliance, work rate, and leadership are the foundation of the team's play. Rafael Leão provides explosive attacking pace. Rúben Dias anchors the defense with Premier League authority. Cristiano Ronaldo may participate at 41 in a reduced role.",
      },
      {
        question: "What is Portugal's World Cup record?",
        answer: "Portugal have appeared in eight World Cups, with their best finish being third place in 1966 — Eusébio's famous tournament. More recently, they won Euro 2016 and reached the 2022 quarter-finals before losing to Morocco. Portugal have never won the World Cup despite consistently producing world-class talent.",
      },
    ],
  },
  iran: {
    slug: "iran",
    name: "Iran",
    group: "G",
    faqs: [
      {
        question: "Will Iran qualify from the group stage at World Cup 2026?",
        answer: "Iran face a very difficult Group G alongside Portugal and Belgium, two of the world's top-eight ranked teams. Qualifying would be a major achievement. Iran's best targets are competitive performances, potentially including points against Egypt, and making their matches against the European giants as uncomfortable as possible.",
      },
      {
        question: "Who is Iran's best player at World Cup 2026?",
        answer: "Sardar Azmoun is Iran's most technically gifted player — the striker who has played in Russia and Germany brings quality that exceeds typical Asian football standards. Iran's system under Amir Ghalenoei is built on collective defensive organization with quick transitions through Azmoun's technical quality.",
      },
      {
        question: "What is Iran's World Cup record?",
        answer: "Iran have appeared in six World Cups, never advancing beyond the group stage. Their most famous World Cup moment was a 2-1 win over the United States in 1998 in France, charged with political significance. In 2022, they beat Wales 2-0 before narrow defeats eliminated them in the group stage.",
      },
    ],
  },
  belgium: {
    slug: "belgium",
    name: "Belgium",
    group: "G",
    faqs: [
      {
        question: "Will Belgium qualify from the group stage at World Cup 2026?",
        answer: "Belgium are strong favorites to advance from Group G, likely in second place behind Portugal. Kevin De Bruyne, Romelu Lukaku, and Thibaut Courtois give Belgium world-class quality in attacking and goalkeeping positions. Domenico Tedesco's tactical structure should be enough to advance, though Portugal will push for group leadership.",
      },
      {
        question: "Who is Belgium's best player at World Cup 2026?",
        answer: "Kevin De Bruyne (Manchester City) is Belgium's creative genius — one of the world's best midfielders, capable of unlocking any defense with passes others don't see as possible. Romelu Lukaku provides the most dangerous goalscoring threat when fit. Thibaut Courtois' goalkeeping is world-class.",
      },
      {
        question: "What is Belgium's World Cup record?",
        answer: "Belgium have appeared in 14 World Cups, finishing third in 2018. Their golden generation — De Bruyne, Hazard, Lukaku, Courtois — was ranked world number one for several years. Despite the talent, the trophy cabinet remains empty at the highest level — the definition of a golden generation's unfulfilled potential.",
      },
    ],
  },
  egypt: {
    slug: "egypt",
    name: "Egypt",
    group: "G",
    faqs: [
      {
        question: "Will Egypt qualify from the group stage at World Cup 2026?",
        answer: "Egypt face a tough Group G with Portugal and Belgium, the world's 6th and 8th ranked teams. Their advancement depends heavily on Mohamed Salah's form and fitness, and on taking points from the Iran match. Qualification would be a significant achievement; Egypt's ceiling in this group is third place with a potential best-third-team slot.",
      },
      {
        question: "Who is Egypt's best player at World Cup 2026?",
        answer: "Mohamed Salah (Liverpool) is Egypt's greatest-ever player — a three-time Premier League Golden Boot winner whose goal-scoring and creativity are among the world's very best. Egypt's World Cup 2026 campaign lives and dies on Salah's form and fitness. Goalkeeper Mohamed El Shenawy provides reliable quality in goal.",
      },
      {
        question: "What is Egypt's World Cup record?",
        answer: "Egypt have appeared in three World Cups (1934, 1990, 2026), with a significant gap between their appearances. Their 1990 campaign in Italy saw them finish third in their group without advancing. The 2026 tournament ends a 36-year absence from the World Cup. Egypt are seven-time Africa Cup of Nations champions.",
      },
    ],
  },

  // ─── GROUP H ────────────────────────────────────────────────────────────────
  spain: {
    slug: "spain",
    name: "Spain",
    group: "H",
    faqs: [
      {
        question: "Will Spain qualify from the group stage at World Cup 2026?",
        answer: "Spain are the overwhelming favorites to top Group H. As Euro 2024 champions and one of the world's three or four best teams, La Roja should advance from a group containing Serbia, Saudi Arabia, and Cabo Verde with maximum or near-maximum points. Spain's goal is to win the entire tournament, not just the group.",
      },
      {
        question: "Who is Spain's best player at World Cup 2026?",
        answer: "Lamine Yamal, who was 17 at Euro 2024 and will be 19 at the 2026 World Cup, has emerged as Spain's most electrifying player — and potentially one of the world's best. Pedri provides creative midfield control, Rodri offers positional mastery, and Álvaro Morata brings experienced goal-scoring leadership.",
      },
      {
        question: "What is Spain's World Cup record?",
        answer: "Spain are World Cup champions, having won their only title in 2010 in South Africa — defeating the Netherlands 1-0 in extra time with Andrés Iniesta's goal. They are also four-time European champions, with Euro 2024 adding to their collection. Spain are consistently one of global football's two or three dominant nations.",
      },
    ],
  },
  "cabo-verde": {
    slug: "cabo-verde",
    name: "Cabo Verde",
    group: "H",
    faqs: [
      {
        question: "Will Cabo Verde qualify from the group stage at World Cup 2026?",
        answer: "Cabo Verde face an extremely challenging Group H with Spain, Serbia, and Saudi Arabia. Advancing would be one of the World Cup's greatest-ever achievements for a nation of 550,000 people. Their debut is a celebration of what small island nations can achieve through dedication, the Portuguese football pipeline, and national unity.",
      },
      {
        question: "Who is Cabo Verde's best player at World Cup 2026?",
        answer: "Cabo Verde's squad draws on players based in the Portuguese football league and other European leagues, connected through the nation's historical ties to Portugal. The team's collective spirit and their Portuguese-based technical quality are their greatest assets at this level of competition.",
      },
      {
        question: "What is Cabo Verde's World Cup record?",
        answer: "2026 is Cabo Verde's debut appearance at the FIFA World Cup finals. The Cape Verde Islands have a population of approximately 550,000 and represent one of the smallest nations ever to qualify for the tournament. Their qualification from the African confederation is a historic first for the Atlantic island nation.",
      },
    ],
  },
  "saudi-arabia": {
    slug: "saudi-arabia",
    name: "Saudi Arabia",
    group: "H",
    faqs: [
      {
        question: "Will Saudi Arabia qualify from the group stage at World Cup 2026?",
        answer: "Saudi Arabia face a tough Group H with Spain, Serbia, and Cabo Verde. Their most realistic path to advancement is through the best third-place route. However, Saudi Arabia proved in 2022 that they can shock anyone — their 2-1 win over defending champions Argentina is the blueprint for how they approach big matches.",
      },
      {
        question: "Who is Saudi Arabia's best player at World Cup 2026?",
        answer: "Salem Al-Dawsari scored the famous winning goal against Argentina in 2022 and continues as Saudi Arabia's most celebrated attacker. Saleh Al-Shehri also scored in that historic match. Saudi Arabia's squad has benefited from the Saudi Pro League's investment in bringing world-class coaches and playing standards to the domestic game.",
      },
      {
        question: "What is Saudi Arabia's World Cup record?",
        answer: "Saudi Arabia have appeared in seven World Cups, with their best finish being the Round of 16 in 1994. Their most famous moment is the 2-1 win over defending champions Argentina at the 2022 World Cup in Qatar — one of the greatest upsets in World Cup history.",
      },
    ],
  },
  serbia: {
    slug: "serbia",
    name: "Serbia",
    group: "H",
    faqs: [
      {
        question: "Will Serbia qualify from the group stage at World Cup 2026?",
        answer: "Serbia are strong favorites to qualify as second in Group H behind Spain. With Dušan Vlahović, Sergej Milinković-Savić, and a squad packed with Premier League and Serie A quality, Serbia should have enough to see off Saudi Arabia and Cabo Verde comfortably. The Spain match will test their ceiling.",
      },
      {
        question: "Who is Serbia's best player at World Cup 2026?",
        answer: "Dušan Vlahović (Juventus) is Serbia's most dangerous player — a physically powerful striker with exceptional finishing ability and one of football's most powerful shots. Sergej Milinković-Savić provides midfield quality and athleticism. Together they give Serbia the best individual quality in the group behind Spain.",
      },
      {
        question: "What is Serbia's World Cup record?",
        answer: "Serbia (as an independent nation since 2006) have appeared in three World Cups, with their best result being the group stage. As Yugoslavia, the nation reached the semi-finals in 1930 and 1962. The current Serbian squad carries the talent to go further than any previous Serbia national team.",
      },
    ],
  },

  // ─── GROUP I ────────────────────────────────────────────────────────────────
  france: {
    slug: "france",
    name: "France",
    group: "I",
    faqs: [
      {
        question: "Will France qualify from the group stage at World Cup 2026?",
        answer: "France are certainties to top Group I and one of the two or three most likely World Cup 2026 champions overall. With Kylian Mbappé, Antoine Griezmann, and the world's deepest squad, Didier Deschamps' side should advance from the group with nine points and peak for the knockout rounds.",
      },
      {
        question: "Who is France's best player at World Cup 2026?",
        answer: "Kylian Mbappé (Real Madrid) is widely considered one of the world's two best players — alongside Erling Haaland — entering the 2026 World Cup. He scored a hat-trick in the 2022 final. Antoine Griezmann's tactical intelligence and Eduardo Camavinga's midfield quality give France depth Mbappé's greatness.",
      },
      {
        question: "What is France's World Cup record?",
        answer: "France are two-time World Cup champions (1998 at home, 2018 in Russia). They reached the 2022 final in Qatar, losing to Argentina on penalties after a 3-3 draw in which Mbappé scored a hat-trick. France are consistently one of world football's two or three most dominant nations in major tournaments.",
      },
    ],
  },
  senegal: {
    slug: "senegal",
    name: "Senegal",
    group: "I",
    faqs: [
      {
        question: "Will Senegal qualify from the group stage at World Cup 2026?",
        answer: "Senegal are strong favorites to advance from Group I as second behind France. As reigning AFCON champions, Aliou Cissé's side have the tactical organization, physical quality, and tournament experience to progress. The Norway match is the decisive secondary battle — both nations will target second place.",
      },
      {
        question: "Who is Senegal's best player at World Cup 2026?",
        answer: "Sadio Mané remains Senegal's iconic figure — even if his best individual days may be behind him, his leadership, experience, and ability to produce decisive moments in tight matches remain central. Édouard Mendy's world-class goalkeeping and Ismaïla Sarr's pace on the wing provide additional quality throughout.",
      },
      {
        question: "What is Senegal's World Cup record?",
        answer: "Senegal have appeared in three World Cups (2002, 2022, 2026). Their best result was the 2002 quarter-finals, when they stunned defending champions France in the group stage with Papa Bouba Diop's famous goal. They are reigning Africa Cup of Nations champions and Africa's most complete international team.",
      },
    ],
  },
  norway: {
    slug: "norway",
    name: "Norway",
    group: "I",
    faqs: [
      {
        question: "Will Norway qualify from the group stage at World Cup 2026?",
        answer: "Norway have a genuine chance of advancing from Group I as second behind France, primarily driven by Erling Haaland's extraordinary goal-scoring. The Senegal match is decisive — whoever wins between Norway and Senegal takes the second automatic spot. Martin Ødegaard's creative quality gives Norway the foundation to compete.",
      },
      {
        question: "Who is Norway's best player at World Cup 2026?",
        answer: "Erling Haaland (Manchester City) is Norway's — and arguably the world's — most prolific goal-scorer. At 25-26 during the tournament, he will be at his physical peak. Martin Ødegaard (Arsenal) provides world-class creative quality from midfield. Together, they form the most powerful 1-2 combination Norway has ever had.",
      },
      {
        question: "What is Norway's World Cup record?",
        answer: "Norway have appeared in three World Cups (1938, 1994, 1998), with their best finish being the quarter-finals in 1998 in France. Their 2026 return ends a 28-year absence and is almost entirely attributable to Erling Haaland's individual brilliance forcing results in the qualifying campaign.",
      },
    ],
  },

  // ─── GROUP J ────────────────────────────────────────────────────────────────
  argentina: {
    slug: "argentina",
    name: "Argentina",
    group: "J",
    faqs: [
      {
        question: "Will Argentina qualify from the group stage at World Cup 2026?",
        answer: "Argentina are certainties to top Group J as defending world champions. Lionel Scaloni's side — built around Julián Álvarez, Lautaro Martínez, and Rodrigo De Paul — should advance with maximum points from their group containing Algeria, Austria, and Jordan. Argentina's goal is defending the championship.",
      },
      {
        question: "Who is Argentina's best player at World Cup 2026?",
        answer: "Julián Álvarez has established himself as one of the world's most dynamic forwards. Lautaro Martínez provides consistent goals at the highest level. Lionel Messi may participate at 38, potentially in a reduced role, but his leadership remains the squad's most important intangible even if his minutes are managed.",
      },
      {
        question: "What is Argentina's World Cup record?",
        answer: "Argentina are three-time World Cup champions (1978, 1986, 2022). The 2022 triumph in Qatar — with Lionel Messi finally winning the trophy that defined his legacy — was one of football's most emotional achievements. Argentina are consistently among the top two or three favorites for every World Cup they enter.",
      },
    ],
  },
  algeria: {
    slug: "algeria",
    name: "Algeria",
    group: "J",
    faqs: [
      {
        question: "Will Algeria qualify from the group stage at World Cup 2026?",
        answer: "Algeria are the favorites for second place in Group J, with Riyad Mahrez's individual quality and their French-football-pipeline squad giving them an edge over Austria and Jordan. If Mahrez is at his best, Algeria can push further than second — but consistency has historically been their challenge.",
      },
      {
        question: "Who is Algeria's best player at World Cup 2026?",
        answer: "Riyad Mahrez is Algeria's most important player — the winger who won the Premier League and Champions League with Manchester City brings world-class individual quality that can change any match. Ismaël Bennacer provides midfield structure and leadership. Together they give Algeria a quality above their FIFA ranking.",
      },
      {
        question: "What is Algeria's World Cup record?",
        answer: "Algeria have appeared in four World Cups (1982, 1986, 2010, 2014). Their best performance was the 2014 Round of 16, where they pushed eventual champions Germany to extra time before losing 2-1. They are 2019 Africa Cup of Nations champions.",
      },
    ],
  },
  austria: {
    slug: "austria",
    name: "Austria",
    group: "J",
    faqs: [
      {
        question: "Will Austria qualify from the group stage at World Cup 2026?",
        answer: "Austria are competitive in Group J under Ralf Rangnick's high-pressing system. Advancing as second behind Argentina requires beating Algeria and Jordan while potentially taking a point from Argentina — a difficult but not impossible task for a team that has become one of Europe's most tactically coherent sides.",
      },
      {
        question: "Who is Austria's best player at World Cup 2026?",
        answer: "Marcel Sabitzer brings intelligence and work-rate to Austria's midfield under Rangnick's pressing system. David Alaba's (Real Madrid) influence when fit provides world-class quality at left-back. Austria's collective identity under Rangnick means the system is the star — no single player carries the entire burden.",
      },
      {
        question: "What is Austria's World Cup record?",
        answer: "Austria have appeared in seven World Cups, finishing third in 1954. They have not been World Cup regulars in recent decades, making the 2026 appearance significant. Under Ralf Rangnick's modern coaching approach, Austria have become one of European football's most improved national teams.",
      },
    ],
  },
  jordan: {
    slug: "jordan",
    name: "Jordan",
    group: "J",
    faqs: [
      {
        question: "Will Jordan qualify from the group stage at World Cup 2026?",
        answer: "Jordan make their World Cup debut in Group J alongside Argentina, Algeria, and Austria. Qualification would require extraordinary performances against established football nations. Jordan's debut is a historic achievement for Jordanian football and for Asian football's continued global development.",
      },
      {
        question: "Who is Jordan's best player at World Cup 2026?",
        answer: "Jordan's squad combines Jordanian Pro League players with diaspora talent from European leagues. The team's collective organization under Hussein Ammouta is their primary competitive tool. The depth of the squad means this is a nation's team rather than one built around a single star.",
      },
      {
        question: "What is Jordan's World Cup record?",
        answer: "2026 is Jordan's debut FIFA World Cup appearance. The Nashama — Jordan's national team — qualified through the Asian Football Confederation qualifying process in a historic first for the nation. Jordan are regular participants in the AFC Asian Cup and have been steadily improving in continental competitions.",
      },
    ],
  },

  // ─── GROUP K ────────────────────────────────────────────────────────────────
  colombia: {
    slug: "colombia",
    name: "Colombia",
    group: "K",
    faqs: [
      {
        question: "Will Colombia qualify from the group stage at World Cup 2026?",
        answer: "Colombia are strong favorites to top Group K. As Copa América 2024 finalists with a squad ranked in the world's top ten, Néstor Lorenzo's side should advance comfortably. Their form through the Copa América — undefeated, playing brilliant attacking football — makes them one of the tournament's genuine dark-horse title contenders.",
      },
      {
        question: "Who is Colombia's best player at World Cup 2026?",
        answer: "Luis Díaz (Liverpool) is Colombia's most dangerous attacking player — his direct running, dribbling, and goal contributions from the left wing make him one of Europe's most exciting forwards. James Rodríguez provides veteran creative intelligence and set-piece delivery. Dávinson Sánchez anchors the defense.",
      },
      {
        question: "What is Colombia's World Cup record?",
        answer: "Colombia have appeared in seven World Cups, with their best finish being the quarter-finals in 2014 in Brazil. James Rodríguez won the Golden Boot in that tournament with six goals. Colombia are CONMEBOL's second force and consistently produce world-class attacking talent.",
      },
    ],
  },
  cameroon: {
    slug: "cameroon",
    name: "Cameroon",
    group: "K",
    faqs: [
      {
        question: "Will Cameroon qualify from the group stage at World Cup 2026?",
        answer: "Cameroon are the favorites for second place in Group K. Under Marc Brys, the Indomitable Lions have André Onana's world-class goalkeeping, Bryan Mbeumo's goal-scoring form, and the physicality that has always characterized Cameroonian football. Their World Cup experience gives them an edge over Uzbekistan.",
      },
      {
        question: "Who is Cameroon's best player at World Cup 2026?",
        answer: "André Onana (Manchester United) is Cameroon's most prominent player — his sweeper-keeper style and shot-stopping ability, forged in Champions League football, make him elite-level quality. Bryan Mbeumo's Premier League goal-scoring form has attracted interest from Europe's biggest clubs and gives Cameroon a consistent goal threat.",
      },
      {
        question: "What is Cameroon's World Cup record?",
        answer: "Cameroon have appeared in eight World Cups, with their greatest achievement being the quarter-finals in 1990 — the first African team to reach that stage. Roger Milla's performances became iconic. They are five-time Africa Cup of Nations champions and African football's most historic World Cup nation.",
      },
    ],
  },
  uzbekistan: {
    slug: "uzbekistan",
    name: "Uzbekistan",
    group: "K",
    faqs: [
      {
        question: "Will Uzbekistan qualify from the group stage at World Cup 2026?",
        answer: "Uzbekistan make their historic World Cup debut in Group K alongside Colombia, Cameroon, and a playoff team. Advancing from this group would require extraordinary performances. Their realistic target is competitive matches, the inspiration of their historic debut, and possibly points against the playoff qualifier.",
      },
      {
        question: "Who is Uzbekistan's best player at World Cup 2026?",
        answer: "Eldor Shomurodov (Serie A) is Uzbekistan's most prominent European-based player, bringing Italian football experience to the national team's attacking line. The squad's collective organization under Srecko Katanec provides tactical structure for a team competing in their first World Cup.",
      },
      {
        question: "What is Uzbekistan's World Cup record?",
        answer: "2026 is Uzbekistan's debut FIFA World Cup appearance and the first time any Central Asian nation has qualified for the tournament finals. This is a historic milestone for Uzbek football, Central Asian football, and for the AFC's commitment to developing football across the continent.",
      },
    ],
  },

  // ─── GROUP L ────────────────────────────────────────────────────────────────
  england: {
    slug: "england",
    name: "England",
    group: "L",
    faqs: [
      {
        question: "Will England qualify from the group stage at World Cup 2026?",
        answer: "England are the favorites to top Group L and one of the World Cup's top five title contenders. Under Thomas Tuchel's coaching, with Jude Bellingham and Harry Kane leading the attack, England should advance comfortably. The Croatia match is their biggest test — history between the two nations guarantees intensity.",
      },
      {
        question: "Who is England's best player at World Cup 2026?",
        answer: "Jude Bellingham (Real Madrid) has emerged as England's most important player — a complete midfielder with Champions League pedigree, goals from deep, and the leadership quality to carry a team. Harry Kane remains one of the world's most clinical strikers. Phil Foden and Bukayo Saka provide attacking variety.",
      },
      {
        question: "What is England's World Cup record?",
        answer: "England are World Cup champions, having won their only title in 1966 on home soil at Wembley. Since then, they've reached the semi-finals in 1990 and 2018 and are consistent quarter-finalists. The 2026 squad is arguably the most complete England team since 1966, with European club quality throughout.",
      },
    ],
  },
  ghana: {
    slug: "ghana",
    name: "Ghana",
    group: "L",
    faqs: [
      {
        question: "Will Ghana qualify from the group stage at World Cup 2026?",
        answer: "Ghana face a tough Group L with England and Croatia but have the quality to compete for second or third place. Mohammed Kudus's individual brilliance and Thomas Partey's midfield authority give them tools to cause upsets. Their most realistic path involves beating Panama and taking a point from Croatia or England.",
      },
      {
        question: "Who is Ghana's best player at World Cup 2026?",
        answer: "Mohammed Kudus (West Ham) is Ghana's most exciting talent — an explosive attacker combining dribbling, pace, and goals at Premier League level. Thomas Partey (Arsenal) provides the midfield engine and leadership. Together they give Ghana the best player pairing the Black Stars have had in years.",
      },
      {
        question: "What is Ghana's World Cup record?",
        answer: "Ghana have appeared in four World Cups, reaching the quarter-finals in 2010 — where their elimination by Uruguay, in a match involving Luis Suárez's handball and Asamoah Gyan's missed penalty, remains one of World Cup history's most controversial and heartbreaking moments.",
      },
    ],
  },
  croatia: {
    slug: "croatia",
    name: "Croatia",
    group: "L",
    faqs: [
      {
        question: "Will Croatia qualify from the group stage at World Cup 2026?",
        answer: "Croatia are strong favorites to advance from Group L in second place behind England. Zlatko Dalić's Croatia have reached the World Cup final (2018) and third place (2022) — tournament experience that gives them a significant advantage in close matches. Luka Modrić's final World Cup adds motivational fuel to an already experienced squad.",
      },
      {
        question: "Who is Croatia's best player at World Cup 2026?",
        answer: "Luka Modrić (Real Madrid) remains Croatia's creative genius at 40 — his vision, technical quality, and big-game composure are irreplaceable. Mateo Kovačić provides the physical and technical bridge to the next generation. Andrej Kramarić offers consistent goal-scoring quality. Croatia's collective is greater than any individual part.",
      },
      {
        question: "What is Croatia's World Cup record?",
        answer: "Croatia have appeared in six World Cups since their independence, reaching the final in 2018 (losing to France 4-2) and finishing third in 2022 (beating Morocco). For a nation of just four million people, their World Cup record is extraordinary — a testament to their football culture and outstanding individual players, particularly Luka Modrić.",
      },
    ],
  },
  panama: {
    slug: "panama",
    name: "Panama",
    group: "L",
    faqs: [
      {
        question: "Will Panama qualify from the group stage at World Cup 2026?",
        answer: "Panama face a challenging Group L with England, Croatia, and Ghana. Advancing would require outstanding performances well above their historical level. Their best target is the Ghana match, where their physical intensity and organized defense can make life difficult. Thomas Christiansen's tactical structure provides a competitive baseline.",
      },
      {
        question: "Who is Panama's best player at World Cup 2026?",
        answer: "Panama's squad is built on collective CONCACAF organization rather than individual world-class stars. Their players compete in North American leagues and lower European divisions, but their commitment, physical intensity, and organized defensive structure make them competitive against any CONCACAF opposition.",
      },
      {
        question: "What is Panama's World Cup record?",
        answer: "Panama made their World Cup debut in 2018 in Russia, where they lost all three group matches but scored a famous goal through Felipe Baloy against England — celebrated wildly across the nation. The 2026 tournament is their second World Cup appearance. Thomas Christiansen has brought European tactical discipline to the squad.",
      },
    ],
  },
}

/**
 * Builds a complete FAQPage JSON-LD object for a given team slug.
 * Drop the result into <Script type="application/ld+json"> in the team page.
 */
export function buildTeamFAQSchema(slug: string): object | null {
  const teamFAQ = TEAM_FAQS[slug]
  if (!teamFAQ) return null

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: teamFAQ.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }
}
