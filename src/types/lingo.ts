export interface LingoCountry {
  id: string
  name: string
  localName: string
  ipa: string
  phonetic: string
  syllables: string[]
  stressIndex: number
  audioHint: string
  commonMistakes: string[]
  funFact: string
  region: string
  flag: string
  difficultyRating: number
  localPronunciation?: string
}

export interface LingoPlayer {
  id: string
  name: string
  country: string
  ipa: string
  phonetic: string
  syllables: string[]
  stressIndex: number
  audioHint: string
  commonMistakes: string[]
  funFact: string
  difficulty: number
  position: string
  club: string
}

export interface LingoTranslation {
  word: string
  phonetic: string
  note?: string
}

export interface LingoFootballTerm {
  id: string
  english: string
  definition: string
  translations: Record<string, LingoTranslation>
  note?: string
}

export interface LingoChant {
  team: string
  chant: string
  phonetic: string
  meaning: string
  context: string
}

export interface LingoQuizQuestion {
  question: string
  answer: string
  hint: string
}

export interface LingoTermsData {
  terms: LingoFootballTerm[]
  chants: LingoChant[]
  quiz_questions: LingoQuizQuestion[]
}
