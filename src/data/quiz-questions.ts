export type Difficulty = "easy" | "medium" | "hard";
export type Category = "history" | "players" | "host-cities" | "rules";

export interface Question {
  id: string;
  category: Category;
  difficulty: Difficulty;
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
}

export const CATEGORIES: Record<Category, { label: string; emoji: string; description: string }> = {
  history: { label: "History", emoji: "🏆", description: "World Cup history from 1930 to today" },
  players: { label: "Players", emoji: "⚽", description: "Legends, stars, and records" },
  "host-cities": { label: "Host Cities", emoji: "🏟️", description: "2026 venues across USA, Canada & Mexico" },
  rules: { label: "Rules & Format", emoji: "📋", description: "Laws of the game and tournament rules" },
};

export const QUESTIONS: Question[] = [
  // ── HISTORY ────────────────────────────────────────────────────────────────
  {
    id: "h-e-1",
    category: "history",
    difficulty: "easy",
    question: "In which year was the very first FIFA World Cup held?",
    options: ["1926", "1930", "1934", "1938"],
    correctIndex: 1,
    explanation: "The first World Cup was held in Uruguay in 1930, with Uruguay winning the inaugural tournament.",
  },
  {
    id: "h-e-2",
    category: "history",
    difficulty: "easy",
    question: "Which country has won the most FIFA World Cup titles?",
    options: ["Germany", "Argentina", "Brazil", "Italy"],
    correctIndex: 2,
    explanation: "Brazil has won the World Cup 5 times (1958, 1962, 1970, 1994, 2002), more than any other nation.",
  },
  {
    id: "h-e-3",
    category: "history",
    difficulty: "easy",
    question: "Where was the 2022 FIFA World Cup held?",
    options: ["Saudi Arabia", "UAE", "Qatar", "Bahrain"],
    correctIndex: 2,
    explanation: "Qatar hosted the 2022 World Cup, becoming the first Middle Eastern country to do so.",
  },
  {
    id: "h-m-1",
    category: "history",
    difficulty: "medium",
    question: "Which World Cup final is known as the 'Maracanazo' — a massive upset that shocked the host nation?",
    options: ["1954 final", "1950 final", "1966 final", "1974 final"],
    correctIndex: 1,
    explanation: "In 1950 Uruguay beat Brazil in the decisive match at the Maracanã, in front of ~200,000 stunned Brazilian fans.",
  },
  {
    id: "h-m-2",
    category: "history",
    difficulty: "medium",
    question: "How many teams participated in the 2022 World Cup in Qatar?",
    options: ["32", "36", "48", "24"],
    correctIndex: 0,
    explanation: "The 2022 World Cup had 32 teams. The 2026 edition will be the first with 48.",
  },
  {
    id: "h-m-3",
    category: "history",
    difficulty: "medium",
    question: "Which nation won the first World Cup played in Europe?",
    options: ["Italy", "Germany", "France", "England"],
    correctIndex: 0,
    explanation: "Italy won the 1934 World Cup, which was held in Italy — the first tournament on European soil.",
  },
  {
    id: "h-h-1",
    category: "history",
    difficulty: "hard",
    question: "Which World Cup saw the highest-scoring final ever, ending 3–2?",
    options: ["1950", "1954", "1958", "1966"],
    correctIndex: 1,
    explanation: "The 1954 final in Switzerland saw West Germany beat Hungary 3–2 in what's called the 'Miracle of Bern'.",
  },
  {
    id: "h-h-2",
    category: "history",
    difficulty: "hard",
    question: "Who scored the winning goal in the 2014 World Cup final for Germany?",
    options: ["Thomas Müller", "Toni Kroos", "Mario Götze", "Miroslav Klose"],
    correctIndex: 2,
    explanation: "Mario Götze scored in extra time to give Germany a 1–0 win over Argentina in the 2014 final in Brazil.",
  },
  {
    id: "h-h-3",
    category: "history",
    difficulty: "hard",
    question: "Which team did Italy defeat in both the 1934 and 1938 World Cup finals?",
    options: ["Brazil", "Hungary", "Germany", "Czechoslovakia"],
    correctIndex: 1,
    explanation: "Italy beat Czechoslovakia in 1934 and Hungary in 1938, becoming the first team to win back-to-back World Cups.",
  },

  // ── PLAYERS ────────────────────────────────────────────────────────────────
  {
    id: "p-e-1",
    category: "players",
    difficulty: "easy",
    question: "Who is the all-time leading scorer in World Cup history?",
    options: ["Ronaldo (Brazil)", "Miroslav Klose", "Just Fontaine", "Pelé"],
    correctIndex: 1,
    explanation: "Miroslav Klose (Germany) holds the record with 16 World Cup goals across 4 tournaments (2002–2014).",
  },
  {
    id: "p-e-2",
    category: "players",
    difficulty: "easy",
    question: "Who won the Golden Ball award at the 2022 World Cup?",
    options: ["Kylian Mbappé", "Emi Martínez", "Luka Modrić", "Lionel Messi"],
    correctIndex: 3,
    explanation: "Lionel Messi won the Golden Ball in 2022 after leading Argentina to World Cup glory.",
  },
  {
    id: "p-e-3",
    category: "players",
    difficulty: "easy",
    question: "Which player was famously known as 'El Pibe de Oro' (The Golden Kid)?",
    options: ["Pelé", "Diego Maradona", "Ronaldo", "Zinedine Zidane"],
    correctIndex: 1,
    explanation: "Diego Maradona of Argentina was nicknamed 'El Pibe de Oro'. He won the World Cup with Argentina in 1986.",
  },
  {
    id: "p-m-1",
    category: "players",
    difficulty: "medium",
    question: "Which player scored 13 goals in a single World Cup — a record that still stands?",
    options: ["Pelé", "Eusébio", "Just Fontaine", "Gerd Müller"],
    correctIndex: 2,
    explanation: "Just Fontaine of France scored 13 goals at the 1958 World Cup in Sweden — a record that has stood for over 65 years.",
  },
  {
    id: "p-m-2",
    category: "players",
    difficulty: "medium",
    question: "Who scored the famous 'Hand of God' goal against England in 1986?",
    options: ["Carlos Valderrama", "Diego Maradona", "Jorge Burruchaga", "Jorge Valdano"],
    correctIndex: 1,
    explanation: "Diego Maradona scored with his hand in the 1986 quarter-final and later called it the 'Hand of God'.",
  },
  {
    id: "p-m-3",
    category: "players",
    difficulty: "medium",
    question: "Kylian Mbappé won the Golden Boot at the 2022 World Cup. How many goals did he score?",
    options: ["6", "7", "8", "9"],
    correctIndex: 2,
    explanation: "Mbappé scored 8 goals at the 2022 World Cup, including a hat-trick in the final against Argentina.",
  },
  {
    id: "p-h-1",
    category: "players",
    difficulty: "hard",
    question: "Who is the only player to win the World Cup three times as a player?",
    options: ["Pelé", "Cafú", "Ronaldo (Brazil)", "Didi"],
    correctIndex: 0,
    explanation: "Pelé won the World Cup in 1958, 1962, and 1970 with Brazil — the only player to win it three times.",
  },
  {
    id: "p-h-2",
    category: "players",
    difficulty: "hard",
    question: "Which goalkeeper kept a clean sheet in all 6 matches of France's 1998 World Cup winning campaign?",
    options: ["Fabien Barthez", "Bernard Lama", "Mickaël Landreau", "Jérôme Alonzo"],
    correctIndex: 0,
    explanation: "Fabien Barthez conceded no goals until the final against Brazil, which France won 3–0.",
  },
  {
    id: "p-h-3",
    category: "players",
    difficulty: "hard",
    question: "Which player received the first-ever red card in World Cup history (1974)?",
    options: ["Carlos Caszely", "Johann Cruyff", "Berti Vogts", "Rivelino"],
    correctIndex: 0,
    explanation: "Carlos Caszely of Chile received the first red card in World Cup history in the 1974 group stage vs. West Germany.",
  },

  // ── HOST CITIES ────────────────────────────────────────────────────────────
  {
    id: "hc-e-1",
    category: "host-cities",
    difficulty: "easy",
    question: "How many countries will jointly host World Cup 2026?",
    options: ["2", "3", "4", "1"],
    correctIndex: 1,
    explanation: "The 2026 World Cup is jointly hosted by the USA, Canada, and Mexico — the first three-nation host.",
  },
  {
    id: "hc-e-2",
    category: "host-cities",
    difficulty: "easy",
    question: "How many cities will host matches at World Cup 2026?",
    options: ["12", "14", "16", "20"],
    correctIndex: 2,
    explanation: "16 cities across the USA (11), Canada (2), and Mexico (3) will host World Cup 2026 matches.",
  },
  {
    id: "hc-e-3",
    category: "host-cities",
    difficulty: "easy",
    question: "Which stadium will host the World Cup 2026 final?",
    options: ["SoFi Stadium", "MetLife Stadium", "AT&T Stadium", "Rose Bowl"],
    correctIndex: 1,
    explanation: "MetLife Stadium in East Rutherford, New Jersey (serving New York/New Jersey) will host the 2026 final.",
  },
  {
    id: "hc-m-1",
    category: "host-cities",
    difficulty: "medium",
    question: "Which Mexican city will host World Cup 2026 matches?",
    options: ["Monterrey, Guadalajara, and Mexico City", "Tijuana, Puebla, and León", "Cancún, Merida, and Oaxaca", "Veracruz, Toluca, and Querétaro"],
    correctIndex: 0,
    explanation: "Mexico's three host cities are Guadalajara (Estadio Akron), Monterrey (Estadio BBVA), and Mexico City (Estadio Azteca).",
  },
  {
    id: "hc-m-2",
    category: "host-cities",
    difficulty: "medium",
    question: "The iconic Estadio Azteca will host matches in 2026. What is its approximate capacity?",
    options: ["60,000", "75,000", "87,000", "95,000"],
    correctIndex: 2,
    explanation: "Estadio Azteca in Mexico City holds approximately 87,000 fans and is the only stadium to have hosted two World Cup finals (1970, 1986).",
  },
  {
    id: "hc-m-3",
    category: "host-cities",
    difficulty: "medium",
    question: "Which Canadian cities will host World Cup 2026?",
    options: ["Toronto and Vancouver", "Toronto and Montreal", "Vancouver and Calgary", "Ottawa and Edmonton"],
    correctIndex: 0,
    explanation: "Canada's two host cities are Toronto (BMO Field) and Vancouver (BC Place).",
  },
  {
    id: "hc-h-1",
    category: "host-cities",
    difficulty: "hard",
    question: "The Estadio Azteca previously hosted World Cup finals in 1970 and 1986. Which team won each?",
    options: ["Brazil (1970) and Argentina (1986)", "Italy (1970) and Germany (1986)", "Uruguay (1970) and France (1986)", "Brazil (1970) and West Germany (1986)"],
    correctIndex: 0,
    explanation: "Brazil beat Italy 4–1 in 1970, and Argentina beat West Germany 3–2 in 1986 — both at the Azteca.",
  },
  {
    id: "hc-h-2",
    category: "host-cities",
    difficulty: "hard",
    question: "Which US city hosts matches at SoFi Stadium in 2026?",
    options: ["Los Angeles", "San Francisco", "Las Vegas", "San Diego"],
    correctIndex: 0,
    explanation: "SoFi Stadium in Inglewood, California serves the Los Angeles market for World Cup 2026.",
  },
  {
    id: "hc-h-3",
    category: "host-cities",
    difficulty: "hard",
    question: "What is the official kickoff date for World Cup 2026?",
    options: ["June 8, 2026", "June 11, 2026", "June 14, 2026", "June 18, 2026"],
    correctIndex: 1,
    explanation: "World Cup 2026 kicks off on June 11, 2026 and runs until July 19, 2026.",
  },

  // ── RULES & FORMAT ─────────────────────────────────────────────────────────
  {
    id: "r-e-1",
    category: "rules",
    difficulty: "easy",
    question: "How many teams will compete in World Cup 2026?",
    options: ["32", "36", "40", "48"],
    correctIndex: 3,
    explanation: "World Cup 2026 expands from 32 to 48 teams — the biggest expansion in World Cup history.",
  },
  {
    id: "r-e-2",
    category: "rules",
    difficulty: "easy",
    question: "How many groups will World Cup 2026 have?",
    options: ["8", "10", "12", "16"],
    correctIndex: 2,
    explanation: "With 48 teams, World Cup 2026 will have 12 groups of 4 teams each.",
  },
  {
    id: "r-e-3",
    category: "rules",
    difficulty: "easy",
    question: "What is the standard duration of a World Cup match (before extra time)?",
    options: ["80 minutes", "90 minutes", "100 minutes", "120 minutes"],
    correctIndex: 1,
    explanation: "All football matches, including World Cup games, are 90 minutes (two 45-minute halves) before any extra time.",
  },
  {
    id: "r-m-1",
    category: "rules",
    difficulty: "medium",
    question: "In the 2026 group stage, how many teams advance from each group?",
    options: ["1", "2", "3", "All 4"],
    correctIndex: 1,
    explanation: "The top 2 teams from each of the 12 groups advance, plus the 8 best third-place teams, giving 32 teams in the Round of 32.",
  },
  {
    id: "r-m-2",
    category: "rules",
    difficulty: "medium",
    question: "How many total matches will be played at World Cup 2026?",
    options: ["64", "80", "100", "104"],
    correctIndex: 3,
    explanation: "The 48-team 2026 World Cup will feature 104 matches, up from 64 at previous 32-team tournaments.",
  },
  {
    id: "r-m-3",
    category: "rules",
    difficulty: "medium",
    question: "If a knockout match is tied after 90 minutes, what happens next?",
    options: ["Immediate penalties", "30 minutes of extra time, then penalties if still tied", "Replay the match the next day", "A coin toss"],
    correctIndex: 1,
    explanation: "Tied knockout games go to 30 minutes of extra time (2 × 15). If still level, a penalty shootout decides the winner.",
  },
  {
    id: "r-h-1",
    category: "rules",
    difficulty: "hard",
    question: "When was the VAR (Video Assistant Referee) system first used at a World Cup?",
    options: ["2010", "2014", "2018", "2022"],
    correctIndex: 2,
    explanation: "VAR was introduced at the 2018 World Cup in Russia, marking the first time video review was used at the tournament.",
  },
  {
    id: "r-h-2",
    category: "rules",
    difficulty: "hard",
    question: "How many substitute slots are allowed per team in a World Cup match (as of 2022)?",
    options: ["3", "4", "5", "6"],
    correctIndex: 2,
    explanation: "Teams are allowed up to 5 substitutions per match. The rule was updated from 3 to 5 after the COVID pandemic.",
  },
  {
    id: "r-h-3",
    category: "rules",
    difficulty: "hard",
    question: "A player receives a yellow card in the semi-final. How does this affect the final?",
    options: ["No effect — yellow cards reset after quarter-finals", "They are automatically suspended for the final", "They receive a warning only", "It depends on how many total yellows they have"],
    correctIndex: 0,
    explanation: "Yellow card accumulation is cleared after the quarter-finals, so a yellow in the semi-final does NOT result in suspension for the final.",
  },
];

export function getQuestionsByCategory(category: Category): Question[] {
  return QUESTIONS.filter((q) => q.category === category);
}

export function getQuestionsByDifficulty(difficulty: Difficulty): Question[] {
  return QUESTIONS.filter((q) => q.difficulty === difficulty);
}

export function getProgressiveQuestions(category: Category): Question[] {
  const easy = QUESTIONS.filter((q) => q.category === category && q.difficulty === "easy");
  const medium = QUESTIONS.filter((q) => q.category === category && q.difficulty === "medium");
  const hard = QUESTIONS.filter((q) => q.category === category && q.difficulty === "hard");
  return [...easy, ...medium, ...hard];
}

export function getMixedQuestions(count = 10): Question[] {
  const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
