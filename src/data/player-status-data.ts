/**
 * Player playing-status overlay ported from tools/willtheyplay.
 * Explicit statuses for notable players; others fall back to fitnessStatus derivation.
 */
import type { PlayerStatus } from '@/lib/player-status'

export interface PlayerStatusRecord {
  slug: string
  teamSlug: string
  status: PlayerStatus
  reason: string
  updated: string
}

export const PLAYER_STATUS_OVERLAY: PlayerStatusRecord[] = [
  {
    "slug": "lionel-messi",
    "teamSlug": "argentina",
    "status": "doubtful",
    "reason": "At 38, Messi faces fitness and durability concerns despite remaining technically elite at Inter Miami.",
    "updated": "2026-04-01"
  },
  {
    "slug": "julian-alvarez",
    "teamSlug": "argentina",
    "status": "confirmed",
    "reason": "A key figure in Argentina's attack and one of the first names on the squad list.",
    "updated": "2026-04-01"
  },
  {
    "slug": "emiliano-martinez",
    "teamSlug": "argentina",
    "status": "confirmed",
    "reason": "Argentina's undisputed number one goalkeeper and a World Cup hero from 2022.",
    "updated": "2026-04-01"
  },
  {
    "slug": "enzo-fernandez",
    "teamSlug": "argentina",
    "status": "confirmed",
    "reason": "A midfield cornerstone for Argentina since the 2022 World Cup.",
    "updated": "2026-04-01"
  },
  {
    "slug": "vinicius-jr",
    "teamSlug": "brazil",
    "status": "confirmed",
    "reason": "Brazil's talisman and Ballon d'Or contender, a guaranteed starter.",
    "updated": "2026-04-01"
  },
  {
    "slug": "rodrygo",
    "teamSlug": "brazil",
    "status": "confirmed",
    "reason": "A key attacking option for Brazil and thriving at Real Madrid.",
    "updated": "2026-04-01"
  },
  {
    "slug": "endrick",
    "teamSlug": "brazil",
    "status": "likely",
    "reason": "A generational talent who has been integrated into Real Madrid and the national team setup.",
    "updated": "2026-04-01"
  },
  {
    "slug": "kylian-mbappe",
    "teamSlug": "france",
    "status": "confirmed",
    "reason": "France's captain and talisman, absolutely central to their World Cup campaign.",
    "updated": "2026-04-01"
  },
  {
    "slug": "antoine-griezmann",
    "teamSlug": "france",
    "status": "retired",
    "reason": "Announced his retirement from international football in 2024 after Euro 2024.",
    "updated": "2026-04-01"
  },
  {
    "slug": "aurelien-tchouameni",
    "teamSlug": "france",
    "status": "confirmed",
    "reason": "A midfield anchor for France and Real Madrid, a guaranteed selection.",
    "updated": "2026-04-01"
  },
  {
    "slug": "william-saliba",
    "teamSlug": "france",
    "status": "confirmed",
    "reason": "A first-choice centre-back for France and one of the best defenders in the Premier League.",
    "updated": "2026-04-01"
  },
  {
    "slug": "jude-bellingham",
    "teamSlug": "england",
    "status": "confirmed",
    "reason": "England's most important player and a Ballon d'Or contender.",
    "updated": "2026-04-01"
  },
  {
    "slug": "bukayo-saka",
    "teamSlug": "england",
    "status": "confirmed",
    "reason": "A guaranteed starter for England with world-class output from the right wing.",
    "updated": "2026-04-01"
  },
  {
    "slug": "harry-kane",
    "teamSlug": "england",
    "status": "confirmed",
    "reason": "England's all-time top scorer and captain, still performing at elite level.",
    "updated": "2026-04-01"
  },
  {
    "slug": "declan-rice",
    "teamSlug": "england",
    "status": "confirmed",
    "reason": "A midfield pillar for England and one of the first names on the team sheet.",
    "updated": "2026-04-01"
  },
  {
    "slug": "lamine-yamal",
    "teamSlug": "spain",
    "status": "confirmed",
    "reason": "Spain's teenage sensation and Euro 2024 breakout star, already a key player.",
    "updated": "2026-04-01"
  },
  {
    "slug": "pedri",
    "teamSlug": "spain",
    "status": "confirmed",
    "reason": "A metronome in Spain's midfield and one of the best young midfielders in the world.",
    "updated": "2026-04-01"
  },
  {
    "slug": "rodri",
    "teamSlug": "spain",
    "status": "likely",
    "reason": "Recovering from a serious ACL injury sustained in 2024; Spain will monitor his fitness closely.",
    "updated": "2026-04-01"
  },
  {
    "slug": "dani-olmo",
    "teamSlug": "spain",
    "status": "confirmed",
    "reason": "Euro 2024 Golden Boot winner and a vital creative force for Spain.",
    "updated": "2026-04-01"
  },
  {
    "slug": "florian-wirtz",
    "teamSlug": "germany",
    "status": "confirmed",
    "reason": "Germany's most exciting talent and a cornerstone of their rebuild.",
    "updated": "2026-04-01"
  },
  {
    "slug": "jamal-musiala",
    "teamSlug": "germany",
    "status": "confirmed",
    "reason": "A generational talent and the creative heartbeat of the German team.",
    "updated": "2026-04-01"
  },
  {
    "slug": "antonio-rudiger",
    "teamSlug": "germany",
    "status": "confirmed",
    "reason": "A senior leader in defence and still performing at the highest level at Real Madrid.",
    "updated": "2026-04-01"
  },
  {
    "slug": "cristiano-ronaldo",
    "teamSlug": "portugal",
    "status": "doubtful",
    "reason": "At 41 and playing in the Saudi Pro League, his inclusion would be a sentimental pick over a sporting one.",
    "updated": "2026-04-01"
  },
  {
    "slug": "bernardo-silva",
    "teamSlug": "portugal",
    "status": "confirmed",
    "reason": "Portugal's creative fulcrum and one of the most technically gifted players in Europe.",
    "updated": "2026-04-01"
  },
  {
    "slug": "rafael-leao",
    "teamSlug": "portugal",
    "status": "confirmed",
    "reason": "A devastating attacker and part of Portugal's new core going forward.",
    "updated": "2026-04-01"
  },
  {
    "slug": "bruno-fernandes",
    "teamSlug": "portugal",
    "status": "confirmed",
    "reason": "Portugal's set-piece specialist and a driving force in midfield.",
    "updated": "2026-04-01"
  },
  {
    "slug": "cody-gakpo",
    "teamSlug": "netherlands",
    "status": "confirmed",
    "reason": "A proven tournament performer and key attacker for the Netherlands.",
    "updated": "2026-04-01"
  },
  {
    "slug": "virgil-van-dijk",
    "teamSlug": "netherlands",
    "status": "likely",
    "reason": "Still performing at the highest level but has occasionally hinted at stepping back from international duty.",
    "updated": "2026-04-01"
  },
  {
    "slug": "xavi-simons",
    "teamSlug": "netherlands",
    "status": "confirmed",
    "reason": "A rising star who has become a key creative force for the Netherlands.",
    "updated": "2026-04-01"
  },
  {
    "slug": "kevin-de-bruyne",
    "teamSlug": "belgium",
    "status": "doubtful",
    "reason": "Recurring injuries and age raise questions about his availability for another World Cup.",
    "updated": "2026-04-01"
  },
  {
    "slug": "romelu-lukaku",
    "teamSlug": "belgium",
    "status": "likely",
    "reason": "Belgium's all-time top scorer and still scoring regularly at club level.",
    "updated": "2026-04-01"
  },
  {
    "slug": "jeremy-doku",
    "teamSlug": "belgium",
    "status": "confirmed",
    "reason": "A key part of Belgium's new generation with explosive pace and dribbling.",
    "updated": "2026-04-01"
  },
  {
    "slug": "gianluigi-donnarumma",
    "teamSlug": "italy",
    "status": "confirmed",
    "reason": "Italy's undisputed number one goalkeeper and Euro 2020 hero.",
    "updated": "2026-04-01"
  },
  {
    "slug": "nicolo-barella",
    "teamSlug": "italy",
    "status": "confirmed",
    "reason": "Italy's most complete midfielder and a driving force in the team.",
    "updated": "2026-04-01"
  },
  {
    "slug": "federico-chiesa",
    "teamSlug": "italy",
    "status": "doubtful",
    "reason": "Persistent injury problems have limited his playing time and fitness remains a concern.",
    "updated": "2026-04-01"
  },
  {
    "slug": "luka-modric",
    "teamSlug": "croatia",
    "status": "doubtful",
    "reason": "At 40, Modrić would be one of the oldest World Cup participants ever; Croatia is transitioning to younger players.",
    "updated": "2026-04-01"
  },
  {
    "slug": "josko-gvardiol",
    "teamSlug": "croatia",
    "status": "confirmed",
    "reason": "One of the best young defenders in the world and Croatia's future captain.",
    "updated": "2026-04-01"
  },
  {
    "slug": "mateo-kovacic",
    "teamSlug": "croatia",
    "status": "confirmed",
    "reason": "A senior figure in Croatia's midfield and still performing at top level at Manchester City.",
    "updated": "2026-04-01"
  },
  {
    "slug": "luis-diaz",
    "teamSlug": "colombia",
    "status": "confirmed",
    "reason": "Colombia's star attacker and a key performer in their Copa América run.",
    "updated": "2026-04-01"
  },
  {
    "slug": "james-rodriguez",
    "teamSlug": "colombia",
    "status": "doubtful",
    "reason": "Despite a stellar 2024 Copa América, his club career has been unstable and fitness is a concern.",
    "updated": "2026-04-01"
  },
  {
    "slug": "jhon-arias",
    "teamSlug": "colombia",
    "status": "likely",
    "reason": "A consistent performer for Colombia and has been a regular in recent squads.",
    "updated": "2026-04-01"
  },
  {
    "slug": "takefusa-kubo",
    "teamSlug": "japan",
    "status": "confirmed",
    "reason": "Japan's most technically gifted attacker and a key player in La Liga.",
    "updated": "2026-04-01"
  },
  {
    "slug": "wataru-endo",
    "teamSlug": "japan",
    "status": "confirmed",
    "reason": "Japan's captain and a dependable midfield presence at Liverpool.",
    "updated": "2026-04-01"
  },
  {
    "slug": "kaoru-mitoma",
    "teamSlug": "japan",
    "status": "confirmed",
    "reason": "A electrifying winger who has become one of the Premier League's most dangerous attackers.",
    "updated": "2026-04-01"
  },
  {
    "slug": "son-heung-min",
    "teamSlug": "south-korea",
    "status": "confirmed",
    "reason": "South Korea's captain and talisman, still one of the Premier League's top attackers.",
    "updated": "2026-04-01"
  },
  {
    "slug": "kim-min-jae",
    "teamSlug": "south-korea",
    "status": "confirmed",
    "reason": "One of the best centre-backs in the Bundesliga and a key defensive anchor for South Korea.",
    "updated": "2026-04-01"
  },
  {
    "slug": "lee-kang-in",
    "teamSlug": "south-korea",
    "status": "confirmed",
    "reason": "A creative playmaker who has established himself at PSG and is key to South Korea's attack.",
    "updated": "2026-04-01"
  },
  {
    "slug": "achraf-hakimi",
    "teamSlug": "morocco",
    "status": "confirmed",
    "reason": "Morocco's captain and one of the best full-backs in the world.",
    "updated": "2026-04-01"
  },
  {
    "slug": "hakim-ziyech",
    "teamSlug": "morocco",
    "status": "likely",
    "reason": "Returned from a brief international retirement and remains a key creative influence.",
    "updated": "2026-04-01"
  },
  {
    "slug": "youssef-en-nesyri",
    "teamSlug": "morocco",
    "status": "confirmed",
    "reason": "Morocco's primary striker with a strong aerial presence and scoring record.",
    "updated": "2026-04-01"
  },
  {
    "slug": "sadio-mane",
    "teamSlug": "senegal",
    "status": "likely",
    "reason": "Senegal's all-time great and AFCON champion, still a leader of the team despite playing in Saudi Arabia.",
    "updated": "2026-04-01"
  },
  {
    "slug": "kalidou-koulibaly",
    "teamSlug": "senegal",
    "status": "doubtful",
    "reason": "At 35 and playing in Saudi Arabia, his physical edge for World Cup football is questionable.",
    "updated": "2026-04-01"
  },
  {
    "slug": "ismaila-sarr",
    "teamSlug": "senegal",
    "status": "confirmed",
    "reason": "A regular starter for Senegal and a key attacking threat with his pace.",
    "updated": "2026-04-01"
  },
  {
    "slug": "christian-pulisic",
    "teamSlug": "usa",
    "status": "confirmed",
    "reason": "The US captain and star player, thriving at AC Milan.",
    "updated": "2026-04-01"
  },
  {
    "slug": "weston-mckennie",
    "teamSlug": "usa",
    "status": "confirmed",
    "reason": "A versatile midfielder and guaranteed squad member for the host nation.",
    "updated": "2026-04-01"
  },
  {
    "slug": "tyler-adams",
    "teamSlug": "usa",
    "status": "likely",
    "reason": "A former captain who has battled injuries but remains a key midfield option when fit.",
    "updated": "2026-04-01"
  },
  {
    "slug": "hirving-lozano",
    "teamSlug": "mexico",
    "status": "likely",
    "reason": "A key attacker for Mexico though competition for places is fierce.",
    "updated": "2026-04-01"
  },
  {
    "slug": "edson-alvarez",
    "teamSlug": "mexico",
    "status": "confirmed",
    "reason": "Mexico's midfield anchor and one of the best Mexican players in Europe.",
    "updated": "2026-04-01"
  },
  {
    "slug": "santiago-gimenez",
    "teamSlug": "mexico",
    "status": "confirmed",
    "reason": "Mexico's top striker and leading scorer in the Eredivisie.",
    "updated": "2026-04-01"
  },
  {
    "slug": "alphonso-davies",
    "teamSlug": "canada",
    "status": "confirmed",
    "reason": "Canada's superstar and one of the best left-backs in world football.",
    "updated": "2026-04-01"
  },
  {
    "slug": "jonathan-david",
    "teamSlug": "canada",
    "status": "confirmed",
    "reason": "Canada's leading scorer and a prolific striker in Ligue 1.",
    "updated": "2026-04-01"
  },
  {
    "slug": "erling-haaland",
    "teamSlug": "norway",
    "status": "ruled-out",
    "reason": "Norway did not qualify for the 2026 World Cup.",
    "updated": "2026-04-01"
  },
  {
    "slug": "mohamed-salah",
    "teamSlug": "egypt",
    "status": "likely",
    "reason": "Egypt's qualification status is pending, but Salah remains their talisman and will play if they qualify.",
    "updated": "2026-04-01"
  },
  {
    "slug": "granit-xhaka",
    "teamSlug": "switzerland",
    "status": "confirmed",
    "reason": "Switzerland's captain and midfield leader, still excelling at Bayer Leverkusen.",
    "updated": "2026-04-01"
  },
  {
    "slug": "christian-eriksen",
    "teamSlug": "denmark",
    "status": "likely",
    "reason": "Still a key creative influence for Denmark despite limited club playing time.",
    "updated": "2026-04-01"
  },
  {
    "slug": "david-alaba",
    "teamSlug": "austria",
    "status": "doubtful",
    "reason": "Recovering from a serious ACL injury that has kept him sidelined for over a year.",
    "updated": "2026-04-01"
  },
  {
    "slug": "dusan-vlahovic",
    "teamSlug": "serbia",
    "status": "confirmed",
    "reason": "Serbia's main striker and a prolific scorer at Juventus.",
    "updated": "2026-04-01"
  },
  {
    "slug": "aleksandar-mitrovic",
    "teamSlug": "serbia",
    "status": "likely",
    "reason": "Serbia's all-time top scorer, though his move to the Saudi Pro League raises questions about match sharpness.",
    "updated": "2026-04-01"
  },
  {
    "slug": "andre-onana",
    "teamSlug": "cameroon",
    "status": "confirmed",
    "reason": "Cameroon's first-choice goalkeeper and a regular at Manchester United.",
    "updated": "2026-04-01"
  },
  {
    "slug": "mohammed-kudus",
    "teamSlug": "ghana",
    "status": "likely",
    "reason": "Ghana's most talented player, though Ghana's qualification is pending.",
    "updated": "2026-04-01"
  },
  {
    "slug": "moises-caicedo",
    "teamSlug": "ecuador",
    "status": "confirmed",
    "reason": "Ecuador's midfield star and one of the best young midfielders in the Premier League.",
    "updated": "2026-04-01"
  },
  {
    "slug": "miguel-almiron",
    "teamSlug": "paraguay",
    "status": "likely",
    "reason": "Paraguay's key creative player if they qualify for the World Cup.",
    "updated": "2026-04-01"
  },
  {
    "slug": "mehdi-taremi",
    "teamSlug": "iran",
    "status": "confirmed",
    "reason": "Iran's most important player and a reliable scorer at Inter Milan.",
    "updated": "2026-04-01"
  },
  {
    "slug": "salem-al-dawsari",
    "teamSlug": "saudi-arabia",
    "status": "likely",
    "reason": "The hero of Saudi Arabia's famous win over Argentina in 2022, still a key player.",
    "updated": "2026-04-01"
  },
  {
    "slug": "hannibal-mejbri",
    "teamSlug": "tunisia",
    "status": "likely",
    "reason": "Tunisia's most promising young talent, expected to be key if they qualify.",
    "updated": "2026-04-01"
  },
  {
    "slug": "sebastien-haller",
    "teamSlug": "ivory-coast",
    "status": "likely",
    "reason": "Recovered from testicular cancer and returned to competitive football, a key figure for the AFCON champions.",
    "updated": "2026-04-01"
  },
  {
    "slug": "hakan-calhanoglu",
    "teamSlug": "turkey",
    "status": "confirmed",
    "reason": "Turkey's captain and one of the best midfielders in Serie A.",
    "updated": "2026-04-01"
  },
  {
    "slug": "arda-guler",
    "teamSlug": "turkey",
    "status": "confirmed",
    "reason": "Turkey's prodigious young talent at Real Madrid, already a full international.",
    "updated": "2026-04-01"
  },
  {
    "slug": "oleksandr-zinchenko",
    "teamSlug": "ukraine",
    "status": "likely",
    "reason": "Ukraine's captain and most experienced player, pending qualification.",
    "updated": "2026-04-01"
  },
  {
    "slug": "andrew-robertson",
    "teamSlug": "scotland",
    "status": "likely",
    "reason": "Scotland's captain and best player, pending qualification.",
    "updated": "2026-04-01"
  },
  {
    "slug": "michael-murillo",
    "teamSlug": "panama",
    "status": "likely",
    "reason": "Panama's most experienced defender, expected to be in the squad if they qualify.",
    "updated": "2026-04-01"
  },
  {
    "slug": "akram-afif",
    "teamSlug": "qatar",
    "status": "likely",
    "reason": "Qatar's star player and Asian Player of the Year, pending qualification.",
    "updated": "2026-04-01"
  },
  {
    "slug": "phil-foden",
    "teamSlug": "england",
    "status": "confirmed",
    "reason": "PFA Player of the Year and a key part of England's attack.",
    "updated": "2026-04-01"
  },
  {
    "slug": "marc-andre-ter-stegen",
    "teamSlug": "germany",
    "status": "doubtful",
    "reason": "Recovering from a serious knee injury that has sidelined him for most of the season.",
    "updated": "2026-04-01"
  },
  {
    "slug": "raphinha",
    "teamSlug": "brazil",
    "status": "confirmed",
    "reason": "A key attacker for Brazil who has been thriving at Barcelona.",
    "updated": "2026-04-01"
  },
  {
    "slug": "diogo-jota",
    "teamSlug": "portugal",
    "status": "likely",
    "reason": "A versatile forward option for Portugal when fit, though injuries have been a concern.",
    "updated": "2026-04-01"
  },
  {
    "slug": "frenkie-de-jong",
    "teamSlug": "netherlands",
    "status": "doubtful",
    "reason": "Persistent ankle injuries have plagued him for the past two years, making his fitness a major concern.",
    "updated": "2026-04-01"
  },
  {
    "slug": "thibaut-courtois",
    "teamSlug": "belgium",
    "status": "doubtful",
    "reason": "Has had a turbulent relationship with the Belgian FA and may not return to the national team.",
    "updated": "2026-04-01"
  },
  {
    "slug": "ousmane-dembele",
    "teamSlug": "france",
    "status": "confirmed",
    "reason": "France's first-choice right winger, delivering consistently at PSG.",
    "updated": "2026-04-01"
  },
  {
    "slug": "casemiro",
    "teamSlug": "brazil",
    "status": "doubtful",
    "reason": "Declining form and pace at Manchester United have seen him fall down the pecking order for Brazil.",
    "updated": "2026-04-01"
  },
  {
    "slug": "marquinhos",
    "teamSlug": "brazil",
    "status": "confirmed",
    "reason": "Brazil's defensive leader and captain, still performing at the highest level.",
    "updated": "2026-04-01"
  },
  {
    "slug": "lisandro-martinez",
    "teamSlug": "argentina",
    "status": "confirmed",
    "reason": "A fierce defender who has been a key part of Argentina's World Cup winning squad.",
    "updated": "2026-04-01"
  },
  {
    "slug": "lautaro-martinez",
    "teamSlug": "argentina",
    "status": "confirmed",
    "reason": "Argentina's prolific striker and a key part of their attacking plan.",
    "updated": "2026-04-01"
  },
  {
    "slug": "mike-maignan",
    "teamSlug": "france",
    "status": "confirmed",
    "reason": "France's first-choice goalkeeper and one of the best in the world.",
    "updated": "2026-04-01"
  },
  {
    "slug": "joshua-kimmich",
    "teamSlug": "germany",
    "status": "confirmed",
    "reason": "Germany's captain and most versatile player, capable of playing midfield or right-back.",
    "updated": "2026-04-01"
  },
  {
    "slug": "sandro-tonali",
    "teamSlug": "italy",
    "status": "confirmed",
    "reason": "Returned from a regulatory suspension and re-established himself as a key midfielder for Italy and Newcastle.",
    "updated": "2026-04-01"
  },
  {
    "slug": "ruben-dias",
    "teamSlug": "portugal",
    "status": "confirmed",
    "reason": "Portugal's first-choice centre-back and a defensive leader at Manchester City.",
    "updated": "2026-04-01"
  },
  {
    "slug": "joao-felix",
    "teamSlug": "portugal",
    "status": "likely",
    "reason": "A talented but inconsistent forward who remains in Portugal's plans.",
    "updated": "2026-04-01"
  },
  {
    "slug": "memphis-depay",
    "teamSlug": "netherlands",
    "status": "doubtful",
    "reason": "Playing in Brazil at 32, his competitiveness for World Cup football is questionable.",
    "updated": "2026-04-01"
  },
  {
    "slug": "marc-cucurella",
    "teamSlug": "spain",
    "status": "confirmed",
    "reason": "Euro 2024 champion and an established left-back for Spain.",
    "updated": "2026-04-01"
  },
  {
    "slug": "matthijs-de-ligt",
    "teamSlug": "netherlands",
    "status": "confirmed",
    "reason": "A first-choice centre-back for the Netherlands with Premier League experience.",
    "updated": "2026-04-01"
  },
  {
    "slug": "nico-williams",
    "teamSlug": "spain",
    "status": "confirmed",
    "reason": "Euro 2024 standout and one of the most exciting wingers in La Liga.",
    "updated": "2026-04-01"
  },
  {
    "slug": "cole-palmer",
    "teamSlug": "england",
    "status": "confirmed",
    "reason": "Emerged as one of the Premier League's best players and a key England creative force.",
    "updated": "2026-04-01"
  },
  {
    "slug": "eduardo-camavinga",
    "teamSlug": "france",
    "status": "confirmed",
    "reason": "A versatile midfielder who can play multiple roles for France and Real Madrid.",
    "updated": "2026-04-01"
  },
  {
    "slug": "unai-simon",
    "teamSlug": "spain",
    "status": "confirmed",
    "reason": "Spain's established first-choice goalkeeper and a Euro 2024 winner.",
    "updated": "2026-04-01"
  },
  {
    "slug": "ivan-toney",
    "teamSlug": "england",
    "status": "doubtful",
    "reason": "Moved to the Saudi Pro League, which typically takes players out of contention for England selection.",
    "updated": "2026-04-01"
  },
  {
    "slug": "gabriel-martinelli",
    "teamSlug": "brazil",
    "status": "likely",
    "reason": "A key Arsenal attacker competing for a spot in a stacked Brazilian forward line.",
    "updated": "2026-04-01"
  },
  {
    "slug": "kai-havertz",
    "teamSlug": "germany",
    "status": "confirmed",
    "reason": "Reinvented as a centre-forward at Arsenal and a key part of Germany's attack.",
    "updated": "2026-04-01"
  },
  {
    "slug": "bruno-guimaraes",
    "teamSlug": "brazil",
    "status": "confirmed",
    "reason": "A midfield engine for Brazil and one of the best box-to-box midfielders in the Premier League.",
    "updated": "2026-04-01"
  },
  {
    "slug": "giovani-lo-celso",
    "teamSlug": "argentina",
    "status": "likely",
    "reason": "A creative midfielder who remains part of Argentina's plans as a squad rotation option.",
    "updated": "2026-04-01"
  },
  {
    "slug": "joao-cancelo",
    "teamSlug": "portugal",
    "status": "doubtful",
    "reason": "Moved to the Saudi Pro League and has fallen out of favour with Portugal's coaching staff.",
    "updated": "2026-04-01"
  },
  {
    "slug": "trent-alexander-arnold",
    "teamSlug": "england",
    "status": "confirmed",
    "reason": "One of the most creative full-backs in world football, now at Real Madrid.",
    "updated": "2026-04-01"
  },
  {
    "slug": "gianluca-scamacca",
    "teamSlug": "italy",
    "status": "doubtful",
    "reason": "Recovering from a serious knee injury that disrupted his breakout season.",
    "updated": "2026-04-01"
  },
  {
    "slug": "dusan-tadic",
    "teamSlug": "serbia",
    "status": "doubtful",
    "reason": "At 37, Serbia is transitioning to younger players and his involvement is uncertain.",
    "updated": "2026-04-01"
  },
  {
    "slug": "ricardo-pepi",
    "teamSlug": "usa",
    "status": "confirmed",
    "reason": "A prolific young striker who has become a regular starter for the US and PSV.",
    "updated": "2026-04-01"
  },
  {
    "slug": "nicolas-jackson",
    "teamSlug": "senegal",
    "status": "confirmed",
    "reason": "A key striker for Senegal and a regular in the Premier League.",
    "updated": "2026-04-01"
  },
  {
    "slug": "tim-weah",
    "teamSlug": "usa",
    "status": "confirmed",
    "reason": "A key attacker for the US and a regular at Juventus in Serie A.",
    "updated": "2026-04-01"
  },
  {
    "slug": "marcel-sabitzer",
    "teamSlug": "austria",
    "status": "likely",
    "reason": "A key midfielder for Austria and a regular at Borussia Dortmund.",
    "updated": "2026-04-01"
  },
  {
    "slug": "mikel-oyarzabal",
    "teamSlug": "spain",
    "status": "likely",
    "reason": "Euro 2024 final goalscorer and a consistent performer for Spain.",
    "updated": "2026-04-01"
  }
];
