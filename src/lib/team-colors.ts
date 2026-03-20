export interface TeamColors {
  primary: string
  secondary: string
  glow: string
}

const TEAM_COLORS: Record<string, TeamColors> = {
  argentina:     { primary: '#75AADB', secondary: '#FFFFFF', glow: '#75AADB' },
  brazil:        { primary: '#FFDF00', secondary: '#009B3A', glow: '#FFDF00' },
  england:       { primary: '#CF081F', secondary: '#FFFFFF', glow: '#FF3050' },
  france:        { primary: '#002395', secondary: '#ED2939', glow: '#4466FF' },
  spain:         { primary: '#AA151B', secondary: '#F1BF00', glow: '#FF3333' },
  germany:       { primary: '#FFFFFF', secondary: '#DD0000', glow: '#FF4444' },
  portugal:      { primary: '#006600', secondary: '#FF0000', glow: '#00CC44' },
  netherlands:   { primary: '#FF6600', secondary: '#FFFFFF', glow: '#FF8833' },
  usa:           { primary: '#002868', secondary: '#BF0A30', glow: '#4477FF' },
  mexico:        { primary: '#006847', secondary: '#CE1126', glow: '#00CC77' },
  italy:         { primary: '#0066CC', secondary: '#FFFFFF', glow: '#3388FF' },
  japan:         { primary: '#002395', secondary: '#BC002D', glow: '#4466FF' },
  'south-korea': { primary: '#CD2E3A', secondary: '#0047A0', glow: '#FF4455' },
  morocco:       { primary: '#C1272D', secondary: '#006233', glow: '#FF3344' },
  croatia:       { primary: '#FF0000', secondary: '#FFFFFF', glow: '#FF4444' },
  belgium:       { primary: '#ED2939', secondary: '#FAE042', glow: '#FF4455' },
  colombia:      { primary: '#FCD116', secondary: '#003893', glow: '#FFDD33' },
  canada:        { primary: '#FF0000', secondary: '#FFFFFF', glow: '#FF3333' },
  uruguay:       { primary: '#5CBFEB', secondary: '#FFFFFF', glow: '#5CBFEB' },
  senegal:       { primary: '#00853F', secondary: '#FDEF42', glow: '#00CC55' },
  australia:     { primary: '#FFCD00', secondary: '#00843D', glow: '#FFDD33' },
  switzerland:   { primary: '#FF0000', secondary: '#FFFFFF', glow: '#FF3333' },
  denmark:       { primary: '#C8102E', secondary: '#FFFFFF', glow: '#FF3344' },
  poland:        { primary: '#FFFFFF', secondary: '#DC143C', glow: '#FF3355' },
  serbia:        { primary: '#C6363C', secondary: '#FFFFFF', glow: '#FF4455' },
  'saudi-arabia': { primary: '#006C35', secondary: '#FFFFFF', glow: '#00CC55' },
  qatar:         { primary: '#8A1538', secondary: '#FFFFFF', glow: '#CC3366' },
  iran:          { primary: '#239F40', secondary: '#DA0000', glow: '#33CC55' },
  tunisia:       { primary: '#E70013', secondary: '#FFFFFF', glow: '#FF3344' },
  cameroon:      { primary: '#007A5E', secondary: '#CE1126', glow: '#00CC77' },
  ghana:         { primary: '#006B3F', secondary: '#FCD116', glow: '#00CC55' },
  ecuador:       { primary: '#FFD100', secondary: '#003DA5', glow: '#FFDD33' },
  'costa-rica':  { primary: '#002B7F', secondary: '#CE1126', glow: '#4466FF' },
  wales:         { primary: '#C8102E', secondary: '#FFFFFF', glow: '#FF3344' },
  nigeria:       { primary: '#008751', secondary: '#FFFFFF', glow: '#00CC66' },
  egypt:         { primary: '#CE1126', secondary: '#FFFFFF', glow: '#FF3344' },
  algeria:       { primary: '#006233', secondary: '#FFFFFF', glow: '#00CC55' },
  chile:         { primary: '#D52B1E', secondary: '#FFFFFF', glow: '#FF4444' },
  peru:          { primary: '#D91023', secondary: '#FFFFFF', glow: '#FF3344' },
  paraguay:      { primary: '#D52B1E', secondary: '#0038A8', glow: '#FF4444' },
  venezuela:     { primary: '#CF142B', secondary: '#00247D', glow: '#FF3344' },
  bolivia:       { primary: '#007A3D', secondary: '#F9E300', glow: '#00CC55' },
  honduras:      { primary: '#0051A5', secondary: '#FFFFFF', glow: '#4477FF' },
  panama:        { primary: '#005BAA', secondary: '#DA121A', glow: '#4477FF' },
  jamaica:       { primary: '#009B3A', secondary: '#FED100', glow: '#00CC55' },
  'trinidad-and-tobago': { primary: '#CE1126', secondary: '#000000', glow: '#FF3344' },
  'new-zealand': { primary: '#000000', secondary: '#FFFFFF', glow: '#FFFFFF' },
  scotland:      { primary: '#003399', secondary: '#FFFFFF', glow: '#4466FF' },
  austria:       { primary: '#ED2939', secondary: '#FFFFFF', glow: '#FF4455' },
  turkey:        { primary: '#E30A17', secondary: '#FFFFFF', glow: '#FF3344' },
  'czech-republic': { primary: '#11457E', secondary: '#D7141A', glow: '#4477FF' },
  sweden:        { primary: '#006AA7', secondary: '#FECC00', glow: '#4488FF' },
  ukraine:       { primary: '#005BBB', secondary: '#FFD500', glow: '#4488FF' },
  romania:       { primary: '#002B7F', secondary: '#FCD116', glow: '#4466FF' },
  hungary:       { primary: '#CE2939', secondary: '#477050', glow: '#FF4455' },
  norway:        { primary: '#BA0C2F', secondary: '#00205B', glow: '#FF3344' },
}

const DEFAULT_COLORS: TeamColors = {
  primary: '#a0d494',
  secondary: '#e9c400',
  glow: '#a0d494',
}

export function getTeamColors(slug: string): TeamColors {
  return TEAM_COLORS[slug] ?? DEFAULT_COLORS
}
