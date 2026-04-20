/** Compact player data for formation builder - key players per team */

export type Position = "GK" | "DEF" | "MID" | "FWD";

export interface FormationPlayer {
  slug: string;
  name: string;
  teamSlug: string;
  position: Position;
  number: number;
}

/**
 * Representative squad of ~23 players per team.
 * Generated from KickOracle player database.
 * Each team has a balanced squad: 3 GK, 8 DEF, 7 MID, 5 FWD
 */
const SQUADS: Record<string, FormationPlayer[]> = {};

// We'll generate default squads dynamically. For MVP, provide
// key players for top teams and generic placeholders for others.
// In production, this would be imported from scoutedge-web's players-data.ts.

const KEY_SQUADS: Record<string, Array<[string, string, Position, number]>> = {
  brazil: [
    ["alisson", "Alisson", "GK", 1],
    ["ederson", "Ederson", "GK", 23],
    ["marquinhos", "Marquinhos", "DEF", 4],
    ["militao", "Milit\u00e3o", "DEF", 2],
    ["danilo", "Danilo", "DEF", 13],
    ["alex-sandro", "Alex Sandro", "DEF", 6],
    ["gabriel-magalhaes", "Gabriel Magalh\u00e3es", "DEF", 14],
    ["casemiro", "Casemiro", "MID", 5],
    ["bruno-guimaraes", "Bruno Guimar\u00e3es", "MID", 16],
    ["lucas-paqueta", "Lucas Paquet\u00e1", "MID", 10],
    ["rodrygo", "Rodrygo", "FWD", 11],
    ["vinicius-jr", "Vin\u00edcius Jr", "FWD", 7],
    ["raphinha", "Raphinha", "FWD", 19],
    ["endrick", "Endrick", "FWD", 9],
    ["richarlison", "Richarlison", "FWD", 20],
  ],
  argentina: [
    ["emiliano-martinez", "E. Mart\u00ednez", "GK", 23],
    ["geronimo-rulli", "Rulli", "GK", 12],
    ["cristian-romero", "C. Romero", "DEF", 13],
    ["lisandro-martinez", "L. Mart\u00ednez", "DEF", 25],
    ["nahuel-molina", "Molina", "DEF", 26],
    ["nicolas-tagliafico", "Tagliafico", "DEF", 3],
    ["nicolas-otamendi", "Otamendi", "DEF", 19],
    ["rodrigo-de-paul", "De Paul", "MID", 7],
    ["enzo-fernandez", "Enzo Fern\u00e1ndez", "MID", 24],
    ["alexis-mac-allister", "Mac Allister", "MID", 20],
    ["leandro-paredes", "Paredes", "MID", 5],
    ["lionel-messi", "Messi", "FWD", 10],
    ["julian-alvarez", "J. \u00c1lvarez", "FWD", 9],
    ["lautaro-martinez", "Lautaro", "FWD", 22],
    ["angel-di-maria", "Di Mar\u00eda", "FWD", 11],
  ],
  france: [
    ["mike-maignan", "Maignan", "GK", 16],
    ["alphonse-areola", "Areola", "GK", 23],
    ["dayot-upamecano", "Upamecano", "DEF", 4],
    ["ibrahima-konate", "Konat\u00e9", "DEF", 13],
    ["william-saliba", "Saliba", "DEF", 17],
    ["theo-hernandez", "T. Hern\u00e1ndez", "DEF", 22],
    ["jules-kounde", "Kound\u00e9", "DEF", 5],
    ["aurelien-tchouameni", "Tchouam\u00e9ni", "MID", 8],
    ["eduardo-camavinga", "Camavinga", "MID", 6],
    ["antoine-griezmann", "Griezmann", "MID", 7],
    ["kylian-mbappe", "Mbapp\u00e9", "FWD", 10],
    ["ousmane-dembele", "Demb\u00e9l\u00e9", "FWD", 11],
    ["marcus-thuram", "Thuram", "FWD", 15],
    ["randal-kolo-muani", "Kolo Muani", "FWD", 12],
    ["olivier-giroud", "Giroud", "FWD", 9],
  ],
  england: [
    ["jordan-pickford", "Pickford", "GK", 1],
    ["aaron-ramsdale", "Ramsdale", "GK", 23],
    ["john-stones", "Stones", "DEF", 5],
    ["harry-maguire", "Maguire", "DEF", 6],
    ["kyle-walker", "Walker", "DEF", 2],
    ["luke-shaw", "Shaw", "DEF", 3],
    ["trent-alexander-arnold", "Alexander-Arnold", "DEF", 18],
    ["declan-rice", "Rice", "MID", 4],
    ["jude-bellingham", "Bellingham", "MID", 10],
    ["phil-foden", "Foden", "MID", 11],
    ["mason-mount", "Mount", "MID", 19],
    ["bukayo-saka", "Saka", "FWD", 7],
    ["harry-kane", "Kane", "FWD", 9],
    ["marcus-rashford", "Rashford", "FWD", 17],
    ["cole-palmer", "Palmer", "FWD", 20],
  ],
  spain: [
    ["unai-simon", "Unai Sim\u00f3n", "GK", 23],
    ["david-raya", "Raya", "GK", 13],
    ["aymeric-laporte", "Laporte", "DEF", 14],
    ["dani-carvajal", "Carvajal", "DEF", 2],
    ["marc-cucurella", "Cucurella", "DEF", 24],
    ["robin-le-normand", "Le Normand", "DEF", 4],
    ["alejandro-balde", "Bald\u00e9", "DEF", 18],
    ["rodri", "Rodri", "MID", 16],
    ["pedri", "Pedri", "MID", 8],
    ["gavi", "Gavi", "MID", 6],
    ["dani-olmo", "Dani Olmo", "MID", 10],
    ["lamine-yamal", "Lamine Yamal", "FWD", 19],
    ["nico-williams", "Nico Williams", "FWD", 11],
    ["alvaro-morata", "Morata", "FWD", 7],
    ["ferran-torres", "Ferran Torres", "FWD", 9],
  ],
  germany: [
    ["marc-andre-ter-stegen", "ter Stegen", "GK", 22],
    ["manuel-neuer", "Neuer", "GK", 1],
    ["antonio-rudiger", "R\u00fcdiger", "DEF", 2],
    ["jonathan-tah", "Tah", "DEF", 4],
    ["david-raum", "Raum", "DEF", 3],
    ["joshua-kimmich", "Kimmich", "DEF", 6],
    ["nico-schlotterbeck", "Schlotterbeck", "DEF", 23],
    ["toni-kroos", "Kroos", "MID", 8],
    ["ilkay-gundogan", "G\u00fcndogan", "MID", 21],
    ["jamal-musiala", "Musiala", "MID", 10],
    ["florian-wirtz", "Wirtz", "MID", 17],
    ["kai-havertz", "Havertz", "FWD", 7],
    ["leroy-sane", "San\u00e9", "FWD", 19],
    ["serge-gnabry", "Gnabry", "FWD", 14],
    ["niclas-fullkrug", "F\u00fcllkrug", "FWD", 9],
  ],
  portugal: [
    ["diogo-costa", "Diogo Costa", "GK", 22],
    ["rui-patricio", "Rui Patr\u00edcio", "GK", 1],
    ["ruben-dias", "R\u00faben Dias", "DEF", 4],
    ["pepe", "Pepe", "DEF", 3],
    ["joao-cancelo", "Cancelo", "DEF", 20],
    ["nuno-mendes", "Nuno Mendes", "DEF", 19],
    ["diogo-dalot", "Dalot", "DEF", 2],
    ["bernardo-silva", "Bernardo", "MID", 10],
    ["bruno-fernandes", "Bruno", "MID", 8],
    ["vitinha", "Vitinha", "MID", 23],
    ["joao-palhinha", "Palhinha", "MID", 6],
    ["cristiano-ronaldo", "Ronaldo", "FWD", 7],
    ["rafael-leao", "Leao", "FWD", 17],
    ["goncalo-ramos", "Ramos", "FWD", 9],
    ["diogo-jota", "Jota", "FWD", 21],
  ],
  netherlands: [
    ["bart-verbruggen", "Verbruggen", "GK", 13],
    ["mark-flekken", "Flekken", "GK", 23],
    ["virgil-van-dijk", "Van Dijk", "DEF", 4],
    ["nathan-ake", "Ak\u00e9", "DEF", 5],
    ["denzel-dumfries", "Dumfries", "DEF", 22],
    ["jurrien-timber", "Timber", "DEF", 2],
    ["stefan-de-vrij", "De Vrij", "DEF", 6],
    ["frenkie-de-jong", "F. de Jong", "MID", 21],
    ["ryan-gravenberch", "Gravenberch", "MID", 8],
    ["xavi-simons", "X. Simons", "MID", 7],
    ["tijjani-reijnders", "Reijnders", "MID", 14],
    ["cody-gakpo", "Gakpo", "FWD", 11],
    ["memphis-depay", "Depay", "FWD", 10],
    ["wout-weghorst", "Weghorst", "FWD", 9],
    ["donyell-malen", "Malen", "FWD", 18],
  ],
  usa: [
    ["matt-turner", "Turner", "GK", 1],
    ["ethan-horvath", "Horvath", "GK", 22],
    ["sergino-dest", "Dest", "DEF", 2],
    ["antonee-robinson", "Robinson", "DEF", 5],
    ["chris-richards", "Richards", "DEF", 4],
    ["tim-ream", "Ream", "DEF", 13],
    ["tyler-adams", "Adams", "MID", 4],
    ["weston-mckennie", "McKennie", "MID", 8],
    ["yunus-musah", "Musah", "MID", 6],
    ["giovanni-reyna", "Reyna", "MID", 7],
    ["christian-pulisic", "Pulisic", "FWD", 10],
    ["timothy-weah", "Weah", "FWD", 11],
    ["josh-sargent", "Sargent", "FWD", 9],
    ["folarin-balogun", "Balogun", "FWD", 20],
    ["brenden-aaronson", "Aaronson", "FWD", 17],
  ],
  mexico: [
    ["guillermo-ochoa", "Ochoa", "GK", 13],
    ["luis-malagon", "Malag\u00f3n", "GK", 1],
    ["jorge-sanchez", "J. S\u00e1nchez", "DEF", 2],
    ["cesar-montes", "Montes", "DEF", 4],
    ["jesus-gallardo", "Gallardo", "DEF", 23],
    ["johan-vasquez", "V\u00e1squez", "DEF", 5],
    ["edson-alvarez", "E. \u00c1lvarez", "MID", 4],
    ["luis-chavez", "Ch\u00e1vez", "MID", 18],
    ["luis-romo", "Romo", "MID", 7],
    ["diego-lainez", "Lainez", "MID", 10],
    ["hirving-lozano", "Lozano", "FWD", 22],
    ["raul-jimenez", "Jim\u00e9nez", "FWD", 9],
    ["santiago-gimenez", "S. Gim\u00e9nez", "FWD", 20],
    ["henry-martin", "H. Mart\u00edn", "FWD", 11],
    ["alexis-vega", "Vega", "FWD", 14],
  ],
};

/** Generate a default squad for teams without explicit data */
function generateDefaultSquad(teamSlug: string): FormationPlayer[] {
  const positions: Array<[Position, number, number]> = [
    ["GK", 1, 2],
    ["DEF", 2, 6],
    ["MID", 6, 5],
    ["FWD", 14, 4],
  ];
  const players: FormationPlayer[] = [];
  let num = 1;
  for (const [pos, start, count] of positions) {
    for (let i = 0; i < count; i++) {
      players.push({
        slug: `${teamSlug}-${pos.toLowerCase()}-${i + 1}`,
        name: `${pos} ${i + 1}`,
        teamSlug,
        position: pos,
        number: num++,
      });
    }
  }
  return players;
}

export function getSquad(teamSlug: string): FormationPlayer[] {
  if (SQUADS[teamSlug]) return SQUADS[teamSlug];

  const keyData = KEY_SQUADS[teamSlug];
  if (keyData) {
    const squad = keyData.map(([slug, name, pos, num]) => ({
      slug,
      name,
      teamSlug,
      position: pos,
      number: num,
    }));
    SQUADS[teamSlug] = squad;
    return squad;
  }

  const defaultSquad = generateDefaultSquad(teamSlug);
  SQUADS[teamSlug] = defaultSquad;
  return defaultSquad;
}

export function getPlayersByPosition(
  teamSlug: string,
  position: Position,
): FormationPlayer[] {
  return getSquad(teamSlug).filter((p) => p.position === position);
}
