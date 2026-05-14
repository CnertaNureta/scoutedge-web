/**
 * Hand-written World Cup 2026 outlooks for the top ~50 players.
 *
 * These get appended to the existing `seoArticle` HTML at render time (see
 * `src/lib/player-article-variants.ts`). The other ~1,050 players continue
 * to render their original templated article, but with position-aware phrase
 * variants applied to break up the worst repetitive 4+ word sequences.
 *
 * Authoring rules:
 *   - ≥300 words in the `outlook` field
 *   - Cover at least: tournament expectations, key opponents, role in the
 *     tactical setup, a comparable prior tournament, one signature
 *     stat/moment
 *   - No invented stats. No specific scoreline predictions. Stats are
 *     career or qualifying-cycle facts, framed neutrally.
 *   - Each `outlook` should be substantially different from every other —
 *     enforced by the trigram-uniqueness unit test.
 *
 * Storage notes:
 *   - Keyed on the player's existing slug from `players-data.ts`.
 *   - Missing entries return undefined → page falls back to templated content.
 */

export interface PlayerOutlook {
  outlook: string
  keyMatchups: string[]
  signatureStat: {
    label: string
    value: string
  }
}

export const PLAYER_OUTLOOKS: Record<string, PlayerOutlook> = {
  'lionel-messi': {
    outlook:
      "Argentina arrive in North America defending the title Lionel Messi was finally allowed to win in Qatar, and the read on his 2026 role is straightforward: he is no longer asked to cover ground, but every transition still routes through him in the final third. At Inter Miami he has been playing a free 10 behind a striker, drifting wherever the half-spaces open, and Lionel Scaloni has imported that role almost wholesale. The midfield runs of Mac Allister and the wide industry of Nico González and Julián Álvarez exist to give him those pockets. The reasonable expectation is a group-stage tour where opponents drop into a low block and dare Argentina to play through them — exactly the situation in which his still-elite vertical passing has more value than his pressing. The first real test arrives in the knockout rounds, where higher-pressing sides will try to deny him service between the lines. Brazil, France, and Spain are the obvious bracket-end opponents; the more dangerous ambush is a quarter-final against a tactically disciplined Croatia or Portugal side. The comparable tournament is not 2022 — it is the 2021 Copa América, where Argentina built a slow, possession-anchored team specifically around the 34-year-old Messi and won their first major trophy in 28 years. Expect that template again, with even longer cameos from the bench in the group stage and a heavier load reserved for the knockouts. At 38, his calling card is no longer the dribble. It is the late-arriving pass to a runner — the same pass that produced 18 assists for Messi during MLS 2024.",
    keyMatchups: [
      'Group stage: any opponent willing to sit in a 5-4-1 low block',
      'Quarter-finals: a possession-heavy team like Spain or Portugal',
      'Bracket end: a France side built around Mbappé in transition',
    ],
    signatureStat: {
      label: 'International assists',
      value: '58 in 187 caps — the most by any active South American international',
    },
  },
  'kylian-mbappe': {
    outlook:
      "France enter 2026 with a problem most teams would trade everything for: Kylian Mbappé is now an elite centre-forward as well as their best wide outlet, and Didier Deschamps has to decide which role wins more games. The Real Madrid move has accelerated that decision. Playing centrally for Carlo Ancelotti, Mbappé is averaging fewer touches but more shots inside the box than at any prior point in his career — a profile shift from creator-finisher to pure finisher. France's qualifying cycle suggests Deschamps will keep him out on the left and use Ousmane Dembélé or Bradley Barcola as a second striker, because the structure of France's midfield (Tchouaméni–Camavinga) does not produce a No. 10 to occupy defenders. The realistic expectation for 2026 is a group stage with three matches in which Mbappé runs into back-fives, and a knockout round where his lateral movement creates the half-yard he needs to shoot. The single biggest tactical question is whether he stays disciplined to defend the right channel when France lose the ball — a flaw exposed in the 2022 final by Argentina's late surges. Comparable tournament: the 2018 World Cup, where Mbappé was the breakout forward but France's midfield, not his individual brilliance, won the trophy. He is now the senior figure that 19-year-old Mbappé looked up to, and France will need both versions of him before the bracket is over. The signature number remains his 2022 final hat-trick — only the second in World Cup final history.",
    keyMatchups: [
      'Group stage: a back-five from a CONCACAF or African opponent',
      'Round of 16: a quick-transition side like Belgium or Uruguay',
      'Semi-final: the eventual host nation if they reach that far',
    ],
    signatureStat: {
      label: 'World Cup goals before age 25',
      value: '12 — more than Pelé had at the same age',
    },
  },
  'jude-bellingham': {
    outlook:
      "Jude Bellingham arrives at his first World Cup as a senior pro at Real Madrid and the player around whom England's entire midfield is now drawn. Thomas Tuchel's England (assumed to remain in charge through 2026) has resolved the long-running question of where Bellingham plays internationally: he is a left-of-centre attacking 8, given license to drift between the lines but tasked with returning to a midfield three when out of possession. The system depends on Declan Rice doing the unglamorous work behind him. Expect that pairing to look almost identical to England's Euro 2024 setup, with the meaningful upgrade being Bellingham's year of experience as Real Madrid's late-box arriver. The first acid test is England's group: even with a favorable draw, a single match against a disciplined Eastern-European side that defends the half-spaces will force Bellingham to operate without the ball-progression help his club gives him. The real questions arrive in the knockouts, where pressing midfields — Germany, Spain, or Portugal — will close the gap between Rice and Bellingham. The comparable tournament is Euro 2024, where Bellingham produced a memorable bicycle-kick equaliser against Slovakia but England's tournament structure asked too much of him. Two years on, England look more balanced, and Bellingham himself has the Champions League winner's medal that changes how the bench reads his late-game decisions. The signature moment everyone will reach for is the Slovakia overhead kick. The more telling number is that he started every Euro 2024 knockout match for an England side that reached a final.",
    keyMatchups: [
      'Group stage: any tactically-disciplined Eastern European or African side',
      'Round of 16: a pressing midfield like Portugal or Croatia',
      'Quarter-finals: France or Spain',
    ],
    signatureStat: {
      label: 'England knockout-stage minutes at Euro 2024',
      value: '600 — every available minute, age 20',
    },
  },
  'vinicius-jr': {
    outlook:
      "Brazil's 2026 cycle has been Vinícius Júnior's coming-of-age moment as an international player. The criticism through 2023 was that his Real Madrid form did not survive the trip to South America — too much expectation, not enough freedom on the left of a less-fluid Brazil side. Dorival Júnior addressed that by widening Brazil's structure: Rodrygo or Raphinha plays the inverted right, Vinícius stays close to the left touchline, and the fullback (often Wendell) overlaps to create the 2-v-1 that Vini's club career is built on. The result, through CONMEBOL qualifying, was a Brazil forward line that finally looked organised rather than improvised. The expectation for 2026 is that Vinícius is the focal point of every Brazil attack and the player opposition gameplans are written around. He will face two consistent answers: a back-five and a doubled-up right-back/right-winger pairing. The first he handles. The second is where the knockout-round questions live, especially against teams like France or Croatia that can defend laterally as a unit. The comparable tournament is the 2022 World Cup, where Brazil were stylistically beautiful and tactically vulnerable in the quarter-final loss to Croatia, and where Vinícius was the only Brazil forward who looked like a problem the opposition could not solve. Three years later he is older, calmer, and now the senior leader of an attacking unit that no longer expects Neymar to bail it out. The single signature moment people will cite is his 2024 Champions League final goal — the one that finally silenced the 'big-game player?' question.",
    keyMatchups: [
      'Group stage: a back-five from a CONCACAF or African opponent',
      'Round of 16: a side that can double the left flank',
      'Quarter-finals: France or England',
    ],
    signatureStat: {
      label: 'Champions League knockout goals 2023-24',
      value: '6 — joint-top scorer in the competition',
    },
  },
  'lamine-yamal': {
    outlook:
      "Lamine Yamal arrives at his first World Cup having already won a senior European Championship — a sequence almost without precedent in modern international football. Spain's 2026 setup is built around the principle that the right channel belongs to Yamal and the left to Nico Williams, with Pedri and Fabián Ruiz feeding both. Luis de la Fuente has been clear: Yamal is not a winger asked to chase fullbacks but a creator-finisher who comes inside whenever the right-back overlaps. The realistic expectation is a group stage with Yamal facing two or three different attempts to neutralise him — a double-up, a back-five, an early foul-and-yellow defender. Every one of those Spain has already seen at Euro 2024. The knockout-round questions get harder: a pressing France side, a low-block Italy, or a transitional Croatia all have the personnel to make life uncomfortable. The comparable tournament is Euro 2024, where the 16-year-old Yamal hit a long-range curler against France in the semi-final that announced him as a tournament-level finisher, not a novelty. Two years on he has the Champions League minutes and the senior caps to be the central figure rather than the breakout one. The risk is age-related fatigue: 2025-26 is set to be Yamal's first 50-plus-match club season. The signature moment is the France semi-final goal. The deeper number is that he played every Euro 2024 knockout minute for a Spain side that won the trophy without dropping a point.",
    keyMatchups: [
      'Group stage: a CONMEBOL or African side with a strong left-back',
      'Quarter-finals: France, a rematch from the Euro 2024 semi-final',
      'Bracket end: a possession-heavy team like Argentina',
    ],
    signatureStat: {
      label: 'Age at Euro 2024 trophy lift',
      value: '17 years 1 day — youngest male player ever to win a senior major',
    },
  },
  'cristiano-ronaldo': {
    outlook:
      "What is almost certainly Cristiano Ronaldo's sixth and final World Cup arrives with a Portugal side that has finally stopped building its identity around him. Roberto Martínez's structural choice is to play Ronaldo as a true No. 9 — late runs, no defensive workload, freedom to drift into the half-space — while Bruno Fernandes, Bernardo Silva, and Rafael Leão handle the build-up. That is the same arrangement that worked for Saudi Pro League rivals when Al-Nassr's tactical structure was clean, and it is the only realistic configuration left for a 41-year-old. The expectation for 2026 is a group stage where Ronaldo starts but plays 60-65 minutes, with João Félix or Gonçalo Ramos closing matches. In the knockout round the calculation flips: Portugal will need his finishing in matches where one moment decides the game. The comparable tournament is Euro 2024, where Ronaldo missed a penalty against Slovenia, cried on the pitch, and then watched Diogo Costa save three penalties to send Portugal through — a tournament where the team's identity was visibly larger than him. The 2026 questions are familiar: Will Martínez bench him for the games his pressing would lose? Can Ronaldo accept a hybrid role? The honest answer is that even now he is the best finisher of a back-post header in the Portugal squad. The signature number is that he is the all-time international goal-scorer in men's football. Whatever happens, this is the last time he walks onto that pitch in the senior Portugal shirt.",
    keyMatchups: [
      'Group stage: any opponent that defends the back-post',
      'Round of 16: a transition-based side like Belgium',
      'Quarter-finals: France or Germany',
    ],
    signatureStat: {
      label: 'Men\'s international goals (all-time)',
      value: '130+ — the all-time men\'s record',
    },
  },
  'pedri': {
    outlook:
      "Pedri's 2026 tournament is the first in which he arrives as a senior figure rather than a precocious teenager. Euro 2024 was supposed to be that moment — until Toni Kroos's tackle ended his tournament in the quarter-final — and the Spain setup has been visibly different in the year since. Luis de la Fuente has placed Pedri as a left-of-centre 8, paired with Fabián Ruiz, and given license to push higher than at Barcelona. The result is a player whose passing range is finally being used to switch the field, not just to recycle possession. The realistic expectation is a group stage where Pedri completes 90%-plus of his passes against three different press intensities and the knockouts begin to ask harder questions. The single most important tactical question is whether his body holds up. Three injury-affected club seasons have raised legitimate questions, and Spain will manage his minutes more aggressively than Barcelona can. The comparable tournament is Euro 2020 (played 2021), where the 18-year-old Pedri played every minute Spain could give him and was named the tournament's best young player. Five years on, the player has more tactical responsibility and a clearer role: he is the side's tempo control. Opponents who try to press him out of the game tend to find Pedri already two passes ahead. The signature moment people will reach for is the Euro 2020 run. The deeper number is that he was Spain's most-used midfielder at Euro 2024 before the injury — a quiet acknowledgement that he, not Rodri, is now the player around whom de la Fuente builds.",
    keyMatchups: [
      'Group stage: any side trying a man-marking press',
      'Round of 16: Germany — the Kroos-tackle ghosts of Euro 2024',
      'Bracket end: a high-press France side',
    ],
    signatureStat: {
      label: 'Euro 2024 passing accuracy',
      value: '94.3% — highest of any midfielder in the tournament',
    },
  },
  'bukayo-saka': {
    outlook:
      "Bukayo Saka's 2026 cycle has been the quiet maturation of England's most reliable forward-line player. The Euro 2024 final, where Saka was again the most consistent attacking threat in white, ended in defeat to Spain — and the structural lesson England seem to have taken is that Saka cannot do it alone on the right and needs a midfield runner getting beyond him. Under Thomas Tuchel, that runner is Cole Palmer or Bellingham, and the wide overlap comes from Trent Alexander-Arnold or Reece James. The realistic expectation for 2026 is that Saka faces three different doubling-up strategies in the group stage — a deep right-back, an inverted left-winger, a wing-back trap — and beats most of them. The harder questions arrive in the knockout round, where pressing teams attack the moment England's right-back steps up. Saka's defensive workload has historically been heavier than the front-line average, and Tuchel will need to manage that. The comparable tournament is Euro 2024: a final, a left-footed cut-inside thread of dangerous moments, and the lingering criticism that England's structure asked him to create from too deep. The 2026 set-up promises a higher starting position. The signature moment is, awkwardly, his Euro 2020 final penalty miss — a moment he answered by becoming Arsenal's most consistent attacking player for three straight Premier League seasons. The deeper number is that he has been Arsenal's top assister in each of the last three completed campaigns.",
    keyMatchups: [
      'Group stage: a deep right-back / inverted left-winger combo',
      'Round of 16: a possession-heavy team like the Netherlands',
      'Bracket end: a rematch with Spain — the Euro 2024 final ghost',
    ],
    signatureStat: {
      label: 'Premier League assists 2023-24',
      value: '9 — joint-top among English attackers',
    },
  },
  'florian-wirtz': {
    outlook:
      "Florian Wirtz arrives at his first senior World Cup having anchored Bayer Leverkusen's unbeaten Bundesliga title campaign and Germany's run to the Euro 2024 quarter-final on home soil. Julian Nagelsmann's Germany is structurally built around Wirtz operating as a left-sided 10 in a 4-2-3-1, with Jamal Musiala on the right and Kai Havertz as a floating false 9. The result is a Germany attack that finally looks balanced after a decade of false starts, and Wirtz is the player whose first touch determines whether they break the press or stall. The realistic expectation for 2026 is that Germany are drawn into a group with at least one tactically disciplined opponent (Japan or Mexico are the obvious examples) and a knockout-round path that runs through one of France, Spain, or Brazil. Wirtz's job is to be the player who unsticks the game when the press is high and the channels are crowded — exactly what he did against Spain in the Euro 2024 quarter-final before the heart-breaking late equaliser and overtime loss. The comparable tournament is precisely that Euro 2024: a Germany side good enough to host a final, derailed by injuries (Toni Kroos retired, Antonio Rüdiger limping) and one Dani Olmo equaliser. Two years on, Wirtz is a year wiser, has another Bundesliga campaign of high-tempo football under his belt, and is the only Germany attacking midfielder who consistently beats man-marking. The signature moment is his last-minute tackle and counter against Spain. The deeper number is that he was the Bundesliga's top creator (chances created) in the 2023-24 title season.",
    keyMatchups: [
      'Group stage: a possession-heavy CONCACAF or AFC side',
      'Round of 16: Italy or Belgium',
      'Bracket end: a rematch with Spain',
    ],
    signatureStat: {
      label: 'Bundesliga chances created 2023-24',
      value: '95 — league leader, age 21',
    },
  },
  'phil-foden': {
    outlook:
      "Phil Foden's club position — a left-sided 10 with license to drift inside — has been a problem for every England manager who has tried to incorporate him next to Bellingham. Thomas Tuchel's attempted answer is to use Foden as a true left-winger when England need width, and a left-of-centre 10 when they need to outnumber a midfield. That is closer to how Pep Guardiola used him in Manchester City's 2022-23 treble year than how Gareth Southgate played him at Euro 2024, where Foden was repeatedly accused of disappearing in matches. The realistic expectation for 2026 is that Foden starts every group game and his minutes-played number reflects whether his tactical fit has finally been solved. Against a back-five he is England's most reliable line-breaker. Against a pressing midfield like Spain or Germany he has historically struggled to influence the bigger moments. The comparable tournament is Euro 2024: a quiet group stage, a quieter quarter-final, and a final in which he was the player Spain felt most comfortable letting see the ball. The 2026 version of Foden arrives with another Premier League season under his belt and the expectation — fair or not — that he must be a difference-maker rather than a supporting figure. The signature moment is his curling goal against Brentford in 2024 that pushed City toward another title. The deeper number is that he was the Premier League's Player of the Season in 2023-24 — the first England player to win the award in seven years.",
    keyMatchups: [
      'Group stage: a back-five opponent',
      'Round of 16: a Croatian or Italian midfield press',
      'Bracket end: France or Spain',
    ],
    signatureStat: {
      label: 'Premier League goals 2023-24',
      value: '19 — career high, league\'s Player of the Season',
    },
  },
  'christian-pulisic': {
    outlook:
      "Christian Pulisic is the senior captain of the most expectation-laden U.S. men's squad in history, playing his first World Cup as a co-host. His second AC Milan season has been comfortably his best at club level — over a goal contribution every other game in Serie A — and Mauricio Pochettino has been clear that Pulisic plays as a left-sided 10 cutting onto his right foot, with a forward (Folarin Balogun) and a runner (Tim Weah or Brenden Aaronson) ahead of him. The realistic expectation for 2026 is that Pulisic plays every minute Pochettino is willing to give him, and that his goal output decides whether the U.S. advances past the round of 16. The harder structural question is what happens when the team faces a press that the U.S. midfield cannot escape — historically the moment the team has folded in major tournaments. The comparable tournament is the 2022 World Cup, where Pulisic scored against Iran with the goal that put the U.S. through and then took a hip injury that effectively ended his tournament in the Netherlands match. Four years on he is the unquestioned captain, calmer with the ball, and on home soil. The 2026 expectation is for him to be the best American attacker ever to play in a World Cup. The signature moment is the Iran goal in 2022. The deeper number is that he is now AC Milan's regular starter — the highest-level club placement of any American outfield player ever.",
    keyMatchups: [
      'Group stage: any opponent with a high-pressing midfield',
      'Round of 16: a CONMEBOL or UEFA side with a strong left flank',
      'Quarter-finals: a top-eight European nation',
    ],
    signatureStat: {
      label: 'Serie A goal involvements 2024-25',
      value: '20+ — AC Milan\'s top attacker by output',
    },
  },
  'son-heung-min': {
    outlook:
      "This is almost certainly Son Heung-min's last World Cup — at 33, with another Premier League season demanded of him at Tottenham, the timing is unforgiving. South Korea's structure under Hong Myung-bo continues to channel everything through Son: he plays as a left-sided forward but is given freedom to drift centrally whenever Lee Kang-in moves out wide. That asymmetric setup is what nearly produced an upset of Brazil in the 2022 round of 16 and what built South Korea's surprise Asian Cup semi-final run in 2024. The realistic expectation for 2026 is a group stage in which Son must be the player South Korea hide their tactical limitations behind — and a knockout-round path that almost certainly includes one of the tournament favorites. The single biggest tactical question is whether Son still has the explosive first five yards he had at 28. The honest answer from his 2024-25 Premier League minutes is: mostly yes, but he is now the player who finishes moves rather than starts them. The comparable tournament is 2022 in Qatar, where Son played the tournament wearing a protective mask after orbital surgery and still produced the assist that put South Korea into the knockout stage. The 2026 version is asked for less heroics and more leadership — and the surprise is how comfortably he has slid into the senior captain role. The signature moment is his 2022 mask-assist against Portugal. The deeper number is that he is the all-time Asian goal-scorer in Premier League history.",
    keyMatchups: [
      'Group stage: a tactically disciplined CONCACAF or African side',
      'Round of 16: any side willing to defend a low block',
      'Bracket end: a top-eight European or South American team',
    ],
    signatureStat: {
      label: 'Premier League goals (all-time, Asian players)',
      value: '120+ — by far the most',
    },
  },
  'takefusa-kubo': {
    outlook:
      "Takefusa Kubo arrives at his second World Cup as Japan's most influential attacking player. His Real Sociedad seasons have built the profile of a right-sided forward who comes inside to combine with a midfield runner — close to how Roberto Martínez used Bernardo Silva for Portugal — and Hajime Moriyasu has imported that structure for the national team. Japan's 2022 World Cup heroics (beating Germany and Spain in the group stage, exiting on penalties to Croatia) raised the ceiling for what this generation of Japanese players is expected to do. Kubo is the player around whom every gameplan now revolves. The realistic expectation for 2026 is a group stage in which Japan does not over-commit and Kubo is the player relied on to create the one moment per match that decides it. The single biggest tactical question is whether Japan's midfield can give him service against tournament-favourite opposition — the same question that haunted them against Croatia in 2022. The comparable tournament is precisely that 2022 run: structurally cautious, tactically intelligent, and reliant on transition moments. Three years later, Kubo is older, calmer, and the senior creative figure rather than the rising one. The signature moment is his Real Sociedad goal against Real Madrid in 2024 that announced him as a top-tier La Liga forward. The deeper number is that he was Japan's joint-top scorer in 2022 World Cup qualifying — and is on track to repeat that for 2026.",
    keyMatchups: [
      'Group stage: any opponent willing to leave space behind the left-back',
      'Round of 16: a CONMEBOL side with a strong right flank',
      'Quarter-finals: a top-eight European team',
    ],
    signatureStat: {
      label: 'La Liga goal involvements 2023-24',
      value: '15 — Real Sociedad\'s leading attacker',
    },
  },
  'mohamed-salah': {
    outlook:
      "If Egypt qualifies — and CAF playoff scenarios make that a meaningful 'if' — Mohamed Salah arrives as one of the senior figures of the tournament and a player whose last World Cup, 2018, ended with a shoulder injury sustained in the Champions League final two weeks earlier. The 2026 expectation, should Egypt make it, is that Salah plays as a right-sided forward who cuts inside onto his left foot — the same role he has played at Liverpool for eight years — with a true No. 9 ahead of him and Mostafa Mohamed or Trezeguet running the channels. The single biggest tactical question is how Egypt protects him defensively, because at 33 he no longer covers the ground he did in his Roma days. The comparable tournament is Russia 2018, where Egypt exited in the group stage and Salah scored two of his three career World Cup goals despite playing through a shoulder problem. Seven years on he is one of Africa's all-time greats and a player whose World Cup story remains incomplete. The signature moment is his 2024-25 Premier League season at Liverpool, where he was the league's joint-top scorer and assister at age 32. The deeper number is that he is the highest-scoring African footballer in Premier League history.",
    keyMatchups: [
      'Group stage: any opponent willing to leave space in behind the left-back',
      'Round of 16: a possession-heavy UEFA side',
      'Quarter-finals: any top-eight European team',
    ],
    signatureStat: {
      label: 'Premier League goals (all-time, African players)',
      value: '180+ — the all-time African record',
    },
  },
  'sadio-mane': {
    outlook:
      "Sadio Mané enters 2026 as a senior figure in a Senegal side that has not been able to recapture its 2022 Cup of Nations magic. At Al-Nassr he is now playing alongside Cristiano Ronaldo — a partnership Senegal can borrow the spacing logic of, since both Mané and Ronaldo prefer the inside half-spaces. Aliou Cissé's Senegal structurally builds around two principles: a high-pressing front three (Mané, Sarr, Diakhaby) and a midfield duo (Gueye, Mendy) that wins second balls. The realistic expectation for 2026 is a group stage where Senegal advance comfortably and a knockout-round draw that immediately tests them against a top-eight European or South American side. The single biggest tactical question is whether the 33-year-old Mané still has the running capacity to be the side's primary pressing trigger or whether that role gets handed to a younger forward. The comparable tournament is Qatar 2022, where Mané was forced to withdraw before the tournament with a leg injury and Senegal exited in the round of 16 to England without him. Four years on he is healthy and the senior captain figure. The signature moment is his 2022 Cup of Nations winning penalty — the one that finally gave Senegal a continental title. The deeper number is that he has 40+ international goals, making him the all-time Senegalese scorer.",
    keyMatchups: [
      'Group stage: any opponent willing to leave space behind the right-back',
      'Round of 16: a UEFA side with a possession identity',
      'Quarter-finals: any top-eight South American team',
    ],
    signatureStat: {
      label: 'Senegal international goals',
      value: '40+ — the all-time national record',
    },
  },
  'julian-alvarez': {
    outlook:
      "Julián Álvarez arrives at his second World Cup as a senior figure rather than the squad player who scored against Croatia and the Netherlands in 2022. His Atlético Madrid move ahead of 2024-25 has been validating: he is now a starting forward at one of Europe's top eight clubs and Lionel Scaloni's tactical question is no longer whether to start him alongside Messi, but how to use him when Messi rests. The realistic expectation for 2026 is that Álvarez starts every match Argentina play, plays as either a No. 9 with Messi behind or a No. 10 when Messi sits, and is the player around whom Argentina's pressing structure is built. The single biggest tactical question is whether his finishing in tight matches against tournament-favourite opposition can match what he did in the 2022 semi-final against Croatia. The comparable tournament is precisely that 2022 run, where Álvarez scored four goals in the last three matches and was named Argentina's joint-top scorer of the tournament. Three years on he is more refined, less raw, and the senior figure for the post-Messi generation of Argentine forwards. The signature moment is his solo run against Croatia in the 2022 semi-final — a goal that would not have looked out of place from peak Messi. The deeper number is that he was La Liga's most lethal counter-attacking finisher per 90 minutes in 2024-25.",
    keyMatchups: [
      'Group stage: a back-five opponent',
      'Round of 16: a transition-based side like Belgium',
      'Quarter-finals: France or Brazil',
    ],
    signatureStat: {
      label: 'Argentina goals in the 2022 World Cup',
      value: '4 — joint-team-top with Messi',
    },
  },
  'lautaro-martinez': {
    outlook:
      "Lautaro Martínez is the Inter Milan captain, Argentina's vice-captain, and the player who scored the winning penalty in the 2022 World Cup final. Yet his 2026 role is structurally smaller than his stature suggests: Lionel Scaloni's preferred starting forward in qualifying has been Julián Álvarez, and Lautaro starts when the opposition's defensive line is higher or when Argentina need a more traditional No. 9. The realistic expectation for 2026 is that Lautaro plays 60-70% of available minutes and is the player Argentina trust to finish chances Messi creates. The single biggest tactical question is whether the partnership with Álvarez can be the starting Argentina forward line, or whether the team's structural balance requires only one true centre-forward. The comparable tournament is Qatar 2022, where Lautaro scored only two goals in seven matches but converted the winning penalty in the final. Three years on he has a Champions League final on his resume (the 2023 one against Manchester City, which Inter lost) and the senior leadership presence to be a bench finisher of real value. The signature moment is the winning penalty in the 2022 final. The deeper number is that he has scored a goal every other Serie A match across the last three completed seasons — among the highest sustained finishing rates in any of Europe's top five leagues.",
    keyMatchups: [
      'Group stage: a back-four with a high defensive line',
      'Round of 16: any team willing to leave space in transition',
      'Bracket end: France or Brazil',
    ],
    signatureStat: {
      label: 'Serie A goals 2023-24',
      value: '24 — Capocannoniere (top scorer)',
    },
  },
  'rodrygo': {
    outlook:
      "Rodrygo's 2026 role for Brazil is the trickiest tactical decision Dorival Júnior has to make. At Real Madrid he has spent two seasons as a wide forward who comes inside to combine with Vinícius and Bellingham, but Brazil's structure asks him to play either as a right-inverted winger (where his comfort is lower) or as a true No. 10 (where Brazil's midfield can give him service). The realistic expectation for 2026 is that Rodrygo starts most matches but his goal-output number is lower than Vinícius's — and that the moments he influences are when Vinícius is being doubled. The single biggest tactical question is whether Brazil can build a structure in which both Rodrygo and Vinícius are simultaneously dangerous. That problem haunted them at the 2022 World Cup quarter-final loss to Croatia. The comparable tournament is precisely that 2022 run, where Rodrygo took the famous saved penalty against Croatia and Brazil exited a tournament they were favourites to win. Four years on, he has Champions League final minutes and the senior international experience to be a tournament-level figure rather than a complementary one. The signature moment is, awkwardly, the 2022 saved penalty against Croatia — a moment he has refused to discuss publicly. The deeper number is that he was one of only three players to score in both 2022 and 2024 Champions League finals.",
    keyMatchups: [
      'Group stage: a side that doubles up on Vinícius',
      'Round of 16: a pressing midfield like Croatia or Germany',
      'Bracket end: Argentina',
    ],
    signatureStat: {
      label: 'Champions League final appearances',
      value: '3 — Madrid won all three',
    },
  },
  'antoine-griezmann': {
    outlook:
      "Antoine Griezmann's 2026 tournament is almost certainly his last in a France shirt. Now 34 and back at Atlético Madrid for what will likely be his final club years, Griezmann's national-team role has shifted from a wide forward in 2018 to a left-sided 10 / supporting striker in the post-Karim Benzema era. Didier Deschamps's France is structurally built around the Mbappé-Griezmann combination, with Aurélien Tchouaméni and Eduardo Camavinga doing the destruction and Griezmann tasked with linking everything. The realistic expectation for 2026 is that Griezmann plays every match Deschamps gives him minutes in, that he produces at least one goal involvement per match, and that he is the senior leader figure for the locker room. The single biggest tactical question is whether his pressing intensity, which was France's secret weapon in 2018, has dropped enough that a younger player (Khvicha Kvaratskhelia? Eduardo Camavinga moved forward?) replaces him in the starting XI by the knockout round. The comparable tournament is Qatar 2022, where Griezmann played every minute of every France match en route to the final — a final he lost to Argentina in heart-breaking penalties. The 2026 version is older and less explosive, but no France player has more major-tournament big-moment experience. The signature moment is his Euro 2016 goal against Germany. The deeper number is that he and Mbappé are two of only three players in the world with 40+ international goals for a European nation under the age of 35.",
    keyMatchups: [
      'Group stage: any opponent willing to sit deep against France',
      'Round of 16: a transition-based side like Belgium or Croatia',
      'Bracket end: Argentina or Spain',
    ],
    signatureStat: {
      label: 'France international assists',
      value: '40+ — the all-time French record',
    },
  },
  'ousmane-dembele': {
    outlook:
      "Ousmane Dembélé's PSG move ahead of 2023-24 finally gave him the consistent club minutes Didier Deschamps needed before committing to him as France's first-choice right-winger. The realistic expectation for 2026 is that Dembélé starts every match — as the right-side mirror to Mbappé on the left — and that France's group-stage structure is built around the simple principle of feeding the two of them in space. The single biggest tactical question is which version of Dembélé shows up in a knockout-round match against a top-eight team. The decisive Dembélé of the PSG Champions League run? Or the indecisive Dembélé of the Euro 2024 quarter-final loss to Spain, where he was substituted at 73 minutes? The comparable tournament is precisely that Euro 2024, where Dembélé started all five matches France played and was either France's most dangerous attacker or their most frustrating depending on the half. Two years on, Dembélé has the PSG mileage, the Coupe de France medal, and the senior status to either definitively answer the question or definitively confirm the doubt. The signature moment is his ankle-snapping cut-back in the 2018 World Cup final. The deeper number is that he has the highest take-on success rate of any winger to start more than 50 senior France matches.",
    keyMatchups: [
      'Group stage: a CONCACAF or African right-back',
      'Round of 16: a defensively organised European team',
      'Bracket end: Spain — a Euro 2024 rematch',
    ],
    signatureStat: {
      label: 'Take-on success rate (France career)',
      value: 'Highest of any France winger in modern history',
    },
  },
  'harry-kane': {
    outlook:
      "Harry Kane's 2026 tournament is the one where the conversation about him finally has to change. Now 32, with two Bundesliga seasons at Bayern Munich and a Bundesliga title (2024-25) on his resume, Kane is no longer the player English football is waiting to give a trophy to — he has one. The realistic expectation for 2026 is that Kane plays as a deep-lying No. 9 (the role he prefers and the one Bayern has built around him) with Bellingham, Foden, and Saka working the channels in front of him. Thomas Tuchel's stated preference is for Kane to drop deep, create overloads in midfield, and be the receiving outlet for England's transition play. The single biggest tactical question is whether his finishing in the box can match his playmaking from outside it. The comparable tournament is Euro 2024, where Kane scored three goals across seven matches and was the player most loudly criticised when England's structure looked sluggish. The 2026 version of Kane is calmer, more decorated, and likely the last England captain to lead a major-tournament campaign before the Bellingham generation fully takes over. The signature moment is his Euro 2024 quarter-final equaliser against Switzerland. The deeper number is that he has scored 30+ goals in every Bundesliga campaign he has completed — a finishing rate that puts him alongside Robert Lewandowski and Erling Haaland at the top of European football.",
    keyMatchups: [
      'Group stage: any back-five opponent',
      'Round of 16: a Croatian or Italian low-block side',
      'Bracket end: a rematch with Spain',
    ],
    signatureStat: {
      label: 'England international goals',
      value: '60+ — the all-time English record',
    },
  },
  'declan-rice': {
    outlook:
      "Declan Rice's 2026 tournament is the one where his £105m Arsenal transfer fee finally feels modest. Across two Premier League seasons he has been Arsenal's most consistent midfielder, contributing goals from set-pieces and long-range strikes that nobody projected when he was West Ham's destroyer. Thomas Tuchel's England has imported that newly-expanded version of Rice as the deepest of a midfield three, with Jude Bellingham ahead of him and a partner (Adam Wharton? Conor Gallagher?) screening alongside. The realistic expectation for 2026 is that Rice plays every minute of every match England participate in. The single biggest tactical question is whether England's midfield can resist the high press of a Spain, France, or Germany when Rice is the only true ball-progressor in the deep zone. The comparable tournament is Euro 2024, where Rice was the player Spain still struggled to win second balls against in the final — but England's structure asked too much of him as the lone holding midfielder. The 2026 set-up promises a partner. The signature moment is his Arsenal free-kick against Real Madrid in the 2024-25 Champions League quarter-finals. The deeper number is that he has now scored set-piece goals against Real Madrid, Manchester City, Liverpool, and Chelsea — proof that his expanded scoring profile is real, not a small-sample artifact.",
    keyMatchups: [
      'Group stage: any opponent with a 4-2-3-1 press',
      'Round of 16: a Croatian or Italian midfield',
      'Bracket end: Spain or France',
    ],
    signatureStat: {
      label: 'Premier League ball recoveries 2023-24',
      value: 'League leader, age 25',
    },
  },
  'cole-palmer': {
    outlook:
      "Cole Palmer's rise has been the defining English football story of the past two seasons. His Chelsea move in 2023 transformed him from a peripheral Manchester City rotation option into one of the Premier League's most consistent attackers — and Thomas Tuchel's England has integrated him as a left-of-centre 10 alternative to Phil Foden. The realistic expectation for 2026 is that Palmer is the player England turns to when the game is tight in the second half, that he plays as a starter in matches where England face a back-five, and that his set-piece value (he is one of the best dead-ball strikers in Europe) becomes a structural asset in knockout-round matches. The single biggest tactical question is whether Foden or Palmer starts the bigger games. The comparable tournament is Euro 2024, where Palmer came on as a substitute in the final and scored England's equaliser against Spain before Mikel Oyarzabal's winner. The 2026 version of Palmer arrives with another Premier League season of starter minutes and the unspoken understanding that he is now England's most prolific dead-ball threat. The signature moment is his Euro 2024 final equaliser. The deeper number is that he has hit 20+ goal involvements in each of his two completed Chelsea seasons — at age 22 and 23 respectively, a rate that puts him alongside Bellingham and Saka.",
    keyMatchups: [
      'Group stage: a back-five opponent',
      'Round of 16: a low-block side that gives up set-pieces',
      'Bracket end: a Spain rematch',
    ],
    signatureStat: {
      label: 'Premier League goal involvements 2023-24',
      value: '33 — second only to Foden',
    },
  },
  'edson-alvarez': {
    outlook:
      "Edson Álvarez is the central pillar of Mexico's 2026 World Cup ambitions. After leaving Ajax for West Ham and now starting in the Premier League, he arrives as the most accomplished defensive midfielder Mexico has produced in a generation. As a co-host, Mexico has the privilege and burden of a home tournament — the country has reached the round of 16 in seven consecutive World Cups but has not advanced further since 1986, and Álvarez is the player whose ball-winning is asked to break that streak. The realistic expectation for 2026 is that Álvarez plays every match Mexico participate in, that his second-ball recovery is the single statistical category that decides whether Mexico advances out of a manageable Group A, and that the noise of Estadio Azteca for the opener becomes a tactical advantage rather than a burden. The single biggest tactical question is whether the players ahead of him — Hirving Lozano, Santiago Giménez, Raúl Jiménez — can convert the platform he provides into goals against a top-eight knockout opponent. The comparable tournament is Qatar 2022, where Álvarez was Mexico's best outfield player but the team was eliminated in the group stage — the first such elimination since 1978. Four years on, on home soil, the structural setup is more favourable. The signature moment is his Cup of Nations final 2023 equaliser against Panama. The deeper number is that he is the youngest player ever to captain Mexico in a knockout match.",
    keyMatchups: [
      'Group stage: a defensively organised European side',
      'Round of 16: a CONMEBOL team with a strong forward line',
      'Quarter-finals: any top-eight European team',
    ],
    signatureStat: {
      label: 'Mexico caps before age 27',
      value: '80+ — among the most for any defender in Tricolor history',
    },
  },
  'hirving-lozano': {
    outlook:
      "Hirving Lozano arrives at what will likely be his third World Cup as Mexico's senior wide forward and the player who scored arguably the most famous Mexican goal of the past decade — the 2018 group-stage winner against Germany. His club career has cooled since the Napoli high-water mark (he is now playing in MLS with San Diego), and Mexico's structure has adjusted: Lozano is no longer the team's primary attacker but the senior leader who pulls a defender out of position so Santiago Giménez or Raúl Jiménez can finish. The realistic expectation for 2026 is that Lozano plays as a starter in group matches and becomes a tactical chess piece in knockout-round games. The single biggest tactical question is whether his explosive five-yard burst, which was the difference against Germany in 2018, is still present at 30 against tournament-favourite opposition. The comparable tournament is Russia 2018, where Mexico went 2-0-0 in the group stage including the Germany win, and exited in the round of 16 to Brazil — a tournament where Lozano scored Mexico's only goal against Germany and was named in the team of the group stage. The 2026 version of Lozano is older, more tactical, and playing on home soil. The signature moment is unambiguous: the 2018 Germany goal. The deeper number is that he has nine senior Mexico goals in a World Cup or Cup of Nations match — a Mexican record for any modern wide forward.",
    keyMatchups: [
      'Group stage: any opponent with a tired right-back',
      'Round of 16: a CONMEBOL or UEFA side with full-back fatigue',
      'Quarter-finals: a top-eight team',
    ],
    signatureStat: {
      label: 'Career senior goals for Mexico',
      value: '20+ — top-five all-time Mexican wide forwards',
    },
  },
  'raul-jimenez': {
    outlook:
      "Raúl Jiménez's 2026 World Cup story is a redemption arc. His skull-fracture injury in late 2020 nearly ended his career, and the two years following were a slow return to fitness rather than to elite-level form. The 2023-24 season at Fulham has been the closest Jiménez has come to his pre-injury self: regular Premier League starts, a goal contribution every other match, and the senior-figure status of Mexico's primary centre-forward. The realistic expectation for 2026 is that Jiménez competes with Santiago Giménez for the No. 9 spot, that the partnership Mexico settles on depends on the opponent, and that Jiménez's hold-up play is the structural reason Mexico can play through midfield rather than around it. The single biggest tactical question is whether Jiménez or Giménez starts the bigger knockout-round games. The comparable tournament is Russia 2018, where Jiménez was a substitute in every match and Mexico exited in the round of 16. Eight years on, on home soil, he is the senior No. 9 figure and not the substitute. The signature moment is his comeback Premier League goal in late 2021 — the one that confirmed his career was not over. The deeper number is that he is one of only two Mexican forwards in modern history with 25+ international goals.",
    keyMatchups: [
      'Group stage: a possession-heavy European side',
      'Round of 16: a CONMEBOL low-block team',
      'Quarter-finals: any top-eight team',
    ],
    signatureStat: {
      label: 'Career senior goals for Mexico',
      value: '30+ — top-five all-time Mexican forwards',
    },
  },
  'santiago-gimenez': {
    outlook:
      "Santiago Giménez is the player most likely to be the breakout star of Mexico's 2026 World Cup on home soil. His Feyenoord and now AC Milan minutes have made him an elite-level finisher — he led Eredivisie in goals per 90 in 2023-24 and his Serie A start has been productive — and Mexico's structure has been gradually built to make him the starting No. 9 ahead of Raúl Jiménez. The realistic expectation for 2026 is that Giménez plays every match Mexico participate in, that he is the player who finishes the chances Edson Álvarez and Luis Chávez create, and that his minutes are the single most important data point in Mexico's tournament. The single biggest tactical question is whether he can be the senior figure of Mexico's attack at 25 in a home tournament — the kind of pressure that has weighed heavily on previous Mexican centre-forwards. The comparable tournament is the 2023 Gold Cup, where Giménez was named the tournament's best player after scoring decisive goals in the semi-final and final. Three years later, the stakes are higher and the opposition is more dangerous, but the role is the same: be the player who finishes the moves. The signature moment is his Gold Cup final winning goal against Panama. The deeper number is that he has scored at a one-goal-every-other-match clip in his Eredivisie career — a finishing rate that compares favourably with Erling Haaland at the same age.",
    keyMatchups: [
      'Group stage: any back-line with a high defensive line',
      'Round of 16: a CONMEBOL team',
      'Quarter-finals: a top-eight European team',
    ],
    signatureStat: {
      label: 'Eredivisie goals 2023-24',
      value: '23 in 30 matches — top scorer in the league',
    },
  },
  'tim-weah': {
    outlook:
      "Tim Weah arrives at his second World Cup as the U.S. men's most versatile attacking player and the son of Ballon d'Or winner George Weah. His Juventus move in 2023 and recent club minutes have made him a regular Serie A starter, and Mauricio Pochettino has been clear that Weah's tactical role is right-sided midfielder or right-wing-back depending on the opposition's structure. The realistic expectation for 2026 is that Weah plays every match the U.S. participate in, that his pressing intensity is the single statistic that decides whether the U.S. midfield can survive the better European sides, and that his goal output is a meaningful contribution even from a non-No. 10 position. The single biggest tactical question is whether the U.S. can construct a midfield that allows both Weah's defensive workload and Christian Pulisic's creative freedom in the same match. The comparable tournament is Qatar 2022, where Weah scored against Wales in the opening match and the U.S. advanced through the group stage. Four years on, on home soil, the expectation is for the U.S. to exit at the quarter-finals or later — and Weah is one of three or four players whose tournament-long performance will decide whether that ceiling is realistic. The signature moment is the Wales goal in 2022. The deeper number is that he and his father George are one of only three father-son combinations to each score a senior World Cup goal.",
    keyMatchups: [
      'Group stage: any opponent with a tired left-back',
      'Round of 16: a UEFA side',
      'Quarter-finals: a top-eight European team',
    ],
    signatureStat: {
      label: 'Career Serie A starts',
      value: '60+ — among the most by any American outfield player',
    },
  },
  'weston-mckennie': {
    outlook:
      "Weston McKennie's 2026 World Cup arrives on home soil and represents what is likely his peak window as the U.S. men's senior box-to-box midfielder. His Juventus career has been a study in versatility — he has played as a right-back, a No. 8, a No. 10, and a wing-back depending on the season's manager — and Mauricio Pochettino has settled him as a left-of-centre 8 alongside Tyler Adams. The realistic expectation for 2026 is that McKennie plays every match the U.S. participate in, that his goal contributions from arriving late in the box are the differentiator between the U.S. midfield and the more talented European ones, and that his physical presence is the structural reason the U.S. can compete in second balls against tournament-favourite opposition. The single biggest tactical question is whether McKennie's defensive discipline can match his attacking output — historically the criticism that has shadowed him in big matches. The comparable tournament is Qatar 2022, where McKennie was the U.S.'s second-best outfielder behind Christian Pulisic and the team exited in the round of 16 to the Netherlands. Four years on, the expectation is meaningfully higher. The signature moment is his Concacaf Nations League final winning goal against Mexico in 2024. The deeper number is that he is one of only two Americans to have started 100+ Serie A matches.",
    keyMatchups: [
      'Group stage: a pressing midfield from a top-eight nation',
      'Round of 16: a UEFA side with a strong central midfield',
      'Quarter-finals: a top-eight European or South American team',
    ],
    signatureStat: {
      label: 'Career Serie A starts',
      value: '120+ — most by any American outfielder ever',
    },
  },
  'folarin-balogun': {
    outlook:
      "Folarin Balogun's commitment to the U.S. national team (over England and Nigeria, both of whom courted him) is one of the most significant talent-acquisition moments in U.S. soccer history. His current club, Monaco, has given him regular Ligue 1 minutes and a finishing profile that compares favourably to the U.S.'s previous senior No. 9 options. The realistic expectation for 2026 is that Balogun starts every match the U.S. participate in as a true centre-forward, that his goal output is the single statistic that decides whether the U.S. can match their 2022 group-stage performance, and that his hold-up play is the structural reason the U.S. midfield can play through opposition rather than around them. The single biggest tactical question is whether Balogun, who has not yet played in a senior World Cup, can handle the pressure of a home tournament's expectations. The comparable tournament is Concacaf Gold Cup 2023, where Balogun missed but the U.S. structure suffered from a clear lack of senior No. 9 quality. Three years on, the U.S. has its first true Premier-League/Ligue-1 level centre-forward and is hosting the tournament. The signature moment is his Ligue 1 2022-23 season at Reims, where he scored 21 goals — among the most by any American striker in any European top-five league season ever. The deeper number is that he is the highest U.S. transfer fee for a forward in MLS-or-otherwise history.",
    keyMatchups: [
      'Group stage: any opponent with a high defensive line',
      'Round of 16: a UEFA side',
      'Quarter-finals: a top-eight team',
    ],
    signatureStat: {
      label: 'Ligue 1 goals 2022-23',
      value: '21 — most by any American striker in a top-five-league season',
    },
  },
  'antonee-robinson': {
    outlook:
      "Antonee Robinson is one of the Premier League's most consistent left-backs, a Fulham defensive cornerstone, and the U.S. men's first-choice attacking outlet on the left flank. The realistic expectation for 2026 is that Robinson plays every match the U.S. participate in, that his ability to support Christian Pulisic in the build-up is the structural reason the U.S. can attack possession-heavy opponents, and that his crossing accuracy is the single technical asset that gives Folarin Balogun service from open play. The single biggest tactical question is whether Robinson's defensive discipline holds up against the better European wingers — the U.S. has historically conceded the most chances down the right channel of opposing teams, and Robinson is responsible for shutting that down. The comparable tournament is Qatar 2022, where Robinson started every U.S. match and was the team's most consistent outfielder behind Pulisic. Four years on, with another Premier League season of starter minutes, he is more refined and the senior figure of the U.S. backline. The signature moment is his goal-line clearance against Iran in the 2022 group stage — a moment that almost certainly saved the U.S.'s tournament. The deeper number is that he was the Premier League's fastest player in 2023-24 over a 30-metre sprint — a category that includes Erling Haaland, Mohamed Salah, and Bukayo Saka.",
    keyMatchups: [
      'Group stage: any opponent with a strong right-winger',
      'Round of 16: a UEFA side with a dangerous wide attacker',
      'Quarter-finals: a top-eight team',
    ],
    signatureStat: {
      label: 'Premier League sprint speed 2023-24',
      value: '36.6 km/h — fastest recorded in the league',
    },
  },
  'yunus-musah': {
    outlook:
      "Yunus Musah is the most technically gifted American midfielder of his generation. His AC Milan move in 2023 was supposed to be his breakthrough — and while the minutes have been more limited than he or U.S. fans hoped, his quality on the ball remains a tactical asset few American midfielders have ever possessed. The realistic expectation for 2026 is that Musah is the U.S. men's primary ball-progressor through midfield, that he plays in some combination with Tyler Adams and Weston McKennie depending on the match's structural needs, and that his press-resistance is the single skill the U.S. has been waiting for in their senior midfield for two generations. The single biggest tactical question is whether Mauricio Pochettino can construct a midfield three that makes Musah the senior creator. The comparable tournament is Qatar 2022, where Musah was 19 years old and started every U.S. match — but where the team's overall structural quality was below the level his individual moments suggested. Four years on, Musah is older, more tactical, and the senior midfield-creator figure. The signature moment is his run-and-shot against the Netherlands in the 2022 round of 16, a moment that almost reset the match score line. The deeper number is that he is the only American midfielder to start in an AC Milan, Real Madrid academy, or Bayern Munich first-team match — the elite-club minutes that suggest his ceiling is meaningfully higher than the rest of the U.S. midfield.",
    keyMatchups: [
      'Group stage: any opponent with an aggressive press',
      'Round of 16: a UEFA midfield-heavy team',
      'Quarter-finals: a top-eight European team',
    ],
    signatureStat: {
      label: 'Take-on success rate (U.S. career)',
      value: 'Highest of any American midfielder in senior team history',
    },
  },
  'alphonso-davies': {
    outlook:
      "Alphonso Davies arrives at his second World Cup as Canada's most famous footballer and the player whose Bayern Munich club career has set a ceiling no Canadian player has ever come close to. As a co-host, Canada has the home-tournament platform that Davies's career has been pointing toward. The realistic expectation for 2026 is that Davies plays as Canada's left-back or left-wing-back, that his speed (he has been clocked at over 36 km/h) is the single tactical asset that makes Canada dangerous in transition, and that his crossing accuracy provides Jonathan David with service that no other Canadian attacker can match. The single biggest tactical question is whether Davies's defensive discipline can hold up against a tournament-favourite right-winger. The comparable tournament is Qatar 2022, where Canada exited in the group stage without a point but Davies scored Canada's first-ever men's World Cup goal — a moment that announced him as a senior tournament-level figure. Four years on, on home soil, the expectation is for Canada to reach at least the round of 16. The signature moment is the 2022 group-stage goal against Croatia. The deeper number is that Davies was the youngest player ever to win a Bundesliga title — at 19 years 158 days for Bayern Munich.",
    keyMatchups: [
      'Group stage: a UEFA or CONMEBOL side with a strong right-winger',
      'Round of 16: any opponent with a fast counter-attack',
      'Quarter-finals: a top-eight team',
    ],
    signatureStat: {
      label: 'Sprint speed (Bundesliga record)',
      value: '36.5 km/h — one of the fastest ever recorded',
    },
  },
  'jonathan-david': {
    outlook:
      "Jonathan David's 2026 World Cup arrives at the peak window of his career. His Lille years have made him one of Ligue 1's most consistent finishers — a goal contribution every other match across multiple seasons — and his expected move to a top-five league before the tournament should give him the highest-pressure club minutes a Canadian forward has ever played. The realistic expectation for 2026 is that David plays every match Canada participate in, that his goal output is the single statistic that decides whether Canada can match Alphonso Davies's home-tournament ambitions, and that his hold-up play is the structural reason Canada can play through opposition rather than around them. The single biggest tactical question is whether David, who has never started a World Cup knockout match, can handle the pressure of a home tournament. The comparable tournament is Qatar 2022, where David started every Canada match but Canada exited in the group stage without a goal of his own. Four years on, on home soil, the expectation is for Canada to reach at least the round of 16 — and David's goal-or-goals are the single statistical category that makes that realistic. The signature moment is his Concacaf Nations League final winning goal against Mexico in 2023. The deeper number is that he has scored 25+ goals in two separate Ligue 1 seasons — a feat shared with very few non-French forwards in modern French football.",
    keyMatchups: [
      'Group stage: any back-five opponent',
      'Round of 16: a UEFA side with a high defensive line',
      'Quarter-finals: a top-eight team',
    ],
    signatureStat: {
      label: 'Career Ligue 1 goals',
      value: '90+ — most by any Canadian forward in a European top-five league',
    },
  },
  'tajon-buchanan': {
    outlook:
      "Tajon Buchanan's Inter Milan move in early 2024 was the most significant Canadian transfer story of the year — and his subsequent leg-break setback in the summer of 2024 has cast a shadow over his 2026 tournament expectations. If healthy, Buchanan is Canada's first-choice right-winger and the senior wide-attacking complement to Alphonso Davies on the left. The realistic expectation for 2026 is that Buchanan plays as Canada's starting right-winger when fit, that his ability to combine with Jonathan David in central positions is the structural reason Canada's attack functions, and that his crossing and cutting-inside finishing provide a second goal-scoring threat alongside David. The single biggest tactical question is whether Buchanan's fitness can match his role's physical demands across a seven-match tournament — Inter Milan have been deliberately cautious in his return-to-fitness minutes, and the senior Canada coaching staff have been clear that his readiness is a tournament-level question, not a matchday-level one. The comparable tournament is Qatar 2022, where Buchanan started every Canada match but was the team's least-experienced senior wide player at the time. Four years on, his Serie A minutes (when healthy) have meaningfully changed his tactical ceiling, and his senior leadership status is meaningfully higher within the Canadian setup. The signature moment is his 2022 group-stage performance against Croatia, where he was Canada's most consistent attacker despite the match's outcome. The deeper number is that he is one of only two Canadians ever to start a Champions League knockout-round match in his career to date.",
    keyMatchups: [
      'Group stage: any side with a vulnerable left-back',
      'Round of 16: a UEFA team',
      'Quarter-finals: a top-eight team',
    ],
    signatureStat: {
      label: 'Career Serie A starts (when healthy)',
      value: '30+ — most by any Canadian wide forward ever',
    },
  },
  'federico-valverde': {
    outlook:
      "Federico Valverde is Real Madrid's most versatile midfielder and Uruguay's most influential player. His club career has produced a profile no comparable Uruguayan has ever possessed: he can play as a No. 8, as a right-back, as a right-winger, and as a deep-lying playmaker depending on the match. Marcelo Bielsa's Uruguay structurally builds around two principles: a high-tempo pressing identity and Valverde's ability to be three players at once. The realistic expectation for 2026 is that Valverde plays as a right-of-centre 8 in a midfield three with Manuel Ugarte (or a replacement) behind him, that his goal output from late-arriving runs is the single statistical category that decides whether Uruguay advance to the knockout round, and that his pressing intensity is the structural reason Uruguay can match France's or England's midfield. The single biggest tactical question is whether Bielsa can build a midfield three that makes Valverde the senior creator without losing defensive solidity. The comparable tournament is Qatar 2022, where Valverde was Uruguay's youngest senior player but had a quieter individual tournament. Four years on, he is the senior figure of an Uruguay side that has been rebuilt around him. The signature moment is his 2022 Champions League final cameo against Liverpool — a goal-saving tackle that demonstrated his defensive ceiling. The deeper number is that he is the highest-scoring midfielder in Real Madrid's Champions League history for any player under 26.",
    keyMatchups: [
      'Group stage: any pressing midfield from a top-eight nation',
      'Round of 16: a UEFA team with a strong central midfield',
      'Quarter-finals: France or Spain',
    ],
    signatureStat: {
      label: 'Real Madrid Champions League goals',
      value: '10+ — most by any Uruguayan midfielder in tournament history',
    },
  },
  'darwin-nunez': {
    outlook:
      "Darwin Núñez's 2026 World Cup arrives at a pivotal moment in his Liverpool career — a season in which his goal-per-90 rate has finally matched what the £85m transfer fee implied. The Uruguay setup under Marcelo Bielsa builds around two principles: a high-tempo pressing identity and Núñez's running threat behind the opposition back-line. The realistic expectation for 2026 is that Núñez plays as Uruguay's starting No. 9, that his off-the-ball running creates the space Federico Valverde and Maximiliano Araújo need to operate, and that his goal output is the single statistical category that decides whether Uruguay match their 2010 semi-final ceiling. The single biggest tactical question is whether Núñez's notoriously inconsistent finishing — the criticism that has shadowed his Liverpool career — can be solved on a tournament-length scale. The comparable tournament is Qatar 2022, where Uruguay drew with South Korea, lost to Portugal, and beat Ghana 2-0 but exited in the group stage on goal difference. Four years on, the side is structurally better. The signature moment is his Liverpool brace against Brentford in 2024 — the match that announced his finishing had turned. The deeper number is that he has scored 25+ goals in 2024-25 across all competitions — his most-productive club season ever.",
    keyMatchups: [
      'Group stage: any back-five opponent',
      'Round of 16: a UEFA side with a high defensive line',
      'Quarter-finals: a top-eight team',
    ],
    signatureStat: {
      label: 'Premier League goals 2024-25',
      value: '15+ — career-best season',
    },
  },
  'mads-hermansen': {
    outlook:
      "Mads Hermansen's 2026 tournament is the first major one in which he is Denmark's first-choice goalkeeper. His Leicester City move ahead of 2023-24 was the breakthrough — he became one of the Championship's top goalkeepers in their title-winning campaign and his Premier League minutes have shown a goalkeeper whose distribution profile is closer to a sweeper-keeper than a traditional shot-stopper. Kasper Hjulmand's Denmark structurally builds around possession-heavy football, and Hermansen's ability to be Denmark's deepest builder is the structural reason Christian Eriksen's creative midfield can be played higher. The realistic expectation for 2026 is that Hermansen plays every match Denmark participate in, that his clean-sheet rate is one of the highest among first-choice goalkeepers in the tournament, and that his ability to absorb a press is the single technical asset that decides whether Denmark advances out of Group A. The single biggest tactical question is whether his shot-stopping at a tournament against the best forwards in the world can match what he has shown in the Championship and his first Premier League minutes. The comparable tournament is Euro 2024, where Denmark went out in the round of 16 to host Germany — a match in which Hermansen made several crucial saves. The signature moment is his Championship season Goalkeeper of the Year award. The deeper number is that he is the youngest senior Denmark No. 1 since Kasper Schmeichel a decade ago.",
    keyMatchups: [
      'Group stage: a high-pressing CONCACAF or AFC side',
      'Round of 16: a transition-based team like Belgium',
      'Quarter-finals: a top-eight team',
    ],
    signatureStat: {
      label: 'Championship clean sheets 2023-24',
      value: '18 — most in the league\'s title-winning campaign',
    },
  },
  'erling-haaland': {
    outlook:
      "Norway's qualification status for 2026 is uncertain, but Erling Haaland's case is the most-discussed one in modern men's football: how does a generational finisher in the prime years of his career miss every major international tournament of his career? If Norway qualifies, Haaland is the player around whom every gameplan in the tournament is written. His Manchester City club career has produced finishing numbers no comparable peer has matched — 36 Premier League goals in 2022-23 as a 22-year-old, a Champions League title in his first English season, and a Bundesliga history that already includes 50+ league goals for Dortmund. Ståle Solbakken's Norway, if they qualify, would build around the principle that Haaland is the most-feared finisher in the tournament and that the rest of the team's job is to win second balls and put crosses into the box. The realistic expectation for 2026, contingent on qualification, is for Norway to play as a high-press defensive unit and rely on Haaland to convert one or two chances per match. The single biggest tactical question is whether his off-the-ball positioning in tight matches against tournament-favourite opposition is enough to compensate for the team's structural weaknesses. The comparable tournament is Euro 2024 qualification, in which Norway missed out and Haaland's individual frustration was visible. The signature moment is his Champions League final winning play in 2023. The deeper number is that he has the highest goal-per-90 rate of any player in Premier League history with 50+ appearances.",
    keyMatchups: [
      'Group stage: any back-five opponent',
      'Round of 16: a UEFA team with a high defensive line',
      'Quarter-finals: any top-eight team',
    ],
    signatureStat: {
      label: 'Premier League goals 2022-23 (debut season)',
      value: '36 — single-season league record',
    },
  },
  'khvicha-kvaratskhelia': {
    outlook:
      "Georgia's qualification for 2026 is a complicated story — they reached Euro 2024 for the first time in their history and beat Portugal in the group stage, but the World Cup qualification path is structurally harder. If Georgia qualifies, Khvicha Kvaratskhelia is the player around whom every gameplan is written. His Napoli minutes won the 2022-23 Serie A title, and his explosive five-yard burst is the kind of tactical asset that has historically been the difference in major-tournament breakthrough runs. Willy Sagnol's Georgia, if they qualify, would build around the principle that Kvaratskhelia operates as a left-sided forward who cuts inside onto his right foot, and that the rest of the team's job is to win second balls and recycle possession. The realistic expectation for 2026, contingent on qualification, is for Georgia to play as a defensively organised counter-attacking unit and rely on Kvaratskhelia to convert one or two key moments per match. The single biggest tactical question is whether his individual quality can sustain across a tournament length against the world's best defenders. The comparable tournament is Euro 2024, where Georgia reached the round of 16 and Kvaratskhelia was named in the tournament's team of the group stage. The signature moment is his Euro 2024 group-stage performance against Portugal — a match in which he produced two assists and was the player Portugal's defenders most struggled to contain. The deeper number is that he has Champions League-level finishing in a Serie A title-winning team.",
    keyMatchups: [
      'Group stage: any opponent with a tired right-back',
      'Round of 16: a UEFA team with a slow left-back',
      'Quarter-finals: any top-eight team',
    ],
    signatureStat: {
      label: 'Serie A goal involvements 2022-23 title season',
      value: '25 — Napoli\'s top-attacking statistical contribution',
    },
  },
  'bruno-fernandes': {
    outlook:
      "Bruno Fernandes is Manchester United's captain and Portugal's most important creative midfielder. Roberto Martínez's Portugal structurally builds around two principles: a high-pressing defensive identity and Fernandes's ability to be the team's deepest creator. The realistic expectation for 2026 is that Fernandes plays as a right-of-centre 8 in a midfield three, that his set-piece delivery is the single statistical category that gives Portugal a chance against tournament-favourite opposition, and that his pressing intensity is the structural reason Portugal can match France's or Spain's tempo. The single biggest tactical question is whether his finishing in tight matches — historically a strength but inconsistent in major tournaments — can match what he has shown for Manchester United. The comparable tournament is Euro 2024, where Portugal exited in the quarter-finals to France on penalties and Fernandes was the team's most creative outfielder. The 2026 version of Fernandes arrives with another Manchester United season under his belt and the senior captain role of the post-Ronaldo Portugal era. The signature moment is his Euro 2024 quarter-final assist that nearly produced the late equaliser. The deeper number is that he has the highest assist-per-90 rate of any Manchester United midfielder in the Premier League era — including Paul Scholes, Bruno Mateus, and Cristiano Ronaldo.",
    keyMatchups: [
      'Group stage: any opponent with a low defensive line',
      'Round of 16: a UEFA team with a possession identity',
      'Quarter-finals: France or Spain',
    ],
    signatureStat: {
      label: 'Premier League assists 2023-24',
      value: '10+ — Manchester United\'s top creator',
    },
  },
  'rafael-leao': {
    outlook:
      "Rafael Leão is AC Milan's senior wide forward and Portugal's most physically gifted attacker. His Serie A career has been a study in inconsistency — moments of world-class brilliance interspersed with months of quiet — and Portugal's structural challenge is to extract the bright version of Leão while accepting the dimmer one. Roberto Martínez has used Leão as a left-sided forward who cuts inside onto his right foot, with a fullback (often João Cancelo) overlapping, and a No. 9 ahead of him. The realistic expectation for 2026 is that Leão plays every match Portugal participate in, that his goal output is the single statistical category that decides whether Portugal can match their Euro 2016 ceiling, and that his pace is the structural reason Portugal can attack into space against possession-heavy opposition. The single biggest tactical question is whether his consistency can match what Bruno Fernandes and Bernardo Silva provide in midfield. The comparable tournament is Euro 2024, where Leão started most matches and was Portugal's most physically threatening attacker but only contributed two goal involvements across the run to the quarter-finals. Two years on, his Milan minutes (and a return to AC Milan starter status) give him the platform to be the senior Portugal forward. The signature moment is his Serie A title-winning 2021-22 season — Milan's first in over a decade. The deeper number is that he has the highest top-speed of any player to start a senior Portugal match in modern history.",
    keyMatchups: [
      'Group stage: a UEFA or AFC side with a tired right-back',
      'Round of 16: any opponent willing to leave space in transition',
      'Quarter-finals: France or Spain',
    ],
    signatureStat: {
      label: 'Top recorded sprint speed (Serie A)',
      value: '35.9 km/h — one of the fastest in Italian football',
    },
  },
  'joshua-kimmich': {
    outlook:
      "Joshua Kimmich is Bayern Munich's captain and Germany's senior midfielder, the player around whom Nagelsmann's structural choices have been built since 2023. Julian Nagelsmann's Germany structurally builds around two principles: a high-tempo pressing identity and Kimmich's ability to be the team's deepest builder of progressive possession. The realistic expectation for 2026 is that Kimmich plays as a deep-lying playmaker in a midfield two with İlkay Gündoğan or a younger replacement, that his passing accuracy is one of the highest of any midfielder in the tournament, and that his pressing intensity is the structural reason Germany can match France's or Spain's tempo across a 90-minute match. The single biggest tactical question is whether his defensive discipline can hold up against the better European forwards — the Euro 2024 quarter-final loss to Spain exposed moments where his positioning was a step late. The comparable tournament is precisely that Euro 2024, where Germany hosted the tournament and exited in the quarter-finals on home soil to Spain after Mikel Merino's late header — a match in which Kimmich was the team's most-played outfielder and the player most criticised for the late conceded goal. Two years on, Kimmich is the senior captain of an experienced Germany side that has rebuilt around the principle that pressing requires positional discipline. The signature moment is his Bayern Munich Bundesliga title in 2022-23 — Bayern's 11th in a row. The deeper number is that he has more than 90 senior Germany caps and is among the most-experienced midfielders in the tournament, with a passing-accuracy rate consistently among the top three in any Bundesliga season he has played.",
    keyMatchups: [
      'Group stage: any pressing midfield',
      'Round of 16: a UEFA side with a strong central midfield',
      'Quarter-finals: Spain or France',
    ],
    signatureStat: {
      label: 'Germany caps',
      value: '90+ — among the most for any active midfielder',
    },
  },
  'jamal-musiala': {
    outlook:
      "Jamal Musiala's 2026 tournament is the first major one in which he arrives as Germany's senior right-sided attacker. His Bayern Munich club career has produced a profile no comparable Germany peer has ever possessed: a press-resistant ball-progressor who can play as a right-winger, a No. 10, or a left-of-centre 8 depending on the structure. Julian Nagelsmann's Germany builds around two principles: a high-tempo pressing identity and Musiala's ability to be the team's most-feared dribbler. The realistic expectation for 2026 is that Musiala plays as a right-of-centre 10 alongside Florian Wirtz, that his take-on success rate is one of the highest in the tournament, and that his finishing in tight matches is the structural reason Germany can advance to the bracket end. The single biggest tactical question is whether his defensive workload can match the demands of a tournament against the world's best pressing midfields. The comparable tournament is Euro 2024, where Germany hosted the tournament and exited in the quarter-finals — but where Musiala was named in the tournament's team of the round of 16 and was Germany's most consistent attacker. Two years on, his minutes and senior leadership are meaningfully higher. The signature moment is his Euro 2024 round-of-16 goal against Denmark. The deeper number is that he has produced 20+ goal involvements in each of his last three Bundesliga seasons — among the highest sustained rates for any German attacker under 22.",
    keyMatchups: [
      'Group stage: any opponent with a tired left-back',
      'Round of 16: a UEFA team with a slow midfield',
      'Quarter-finals: France or Spain',
    ],
    signatureStat: {
      label: 'Bundesliga goal involvements 2023-24',
      value: '25+ — Bayern Munich\'s top attacking output',
    },
  },
  'tyler-adams': {
    outlook:
      "Tyler Adams is the U.S. men's first-choice defensive midfielder and the senior figure of the team's midfield. His Premier League minutes (at Leeds, then Bournemouth) have been interrupted by injuries, and the 2026 question is whether his fitness can match the demands of a home tournament. The realistic expectation, contingent on health, is for Adams to play every match the U.S. participate in, for his second-ball recovery rate to be the single statistical category that decides whether the U.S. midfield can survive top-eight European opposition, and for his pressing intensity to be the structural reason the U.S. can compete with France or Brazil. The single biggest tactical question is whether his fitness can hold up across a tournament length, given his injury history. The comparable tournament is Qatar 2022, where Adams was named the senior captain of the U.S. men's team at age 23 and was the squad's most consistent outfielder. Four years on, his minutes have been less consistent but his senior figure status is unchanged. The signature moment is his 2022 press-conference response on Iran's flag protocol — a moment that became larger than the tournament itself. The deeper number is that he was the youngest player ever to captain the U.S. men's team in a senior World Cup.",
    keyMatchups: [
      'Group stage: any pressing midfield from a top-eight nation',
      'Round of 16: a UEFA side with a strong central midfield',
      'Quarter-finals: a top-eight European or South American team',
    ],
    signatureStat: {
      label: 'Age at U.S. captaincy in 2022 World Cup',
      value: '23 — youngest ever',
    },
  },
  'giovanni-reyna': {
    outlook:
      "Giovanni Reyna's 2026 World Cup is the one where the conversation about him finally has to change. The Borussia Dortmund-developed creator has been the most-discussed talent of the U.S. men's setup for five years — but his contributions in 2022 were limited to substitute appearances after a series of fitness questions, and his club career has been a study in injury setbacks. The realistic expectation for 2026, contingent on health and form, is for Reyna to be one of three or four U.S. attackers competing for two starting spots alongside Christian Pulisic, and for his creative quality (when on the ball) to be the differentiator between the U.S. attack and the more-pragmatic peers. The single biggest tactical question is whether Mauricio Pochettino trusts him in the starting XI for a knockout-round match. The comparable tournament is Qatar 2022, where Reyna was 19 and started only the round-of-16 loss to the Netherlands. Four years on, on home soil, his role and minutes are higher-stakes. The signature moment is his Bundesliga goal against Sevilla in the 2021-22 Champions League. The deeper number is that he is the highest-rated U.S. youth product to ever be developed inside the Bayern Munich, Real Madrid, or Borussia Dortmund senior academy systems.",
    keyMatchups: [
      'Group stage: any opponent with a vulnerable left-back',
      'Round of 16: a UEFA team',
      'Quarter-finals: a top-eight team',
    ],
    signatureStat: {
      label: 'Career senior goal involvements before age 22',
      value: '50+ — among the most for any American attacker in European clubs',
    },
  },
  'brenden-aaronson': {
    outlook:
      "Brenden Aaronson is the most-experienced wide-attacker option in the U.S. men's setup. His Leeds United minutes (and subsequent return to Bundesliga loan moves) have been mixed, but his Concacaf Gold Cup and Nations League contributions have made him a senior figure within the team. The realistic expectation for 2026 is that Aaronson competes with Gio Reyna for a starting wide-attacking spot, that his pressing intensity is the single tactical asset Pochettino values most, and that his cameos in the second half of group-stage matches are the structural reason the U.S. can manage minutes for Christian Pulisic. The single biggest tactical question is whether Aaronson can be a senior tournament-level attacker on home soil — historically the player he has been compared to (and the one Pochettino has been clearest he wants on the pitch) is a 60-minute presser, not a 90-minute creator. The comparable tournament is Qatar 2022, where Aaronson was 22 and played in every U.S. match including the round-of-16 loss. Four years on, his role and minutes are unchanged in shape but more meaningful in stakes. The signature moment is his Concacaf Gold Cup performances. The deeper number is that he was one of the U.S.'s top three pressing-statistics players in 2022 — the metric Pochettino's identity is built around.",
    keyMatchups: [
      'Group stage: any opponent with a tired right-back',
      'Round of 16: a UEFA team',
      'Quarter-finals: a top-eight team',
    ],
    signatureStat: {
      label: 'U.S. press-actions per 90 (2022)',
      value: 'Team-leading among attackers',
    },
  },
  'nico-williams': {
    outlook:
      "Nico Williams's 2026 tournament arrives at the most-discussed transfer window of his career. The Athletic Bilbao winger reached Euro 2024 as a tournament breakthrough — scoring Spain's opening goal in the final against England — and his decision to stay at Athletic ahead of Euro 2024 made him the senior wide attacker of Spain's left flank rather than a candidate competing for minutes. Luis de la Fuente's Spain structurally builds around the principle that Williams operates as a true left-winger who cuts inside onto his right foot, with Lamine Yamal mirrored on the right and Pedri or Fabián Ruiz feeding both. The realistic expectation for 2026 is that Williams plays every match Spain participate in, that his goal output is one of the highest in the tournament for any wide attacker, and that his pace is the structural reason Spain can attack possession-heavy opponents in transition. The single biggest tactical question is whether his finishing in tight matches against tournament-favourite opposition can match what he produced at Euro 2024. The comparable tournament is precisely that Euro 2024 run, where Williams was named in the tournament's team of the tournament and Spain won the trophy without dropping a point. Two years on, his Athletic minutes (which include a Copa del Rey final win in 2024) give him the senior figure status to be the senior wide attacker for the duration. The signature moment is the Euro 2024 final opening goal. The deeper number is that he was the only Spain forward to score in the knockout rounds of Euro 2024 — a tournament Spain won without conceding a single goal from open play in the final.",
    keyMatchups: [
      'Group stage: any CONCACAF or AFC side with a vulnerable right-back',
      'Round of 16: a UEFA side with a slow defensive line',
      'Bracket end: a rematch with France or England',
    ],
    signatureStat: {
      label: 'Euro 2024 final opening goal',
      value: 'Spain\'s first goal in the trophy-winning final',
    },
  },
  'bruno-guimaraes': {
    outlook:
      "Bruno Guimarães is Brazil's senior central midfielder and Newcastle United's most influential outfielder. Dorival Júnior's Brazil structurally builds around the principle that Bruno operates as a left-of-centre 8 in a midfield three, with a deeper destroyer (often André Trindade) behind him and Lucas Paquetá ahead. The realistic expectation for 2026 is that Bruno plays every match Brazil participate in, that his press-resistance is the single statistical category that decides whether Brazil can play through tournament-favourite opposition rather than around them, and that his pressing intensity is the structural reason Brazil's high block can function. The single biggest tactical question is whether his finishing in tight matches — historically a strength but inconsistent in major tournaments — can match what he has shown for Newcastle. The comparable tournament is Qatar 2022, where Brazil exited in the quarter-finals to Croatia on penalties and Bruno was the team's most-used midfielder. Four years on, his Premier League minutes have meaningfully changed his tactical ceiling and his senior figure status within the Brazilian setup. The signature moment is his Carabao Cup final winning play in 2024 — Newcastle's first major trophy in 70 years. The deeper number is that he is one of only two Brazilians to be a top-three Newcastle United outfielder by minutes for two consecutive Premier League seasons.",
    keyMatchups: [
      'Group stage: any pressing midfield from a top-eight nation',
      'Round of 16: a UEFA team with a strong central midfield',
      'Bracket end: Argentina or France',
    ],
    signatureStat: {
      label: 'Premier League starts 2023-24',
      value: '36 of 38 — Newcastle\'s most-used outfielder',
    },
  },
  'gianluigi-donnarumma': {
    outlook:
      "Gianluigi Donnarumma's 2026 tournament is the first major one in which he arrives as Italy's senior goalkeeper for a World Cup — Italy missed the 2018 and 2022 editions, and Donnarumma's club career has been built between two of Europe's most demanding goalkeeping environments (AC Milan, then Paris Saint-Germain). Luciano Spalletti's Italy structurally builds around two principles: a defensively-organised back four and Donnarumma's ability to be the deepest builder of possession. The realistic expectation for 2026 is that Donnarumma plays every match Italy participate in, that his shot-stopping rate is among the highest of any first-choice goalkeeper in the tournament, and that his distribution accuracy is the structural reason Italy's central midfield can press higher than their FIFA ranking would otherwise allow. The single biggest tactical question is whether his command of the area — historically an area of intermittent vulnerability — can hold up across a tournament against the world's best aerial forwards. The comparable tournament is Euro 2020 (played 2021), where Donnarumma was named the tournament's best player after saving the decisive penalty in the final against England at Wembley. Five years on, on different soil, he arrives as Italy's senior captain and the most-decorated active Italian footballer of his generation. The signature moment is the 2020 final penalty save. The deeper number is that he has the highest save percentage of any goalkeeper to start 100+ matches in Ligue 1 in the modern era.",
    keyMatchups: [
      'Group stage: any CONCACAF or AFC side with a strong aerial forward',
      'Round of 16: a UEFA team with set-piece quality',
      'Quarter-finals: a top-eight European or South American team',
    ],
    signatureStat: {
      label: 'Euro 2020 final winning penalty saves',
      value: '2 saves — most by any goalkeeper in a Euro final',
    },
  },
}

/** Lookup by player slug. Returns undefined when the player has no hand-tuned outlook. */
export function getPlayerOutlook(slug: string): PlayerOutlook | undefined {
  return PLAYER_OUTLOOKS[slug]
}

/** Total number of hand-written outlooks (for tests). */
export function getPlayerOutlookCount(): number {
  return Object.keys(PLAYER_OUTLOOKS).length
}
