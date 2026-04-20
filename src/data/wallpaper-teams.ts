export interface WallpaperTeam {
  slug: string;
  name: string;
  flag: string;
  group: string;
  primaryColor: string;
  secondaryColor: string;
  confederation: string;
}

export const TEAMS: WallpaperTeam[] = [
  // Group A
  { slug: "mexico", name: "Mexico", flag: "🇲🇽", group: "A", primaryColor: "#006847", secondaryColor: "#CE1126", confederation: "CONCACAF" },
  { slug: "south-africa", name: "South Africa", flag: "🇿🇦", group: "A", primaryColor: "#007A4D", secondaryColor: "#FFB81C", confederation: "CAF" },
  { slug: "south-korea", name: "South Korea", flag: "🇰🇷", group: "A", primaryColor: "#CD2E3A", secondaryColor: "#003478", confederation: "AFC" },
  { slug: "denmark", name: "Denmark", flag: "🇩🇰", group: "A", primaryColor: "#C60C30", secondaryColor: "#FFFFFF", confederation: "UEFA" },
  // Group B
  { slug: "switzerland", name: "Switzerland", flag: "🇨🇭", group: "B", primaryColor: "#FF0000", secondaryColor: "#FFFFFF", confederation: "UEFA" },
  { slug: "canada", name: "Canada", flag: "🇨🇦", group: "B", primaryColor: "#FF0000", secondaryColor: "#FFFFFF", confederation: "CONCACAF" },
  { slug: "qatar", name: "Qatar", flag: "🇶🇦", group: "B", primaryColor: "#8D1B3D", secondaryColor: "#FFFFFF", confederation: "AFC" },
  { slug: "italy", name: "Italy", flag: "🇮🇹", group: "B", primaryColor: "#003189", secondaryColor: "#FFFFFF", confederation: "UEFA" },
  // Group C
  { slug: "morocco", name: "Morocco", flag: "🇲🇦", group: "C", primaryColor: "#C1272D", secondaryColor: "#006233", confederation: "CAF" },
  { slug: "brazil", name: "Brazil", flag: "🇧🇷", group: "C", primaryColor: "#009C3B", secondaryColor: "#FFDF00", confederation: "CONMEBOL" },
  { slug: "scotland", name: "Scotland", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", group: "C", primaryColor: "#003F87", secondaryColor: "#FFFFFF", confederation: "UEFA" },
  { slug: "haiti", name: "Haiti", flag: "🇭🇹", group: "C", primaryColor: "#00209F", secondaryColor: "#D21034", confederation: "CONCACAF" },
  // Group D
  { slug: "usa", name: "United States", flag: "🇺🇸", group: "D", primaryColor: "#002868", secondaryColor: "#BF0A30", confederation: "CONCACAF" },
  { slug: "paraguay", name: "Paraguay", flag: "🇵🇾", group: "D", primaryColor: "#D52B1E", secondaryColor: "#0038A8", confederation: "CONMEBOL" },
  { slug: "australia", name: "Australia", flag: "🇦🇺", group: "D", primaryColor: "#00843D", secondaryColor: "#FFD700", confederation: "AFC" },
  { slug: "turkey", name: "Turkey", flag: "🇹🇷", group: "D", primaryColor: "#E30A17", secondaryColor: "#FFFFFF", confederation: "UEFA" },
  // Group E
  { slug: "germany", name: "Germany", flag: "🇩🇪", group: "E", primaryColor: "#000000", secondaryColor: "#FFFFFF", confederation: "UEFA" },
  { slug: "ivory-coast", name: "Ivory Coast", flag: "🇨🇮", group: "E", primaryColor: "#F77F00", secondaryColor: "#009A44", confederation: "CAF" },
  { slug: "ecuador", name: "Ecuador", flag: "🇪🇨", group: "E", primaryColor: "#FFD100", secondaryColor: "#003087", confederation: "CONMEBOL" },
  { slug: "curacao", name: "Curaçao", flag: "🇨🇼", group: "E", primaryColor: "#003DA5", secondaryColor: "#F9C600", confederation: "CONCACAF" },
  // Group F
  { slug: "netherlands", name: "Netherlands", flag: "🇳🇱", group: "F", primaryColor: "#FF6600", secondaryColor: "#003DA5", confederation: "UEFA" },
  { slug: "japan", name: "Japan", flag: "🇯🇵", group: "F", primaryColor: "#003087", secondaryColor: "#FFFFFF", confederation: "AFC" },
  { slug: "tunisia", name: "Tunisia", flag: "🇹🇳", group: "F", primaryColor: "#E70013", secondaryColor: "#FFFFFF", confederation: "CAF" },
  { slug: "ukraine", name: "Ukraine", flag: "🇺🇦", group: "F", primaryColor: "#005BBB", secondaryColor: "#FFD500", confederation: "UEFA" },
  // Group G
  { slug: "portugal", name: "Portugal", flag: "🇵🇹", group: "G", primaryColor: "#006600", secondaryColor: "#FF0000", confederation: "UEFA" },
  { slug: "iran", name: "Iran", flag: "🇮🇷", group: "G", primaryColor: "#239F40", secondaryColor: "#DA0000", confederation: "AFC" },
  { slug: "belgium", name: "Belgium", flag: "🇧🇪", group: "G", primaryColor: "#EF3340", secondaryColor: "#000000", confederation: "UEFA" },
  { slug: "egypt", name: "Egypt", flag: "🇪🇬", group: "G", primaryColor: "#CE1126", secondaryColor: "#FFFFFF", confederation: "CAF" },
  // Group H
  { slug: "spain", name: "Spain", flag: "🇪🇸", group: "H", primaryColor: "#AA151B", secondaryColor: "#F1BF00", confederation: "UEFA" },
  { slug: "cabo-verde", name: "Cabo Verde", flag: "🇨🇻", group: "H", primaryColor: "#003893", secondaryColor: "#CF2027", confederation: "CAF" },
  { slug: "saudi-arabia", name: "Saudi Arabia", flag: "🇸🇦", group: "H", primaryColor: "#006C35", secondaryColor: "#FFFFFF", confederation: "AFC" },
  { slug: "serbia", name: "Serbia", flag: "🇷🇸", group: "H", primaryColor: "#C6363C", secondaryColor: "#0C4076", confederation: "UEFA" },
  // Group I
  { slug: "france", name: "France", flag: "🇫🇷", group: "I", primaryColor: "#002395", secondaryColor: "#ED2939", confederation: "UEFA" },
  { slug: "senegal", name: "Senegal", flag: "🇸🇳", group: "I", primaryColor: "#00853F", secondaryColor: "#FDEF42", confederation: "CAF" },
  { slug: "norway", name: "Norway", flag: "🇳🇴", group: "I", primaryColor: "#EF2B2D", secondaryColor: "#002868", confederation: "UEFA" },
  // Group J
  { slug: "argentina", name: "Argentina", flag: "🇦🇷", group: "J", primaryColor: "#74ACDF", secondaryColor: "#FFFFFF", confederation: "CONMEBOL" },
  { slug: "algeria", name: "Algeria", flag: "🇩🇿", group: "J", primaryColor: "#006233", secondaryColor: "#FFFFFF", confederation: "CAF" },
  { slug: "austria", name: "Austria", flag: "🇦🇹", group: "J", primaryColor: "#ED2939", secondaryColor: "#FFFFFF", confederation: "UEFA" },
  { slug: "jordan", name: "Jordan", flag: "🇯🇴", group: "J", primaryColor: "#007A3D", secondaryColor: "#CE1126", confederation: "AFC" },
  // Group K
  { slug: "colombia", name: "Colombia", flag: "🇨🇴", group: "K", primaryColor: "#003087", secondaryColor: "#CE1126", confederation: "CONMEBOL" },
  { slug: "cameroon", name: "Cameroon", flag: "🇨🇲", group: "K", primaryColor: "#007A5E", secondaryColor: "#CE1126", confederation: "CAF" },
  { slug: "uzbekistan", name: "Uzbekistan", flag: "🇺🇿", group: "K", primaryColor: "#1EB53A", secondaryColor: "#0099B5", confederation: "AFC" },
  // Group L
  { slug: "england", name: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", group: "L", primaryColor: "#CF081F", secondaryColor: "#FFFFFF", confederation: "UEFA" },
  { slug: "ghana", name: "Ghana", flag: "🇬🇭", group: "L", primaryColor: "#006B3F", secondaryColor: "#FCD116", confederation: "CAF" },
  { slug: "croatia", name: "Croatia", flag: "🇭🇷", group: "L", primaryColor: "#FF0000", secondaryColor: "#003087", confederation: "UEFA" },
  { slug: "panama", name: "Panama", flag: "🇵🇦", group: "L", primaryColor: "#005293", secondaryColor: "#DA121A", confederation: "CONCACAF" },
];

export const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"] as const;
export type GroupLetter = (typeof GROUPS)[number];

export function getTeamsByGroup(group: GroupLetter): WallpaperTeam[] {
  return TEAMS.filter((t) => t.group === group);
}

export function getTeamBySlug(slug: string): WallpaperTeam | undefined {
  return TEAMS.find((t) => t.slug === slug);
}
