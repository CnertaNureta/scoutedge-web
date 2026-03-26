/**
 * i18n locale definitions and translations for all 8 supported languages.
 * Used by the [locale] dynamic route to generate localized landing pages.
 */

export const SUPPORTED_LOCALES = ['es', 'zh', 'pt', 'ar', 'fr', 'ja', 'ko', 'de'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export interface LocaleConfig {
  code: Locale
  name: string
  nativeName: string
  dir: 'ltr' | 'rtl'
  flag: string
  hreflang: string
}

export const LOCALE_CONFIGS: Record<Locale, LocaleConfig> = {
  es: { code: 'es', name: 'Spanish', nativeName: 'Español', dir: 'ltr', flag: '🇪🇸', hreflang: 'es' },
  zh: { code: 'zh', name: 'Chinese', nativeName: '中文', dir: 'ltr', flag: '🇨🇳', hreflang: 'zh-Hans' },
  pt: { code: 'pt', name: 'Portuguese', nativeName: 'Português', dir: 'ltr', flag: '🇧🇷', hreflang: 'pt' },
  ar: { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl', flag: '🇸🇦', hreflang: 'ar' },
  fr: { code: 'fr', name: 'French', nativeName: 'Français', dir: 'ltr', flag: '🇫🇷', hreflang: 'fr' },
  ja: { code: 'ja', name: 'Japanese', nativeName: '日本語', dir: 'ltr', flag: '🇯🇵', hreflang: 'ja' },
  ko: { code: 'ko', name: 'Korean', nativeName: '한국어', dir: 'ltr', flag: '🇰🇷', hreflang: 'ko' },
  de: { code: 'de', name: 'German', nativeName: 'Deutsch', dir: 'ltr', flag: '🇩🇪', hreflang: 'de' },
}

export interface LocaleTranslations {
  // Meta
  metaTitle: string
  metaDescription: string

  // Hero
  heroDateRange: string
  heroTitle1: string
  heroTitle2: string
  heroTitle3: string
  heroDescription: string
  heroCTA: string
  heroSecondaryCTA: string

  // Stats
  statsTeams: string
  statsHostCities: string
  statsMatches: string
  statsPlayers: string

  // Sections
  topContendersTitle: string
  topContendersSubtitle: string
  viewAllTeams: string
  analysisTitle: string
  toolsTitle: string

  // Feature cards
  featureTeams: string
  featureTeamsDesc: string
  featureMatches: string
  featureMatchesDesc: string
  featurePowerRankings: string
  featurePowerRankingsDesc: string
  featureDailyBriefing: string
  featureDailyBriefingDesc: string
  featurePredictions: string
  featurePredictionsDesc: string

  // CTA
  ctaTitle: string
  ctaDescription: string
  ctaButton: string

  // Newsletter
  newsletterTitle: string
  newsletterDescription: string
  newsletterPlaceholder: string
  newsletterButton: string

  // Navigation
  navTeams: string
  navTournament: string
  navAnalysis: string
  navCompare: string
  navBlog: string
  navPredictions: string
  navCommunity: string

  // Footer
  footerTagline: string
}

export const TRANSLATIONS: Record<Locale, LocaleTranslations> = {
  es: {
    metaTitle: 'Copa del Mundo 2026 — Predicciones IA, Análisis de Plantillas y Pronósticos | ScoutEdge',
    metaDescription: 'Predicciones impulsadas por IA y análisis de las 48 selecciones del Mundial 2026. Índices de química, probabilidades de victoria e informes de jugadores en EE.UU., Canadá y México.',
    heroDateRange: '11 de junio — 19 de julio, 2026',
    heroTitle1: 'COPA DEL',
    heroTitle2: 'MUNDO 2026',
    heroTitle3: 'INTELIGENCIA',
    heroDescription: 'Análisis profundo de plantillas, índices de química, predicciones de probabilidad de victoria e informes de inteligencia de jugadores para las 48 selecciones que compiten en Estados Unidos, Canadá y México.',
    heroCTA: 'Explorar las 48 Selecciones',
    heroSecondaryCTA: 'Principales Candidatos',
    statsTeams: 'Selecciones',
    statsHostCities: 'Ciudades Sede',
    statsMatches: 'Partidos',
    statsPlayers: 'Jugadores Analizados',
    topContendersTitle: 'Principales Candidatos',
    topContendersSubtitle: 'Las selecciones mejor clasificadas rumbo al torneo 2026',
    viewAllTeams: 'Ver Todas las Selecciones',
    analysisTitle: 'Análisis e Inteligencia',
    toolsTitle: 'Herramientas y Recursos',
    featureTeams: 'Las 48 Selecciones',
    featureTeamsDesc: 'Química de equipo, perfiles tácticos y predicciones IA para cada selección.',
    featureMatches: 'Calendario de Partidos',
    featureMatchesDesc: 'Todos los partidos de la fase de grupos con probabilidades de victoria.',
    featurePowerRankings: 'Ranking de Poder',
    featurePowerRankingsDesc: 'Rankings IA combinando forma, química y profundidad de plantilla.',
    featureDailyBriefing: 'Informe Diario',
    featureDailyBriefingDesc: 'Noticias en vivo y señales extraídas por IA actualizadas diariamente.',
    featurePredictions: 'Desafío de Predicciones',
    featurePredictionsDesc: 'Elige ganadores, selecciona tu campeón y compite contra la IA.',
    ctaTitle: 'Inteligencia Premium te Espera',
    ctaDescription: 'Obtén informes completos de análisis, seguimiento en tiempo real y análisis predictivo para cada partido del Mundial 2026.',
    ctaButton: 'Suscribirse a Intel Premium',
    newsletterTitle: 'Informe de Inteligencia Diario',
    newsletterDescription: 'Recibe análisis del Mundial 2026 impulsado por IA en tu correo cada mañana.',
    newsletterPlaceholder: 'tu@email.com',
    newsletterButton: 'Suscribirse',
    navTeams: 'Selecciones',
    navTournament: 'Torneo',
    navAnalysis: 'Análisis',
    navCompare: 'Comparar',
    navBlog: 'Blog',
    navPredictions: 'Predicciones',
    navCommunity: 'Comunidad',
    footerTagline: 'Inteligencia IA para el Mundial 2026',
  },

  zh: {
    metaTitle: '2026世界杯 — AI预测、阵容分析与比赛前瞻 | ScoutEdge',
    metaDescription: 'AI驱动的2026世界杯48支球队预测与分析。化学指数、胜率预测、球员球探报告，覆盖美国、加拿大和墨西哥三国赛事。',
    heroDateRange: '2026年6月11日 — 7月19日',
    heroTitle1: '2026',
    heroTitle2: '世界杯',
    heroTitle3: 'AI情报站',
    heroDescription: '深度阵容分析、化学指数、胜率预测、球员情报报告，覆盖在美国、加拿大和墨西哥参赛的全部48支国家队。',
    heroCTA: '探索全部48支球队',
    heroSecondaryCTA: '夺冠热门',
    statsTeams: '参赛球队',
    statsHostCities: '举办城市',
    statsMatches: '比赛场次',
    statsPlayers: '分析球员',
    topContendersTitle: '夺冠热门',
    topContendersSubtitle: '2026世界杯FIFA排名最高的球队',
    viewAllTeams: '查看全部球队',
    analysisTitle: '分析与情报',
    toolsTitle: '工具与资源',
    featureTeams: '48支球队',
    featureTeamsDesc: '阵容化学反应、战术档案和每支球队的AI预测。',
    featureMatches: '赛程表',
    featureMatchesDesc: '完整小组赛赛程及AI胜率预测。',
    featurePowerRankings: '实力排行榜',
    featurePowerRankingsDesc: 'AI驱动排名：综合状态、化学反应和阵容深度。',
    featureDailyBriefing: '每日简报',
    featureDailyBriefingDesc: '实时新闻和AI提取的每日更新信号。',
    featurePredictions: '预测挑战赛',
    featurePredictionsDesc: '选择比赛赢家、挑选冠军，与AI一较高下。',
    ctaTitle: '高级情报等你解锁',
    ctaDescription: '获取完整的AI球探报告、实时健康追踪和2026世界杯每场比赛的预测分析。',
    ctaButton: '订阅高级情报',
    newsletterTitle: '每日情报简报',
    newsletterDescription: '每天早上收到AI驱动的2026世界杯分析邮件。',
    newsletterPlaceholder: '你的邮箱',
    newsletterButton: '订阅',
    navTeams: '球队',
    navTournament: '赛事',
    navAnalysis: '分析',
    navCompare: '对比',
    navBlog: '博客',
    navPredictions: '预测',
    navCommunity: '社区',
    footerTagline: '2026世界杯AI情报平台',
  },

  pt: {
    metaTitle: 'Copa do Mundo 2026 — Previsões IA, Análise de Elencos e Prognósticos | ScoutEdge',
    metaDescription: 'Previsões e análises com IA para todas as 48 seleções da Copa do Mundo 2026. Índices de entrosamento, probabilidades de vitória e relatórios de jogadores nos EUA, Canadá e México.',
    heroDateRange: '11 de junho — 19 de julho, 2026',
    heroTitle1: 'COPA DO',
    heroTitle2: 'MUNDO 2026',
    heroTitle3: 'INTELIGÊNCIA',
    heroDescription: 'Análise aprofundada de elencos, índices de entrosamento, previsões de probabilidade e relatórios de inteligência para as 48 seleções que competem nos Estados Unidos, Canadá e México.',
    heroCTA: 'Explorar as 48 Seleções',
    heroSecondaryCTA: 'Principais Candidatas',
    statsTeams: 'Seleções',
    statsHostCities: 'Cidades-Sede',
    statsMatches: 'Jogos',
    statsPlayers: 'Jogadores Analisados',
    topContendersTitle: 'Principais Candidatas',
    topContendersSubtitle: 'As seleções mais bem classificadas rumo ao torneio de 2026',
    viewAllTeams: 'Ver Todas as Seleções',
    analysisTitle: 'Análise e Inteligência',
    toolsTitle: 'Ferramentas e Recursos',
    featureTeams: 'Todas as 48 Seleções',
    featureTeamsDesc: 'Entrosamento, perfis táticos e previsões IA para cada seleção.',
    featureMatches: 'Calendário de Jogos',
    featureMatchesDesc: 'Todos os jogos da fase de grupos com probabilidades de vitória.',
    featurePowerRankings: 'Ranking de Força',
    featurePowerRankingsDesc: 'Rankings com IA combinando forma, entrosamento e profundidade de elenco.',
    featureDailyBriefing: 'Briefing Diário',
    featureDailyBriefingDesc: 'Notícias ao vivo e sinais extraídos por IA atualizados diariamente.',
    featurePredictions: 'Desafio de Previsões',
    featurePredictionsDesc: 'Escolha vencedores, selecione seu campeão e dispute contra a IA.',
    ctaTitle: 'Inteligência Premium Aguarda',
    ctaDescription: 'Obtenha relatórios completos de análise, monitoramento em tempo real e análise preditiva para cada jogo da Copa 2026.',
    ctaButton: 'Assinar Intel Premium',
    newsletterTitle: 'Briefing de Inteligência Diário',
    newsletterDescription: 'Receba análises da Copa 2026 com IA no seu email toda manhã.',
    newsletterPlaceholder: 'seu@email.com',
    newsletterButton: 'Assinar',
    navTeams: 'Seleções',
    navTournament: 'Torneio',
    navAnalysis: 'Análise',
    navCompare: 'Comparar',
    navBlog: 'Blog',
    navPredictions: 'Previsões',
    navCommunity: 'Comunidade',
    footerTagline: 'Inteligência IA para a Copa do Mundo 2026',
  },

  ar: {
    metaTitle: 'كأس العالم 2026 — توقعات الذكاء الاصطناعي وتحليل الفرق | ScoutEdge',
    metaDescription: 'توقعات وتحليلات مدعومة بالذكاء الاصطناعي لجميع المنتخبات الـ48 في كأس العالم 2026. مؤشرات التناغم واحتمالات الفوز وتقارير اللاعبين.',
    heroDateRange: '11 يونيو — 19 يوليو، 2026',
    heroTitle1: 'كأس',
    heroTitle2: 'العالم 2026',
    heroTitle3: 'الاستخبارات',
    heroDescription: 'تحليل عميق للفرق، مؤشرات التناغم، توقعات احتمالات الفوز وتقارير استخبارية للاعبين لجميع المنتخبات الـ48 المشاركة في الولايات المتحدة وكندا والمكسيك.',
    heroCTA: 'استكشف جميع الـ48 منتخبًا',
    heroSecondaryCTA: 'أبرز المرشحين',
    statsTeams: 'منتخبات',
    statsHostCities: 'مدن مستضيفة',
    statsMatches: 'مباريات',
    statsPlayers: 'لاعب تم تحليله',
    topContendersTitle: 'أبرز المرشحين',
    topContendersSubtitle: 'المنتخبات الأعلى تصنيفًا قبل بطولة 2026',
    viewAllTeams: 'عرض جميع المنتخبات',
    analysisTitle: 'التحليل والاستخبارات',
    toolsTitle: 'الأدوات والموارد',
    featureTeams: 'جميع الـ48 منتخبًا',
    featureTeamsDesc: 'تناغم الفريق، الملفات التكتيكية وتوقعات الذكاء الاصطناعي لكل منتخب.',
    featureMatches: 'جدول المباريات',
    featureMatchesDesc: 'جميع مباريات دور المجموعات مع احتمالات الفوز.',
    featurePowerRankings: 'تصنيف القوة',
    featurePowerRankingsDesc: 'تصنيفات بالذكاء الاصطناعي تجمع بين الأداء والتناغم وعمق التشكيلة.',
    featureDailyBriefing: 'التقرير اليومي',
    featureDailyBriefingDesc: 'أخبار مباشرة وإشارات مستخرجة بالذكاء الاصطناعي يوميًا.',
    featurePredictions: 'تحدي التوقعات',
    featurePredictionsDesc: 'اختر الفائزين، حدد بطلك ونافس الذكاء الاصطناعي.',
    ctaTitle: 'استخبارات متميزة بانتظارك',
    ctaDescription: 'احصل على تقارير كشفية كاملة وتتبع لياقة في الوقت الفعلي وتحليل تنبؤي لكل مباراة.',
    ctaButton: 'اشترك في الاستخبارات المتميزة',
    newsletterTitle: 'التقرير الاستخباراتي اليومي',
    newsletterDescription: 'احصل على تحليلات كأس العالم 2026 بالذكاء الاصطناعي في بريدك كل صباح.',
    newsletterPlaceholder: 'بريدك@الإلكتروني.com',
    newsletterButton: 'اشترك',
    navTeams: 'المنتخبات',
    navTournament: 'البطولة',
    navAnalysis: 'التحليل',
    navCompare: 'مقارنة',
    navBlog: 'المدونة',
    navPredictions: 'التوقعات',
    navCommunity: 'المجتمع',
    footerTagline: 'استخبارات الذكاء الاصطناعي لكأس العالم 2026',
  },

  fr: {
    metaTitle: 'Coupe du Monde 2026 — Prédictions IA, Analyse des Effectifs et Pronostics | ScoutEdge',
    metaDescription: 'Prédictions et analyses par IA des 48 équipes de la Coupe du Monde 2026. Indices de cohésion, probabilités de victoire et rapports de joueurs aux USA, Canada et Mexique.',
    heroDateRange: '11 juin — 19 juillet 2026',
    heroTitle1: 'COUPE DU',
    heroTitle2: 'MONDE 2026',
    heroTitle3: 'INTELLIGENCE',
    heroDescription: 'Analyse approfondie des effectifs, indices de cohésion, prédictions de probabilités et rapports de renseignement pour les 48 nations en compétition aux États-Unis, au Canada et au Mexique.',
    heroCTA: 'Explorer les 48 Équipes',
    heroSecondaryCTA: 'Principaux Favoris',
    statsTeams: 'Équipes',
    statsHostCities: 'Villes Hôtes',
    statsMatches: 'Matchs',
    statsPlayers: 'Joueurs Analysés',
    topContendersTitle: 'Principaux Favoris',
    topContendersSubtitle: 'Les nations les mieux classées avant le tournoi 2026',
    viewAllTeams: 'Voir Toutes les Équipes',
    analysisTitle: 'Analyse et Intelligence',
    toolsTitle: 'Outils et Ressources',
    featureTeams: 'Les 48 Équipes',
    featureTeamsDesc: 'Cohésion d\'équipe, profils tactiques et prédictions IA pour chaque nation.',
    featureMatches: 'Calendrier des Matchs',
    featureMatchesDesc: 'Tous les matchs de poules avec probabilités de victoire IA.',
    featurePowerRankings: 'Classement de Puissance',
    featurePowerRankingsDesc: 'Classements IA combinant forme, cohésion et profondeur d\'effectif.',
    featureDailyBriefing: 'Briefing Quotidien',
    featureDailyBriefingDesc: 'Actualités en direct et signaux extraits par IA mis à jour quotidiennement.',
    featurePredictions: 'Défi Pronostics',
    featurePredictionsDesc: 'Choisissez les vainqueurs, désignez votre champion et affrontez l\'IA.',
    ctaTitle: 'L\'Intelligence Premium Vous Attend',
    ctaDescription: 'Obtenez des rapports de scouting complets, un suivi en temps réel et une analyse prédictive pour chaque match de la Coupe du Monde 2026.',
    ctaButton: 'S\'abonner à l\'Intel Premium',
    newsletterTitle: 'Briefing Intelligence Quotidien',
    newsletterDescription: 'Recevez l\'analyse Coupe du Monde 2026 par IA dans votre boîte mail chaque matin.',
    newsletterPlaceholder: 'votre@email.com',
    newsletterButton: 'S\'abonner',
    navTeams: 'Équipes',
    navTournament: 'Tournoi',
    navAnalysis: 'Analyse',
    navCompare: 'Comparer',
    navBlog: 'Blog',
    navPredictions: 'Pronostics',
    navCommunity: 'Communauté',
    footerTagline: 'Intelligence IA pour la Coupe du Monde 2026',
  },

  ja: {
    metaTitle: '2026 FIFAワールドカップ — AI予測、チーム分析＆試合プレビュー | ScoutEdge',
    metaDescription: '2026年ワールドカップ出場48チームのAI予測と分析。ケミストリー指数、勝率予測、選手スカウティングレポート。アメリカ・カナダ・メキシコ開催。',
    heroDateRange: '2026年6月11日 — 7月19日',
    heroTitle1: 'ワールド',
    heroTitle2: 'カップ 2026',
    heroTitle3: 'インテリジェンス',
    heroDescription: '全48代表チームの詳細な分析、ケミストリー指数、勝率予測、選手インテリジェンスレポート。アメリカ、カナダ、メキシコで開催。',
    heroCTA: '全48チームを探索',
    heroSecondaryCTA: '優勝候補',
    statsTeams: 'チーム',
    statsHostCities: '開催都市',
    statsMatches: '試合',
    statsPlayers: '分析選手数',
    topContendersTitle: '優勝候補',
    topContendersSubtitle: '2026年大会に向けてFIFAランキング上位のチーム',
    viewAllTeams: '全チームを見る',
    analysisTitle: '分析＆インテリジェンス',
    toolsTitle: 'ツール＆リソース',
    featureTeams: '全48チーム',
    featureTeamsDesc: 'チームケミストリー、戦術プロファイル、AI予測。',
    featureMatches: '試合日程',
    featureMatchesDesc: 'グループステージ全試合のAI勝率プレビュー。',
    featurePowerRankings: 'パワーランキング',
    featurePowerRankingsDesc: 'フォーム、ケミストリー、選手層を総合したAIランキング。',
    featureDailyBriefing: 'デイリーブリーフィング',
    featureDailyBriefingDesc: '最新ニュースとAI抽出シグナルを毎日更新。',
    featurePredictions: '予測チャレンジ',
    featurePredictionsDesc: '試合の勝者を予測し、優勝チームを選び、AIと対決。',
    ctaTitle: 'プレミアムインテリジェンス',
    ctaDescription: '2026ワールドカップ全試合のAIスカウティングレポート、リアルタイムフィットネス追跡、予測分析。',
    ctaButton: 'プレミアムに登録',
    newsletterTitle: 'デイリーインテリジェンスブリーフィング',
    newsletterDescription: 'AI分析を毎朝メールでお届け。',
    newsletterPlaceholder: 'メールアドレス',
    newsletterButton: '登録',
    navTeams: 'チーム',
    navTournament: '大会',
    navAnalysis: '分析',
    navCompare: '比較',
    navBlog: 'ブログ',
    navPredictions: '予測',
    navCommunity: 'コミュニティ',
    footerTagline: '2026 FIFAワールドカップAIインテリジェンス',
  },

  ko: {
    metaTitle: '2026 FIFA 월드컵 — AI 예측, 스쿼드 분석 & 경기 프리뷰 | ScoutEdge',
    metaDescription: '2026 월드컵 48개 대표팀의 AI 예측과 분석. 케미스트리 지수, 승률 예측, 선수 스카우팅 리포트. 미국·캐나다·멕시코 개최.',
    heroDateRange: '2026년 6월 11일 — 7월 19일',
    heroTitle1: 'FIFA',
    heroTitle2: '월드컵 2026',
    heroTitle3: '인텔리전스',
    heroDescription: '미국, 캐나다, 멕시코에서 경쟁하는 48개 대표팀의 심층 분석, 케미스트리 지수, 승률 예측 및 선수 인텔리전스 리포트.',
    heroCTA: '48개 팀 탐색하기',
    heroSecondaryCTA: '우승 후보',
    statsTeams: '대표팀',
    statsHostCities: '개최 도시',
    statsMatches: '경기',
    statsPlayers: '분석된 선수',
    topContendersTitle: '우승 후보',
    topContendersSubtitle: '2026 대회를 앞둔 FIFA 랭킹 최상위 팀',
    viewAllTeams: '전체 팀 보기',
    analysisTitle: '분석 & 인텔리전스',
    toolsTitle: '도구 & 리소스',
    featureTeams: '48개 전체 팀',
    featureTeamsDesc: '팀 케미스트리, 전술 프로필, AI 예측.',
    featureMatches: '경기 일정',
    featureMatchesDesc: '조별 리그 전 경기 AI 승률 프리뷰.',
    featurePowerRankings: '파워 랭킹',
    featurePowerRankingsDesc: '폼, 케미스트리, 선수 깊이를 결합한 AI 랭킹.',
    featureDailyBriefing: '데일리 브리핑',
    featureDailyBriefingDesc: '실시간 뉴스와 AI 추출 시그널 매일 업데이트.',
    featurePredictions: '예측 챌린지',
    featurePredictionsDesc: '경기 승자 선택, 우승팀 지목, AI와 대결.',
    ctaTitle: '프리미엄 인텔리전스',
    ctaDescription: '2026 월드컵 모든 경기의 AI 스카우팅 리포트, 실시간 피트니스 추적, 예측 분석.',
    ctaButton: '프리미엄 구독',
    newsletterTitle: '데일리 인텔리전스 브리핑',
    newsletterDescription: 'AI 분석을 매일 아침 이메일로 받아보세요.',
    newsletterPlaceholder: '이메일 주소',
    newsletterButton: '구독',
    navTeams: '대표팀',
    navTournament: '대회',
    navAnalysis: '분석',
    navCompare: '비교',
    navBlog: '블로그',
    navPredictions: '예측',
    navCommunity: '커뮤니티',
    footerTagline: '2026 FIFA 월드컵 AI 인텔리전스',
  },

  de: {
    metaTitle: 'WM 2026 — KI-Vorhersagen, Kaderanalyse & Spielvorschauen | ScoutEdge',
    metaDescription: 'KI-gestützte Vorhersagen und Analysen für alle 48 Teams der WM 2026. Chemie-Indizes, Siegwahrscheinlichkeiten und Spielerberichte in USA, Kanada und Mexiko.',
    heroDateRange: '11. Juni — 19. Juli 2026',
    heroTitle1: 'FUSSBALL',
    heroTitle2: 'WM 2026',
    heroTitle3: 'INTELLIGENCE',
    heroDescription: 'Tiefgehende Kaderanalysen, Chemie-Indizes, Siegwahrscheinlichkeiten und Spieler-Intelligence-Berichte für alle 48 Nationen in den USA, Kanada und Mexiko.',
    heroCTA: 'Alle 48 Teams erkunden',
    heroSecondaryCTA: 'Top-Favoriten',
    statsTeams: 'Teams',
    statsHostCities: 'Gastgeberstädte',
    statsMatches: 'Spiele',
    statsPlayers: 'Analysierte Spieler',
    topContendersTitle: 'Top-Favoriten',
    topContendersSubtitle: 'Die bestplatzierten Nationen vor dem Turnier 2026',
    viewAllTeams: 'Alle Teams ansehen',
    analysisTitle: 'Analyse & Intelligence',
    toolsTitle: 'Tools & Ressourcen',
    featureTeams: 'Alle 48 Teams',
    featureTeamsDesc: 'Teamchemie, taktische Profile und KI-Vorhersagen für jede Nation.',
    featureMatches: 'Spielplan',
    featureMatchesDesc: 'Alle Gruppenspiele mit KI-Siegwahrscheinlichkeiten.',
    featurePowerRankings: 'Power-Ranking',
    featurePowerRankingsDesc: 'KI-Rankings aus Form, Chemie und Kadertiefe.',
    featureDailyBriefing: 'Tägliches Briefing',
    featureDailyBriefingDesc: 'Live-News und KI-extrahierte Signale täglich aktualisiert.',
    featurePredictions: 'Tipp-Challenge',
    featurePredictionsDesc: 'Wähle Sieger, tippe deinen Champion und tritt gegen die KI an.',
    ctaTitle: 'Premium Intelligence wartet',
    ctaDescription: 'Erhalte vollständige KI-Scouting-Berichte, Echtzeit-Fitness-Tracking und prädiktive Analysen für jedes WM-Spiel.',
    ctaButton: 'Premium Intel abonnieren',
    newsletterTitle: 'Tägliches Intelligence-Briefing',
    newsletterDescription: 'Erhalte jeden Morgen KI-gestützte WM-2026-Analysen per E-Mail.',
    newsletterPlaceholder: 'deine@email.de',
    newsletterButton: 'Abonnieren',
    navTeams: 'Teams',
    navTournament: 'Turnier',
    navAnalysis: 'Analyse',
    navCompare: 'Vergleich',
    navBlog: 'Blog',
    navPredictions: 'Tipps',
    navCommunity: 'Community',
    footerTagline: 'KI-Intelligence für die WM 2026',
  },
}
