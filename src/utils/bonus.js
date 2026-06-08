/**
 * CALCUL DES PRIMES — RÉTROACTIF + COMBINÉ (forfaits + pronostics)
 */
export const DEFAULT_SETTINGS = {
  tier1Rate: 10,
  tier2Rate: 12,
  tier3Rate: 15,
  topScorerRate: 20,
  tier1Threshold: 40,
  tier2Threshold: 50,
  phaseEnded: false,
  minForTier3: 3,
}

export const PRONO_BONUS = 20
// Un ballon dont le pronostic a été validé par le Manager vaut 20€ (au lieu du taux palier)
export const VALIDATED_BALL_VALUE = 20

// Taux par ballon "normal" d'un joueur (palier courant, ou top buteur)
function ballRateFor(player, players, totalGoals, s) {
  // Seuil de déclenchement du bonus top buteur = objectif de la partie (défaut: tier2Threshold)
  const objective = s.objective ?? s.tier2Threshold
  // TOP BUTEUR : dès que le total collectif dépasse l'objectif (ex. >50 partie 1, >100 partie 2)
  // OU si forcé, le meilleur buteur UNIQUE a TOUS ses ballons à 20€ (rétroactif).
  if (s.phaseEnded || totalGoals > objective) {
    const maxG = Math.max(...players.map(p => p.goals || 0), 0)
    const tops = players.filter(p => (p.goals || 0) === maxG && maxG > 0)
    if (tops.length === 1 && (player.goals || 0) === maxG) return s.topScorerRate
  }
  if (totalGoals > s.tier2Threshold)       return (player.goals >= (s.minForTier3 || 3)) ? s.tier3Rate : s.tier2Rate
  if (totalGoals > s.tier1Threshold)       return s.tier2Rate
  return s.tier1Rate
}

/** Gains forfaits PURS d'un joueur (sans bonus pronostic) — RÉTROACTIF au taux actuel */
export function getPlayerEarnings(player, players, totalGoals, settings = DEFAULT_SETTINGS) {
  const s = { ...DEFAULT_SETTINGS, ...settings }
  if (!player.goals || player.goals === 0) return 0
  return round2(player.goals * ballRateFor(player, players, totalGoals, s))
}

/**
 * Gains TOTAUX : les ballons validés (pronostics justes) valent 20€,
 * les autres valent le taux du palier courant (10/12/15€).
 * total = (buts - validés) × taux + validés × 20
 */
export function getPlayerTotalEarnings(player, players, totalGoals, settings = DEFAULT_SETTINGS, validatedCount = 0) {
  const s = { ...DEFAULT_SETTINGS, ...settings }
  const goals = player.goals || 0
  if (!goals) return 0
  const rate = ballRateFor(player, players, totalGoals, s)
  const vp = Math.max(0, Math.min(validatedCount || 0, goals))
  return round2((goals - vp) * rate + vp * VALIDATED_BALL_VALUE)
}

/** Gains pronostic d'un joueur */
export function getPronoEarnings(player) {
  return round2((player.validatedPronos || 0) * PRONO_BONUS)
}

/**
 * Bonus pronostic GLOBAL par joueur (toutes les parties "pronostic" confondues).
 * Retourne un objet { [id]: montant }. Sert à ajouter le bonus au gain total
 * affiché partout (1ère Partie, fiche joueur, Manager).
 */
export function getPronoBonusMap(modules, coaches) {
  const map = {}
  ;(modules || []).forEach(m => {
    if (m.type === 'pronostic') {
      ;(m.players || []).forEach(p => {
        map[p.id] = (map[p.id] || 0) + (p.validatedPronos || 0) * PRONO_BONUS
      })
    }
  })
  // Les coaches stockent validatedPronos sur leur propre objet (global)
  ;(coaches || []).forEach(c => {
    if (c.validatedPronos) map[c.id] = (map[c.id] || 0) + (c.validatedPronos || 0) * PRONO_BONUS
  })
  return map
}

/**
 * EARNINGS COMBINÉES : forfaits de TOUS les modules + pronostics de TOUS les modules
 * Utilisé par le classement global
 */
export function buildCombinedRanking(modules, coaches) {
  // Map id → player aggregate
  const map = new Map()

  // Nombre de pronostics validés par joueur (tous modules pronostic + coaches)
  const validatedById = {}
  ;(modules || []).forEach(m => {
    if (m.type === 'pronostic') (m.players || []).forEach(p => {
      validatedById[String(p.id)] = (validatedById[String(p.id)] || 0) + (p.validatedPronos || 0)
    })
  })
  ;(coaches || []).forEach(c => {
    if (c.validatedPronos) validatedById[String(c.id)] = (validatedById[String(c.id)] || 0) + (c.validatedPronos || 0)
  })

  // La 1ère partie "forfaits" est celle qui porte les ballons (donc le bonus de validation)
  const canonId = ((modules || []).find(m => (m.type || 'forfaits') === 'forfaits') || (modules || [])[0])?.id

  // Init depuis coaches
  coaches.forEach(c => {
    map.set(String(c.id), {
      id: c.id, name: c.name, color: c.color,
      isCoach: true, role: c.role,
      totalGoals: 0, totalPronoWins: 0,
      totalEarnings: 0,
      forfaitEarnings: 0, pronoEarningsTotal: 0,
      moduleDetails: [],
    })
  })

  modules.forEach(mod => {
    const allPeople = [...(mod.players || []), ...coaches]

    if (!mod.type || mod.type === 'forfaits') {
      const totalGoals = allPeople.reduce((s, p) => s + (p.goals || 0), 0)
      const s = { ...DEFAULT_SETTINGS, ...mod.settings }
      const isCanon = mod.id === canonId

      allPeople.forEach(p => {
        const key = String(p.id)
        if (!map.has(key)) {
          map.set(key, { id:p.id, name:p.name, color:p.color, isCoach:p.isCoach, role:p.role,
            totalGoals:0, totalPronoWins:0, totalEarnings:0, forfaitEarnings:0, pronoEarningsTotal:0, moduleDetails:[] })
        }
        const entry = map.get(key)
        entry.name = p.name; entry.color = p.color
        const vp = isCanon ? (validatedById[key] || 0) : 0
        const total = getPlayerTotalEarnings(p, allPeople, totalGoals, s, vp)
        const forfaitOnly = getPlayerEarnings(p, allPeople, totalGoals, s)
        entry.totalGoals += (p.goals || 0)
        entry.forfaitEarnings += forfaitOnly
        entry.pronoEarningsTotal += Math.max(0, total - forfaitOnly) // surplus dû aux ballons validés
        entry.totalEarnings += total
        entry.moduleDetails.push({ type:'forfait', name:mod.name, goals:p.goals || 0, earnings:total })
      })
    } else if (mod.type === 'pronostic') {
      // Le gain est déjà compté dans la 1ère partie (ballons validés à 20€).
      // Ici on n'agrège que le nombre de pronostics validés (pour les badges).
      allPeople.forEach(p => {
        const key = String(p.id)
        if (!map.has(key)) {
          map.set(key, { id:p.id, name:p.name, color:p.color, isCoach:p.isCoach, role:p.role,
            totalGoals:0, totalPronoWins:0, totalEarnings:0, forfaitEarnings:0, pronoEarningsTotal:0, moduleDetails:[] })
        }
        const entry = map.get(key)
        entry.name = p.name; entry.color = p.color
        const wins = p.validatedPronos || 0
        entry.totalPronoWins += wins
        if (wins > 0 || (p.pronos||0) > 0)
          entry.moduleDetails.push({ type:'prono', name:mod.name, wins, pronos:p.pronos||0, earnings:0 })
      })
    }
  })

  return [...map.values()]
    .sort((a, b) => b.totalEarnings - a.totalEarnings || b.totalGoals - a.totalGoals)
}

function round2(n) { return Math.round(n * 100) / 100 }

export function getCurrentTier(totalGoals, settings = DEFAULT_SETTINGS) {
  const { tier1Threshold, tier2Threshold } = { ...DEFAULT_SETTINGS, ...settings }
  if (totalGoals > tier2Threshold) return 3
  if (totalGoals > tier1Threshold) return 2
  return 1
}
export function getTierRate(totalGoals, settings = DEFAULT_SETTINGS) {
  const { tier1Rate, tier2Rate, tier3Rate, tier1Threshold, tier2Threshold } = { ...DEFAULT_SETTINGS, ...settings }
  if (totalGoals > tier2Threshold) return tier3Rate
  if (totalGoals > tier1Threshold) return tier2Rate
  return tier1Rate
}
export function isTopScorer(player, players, settings = DEFAULT_SETTINGS) {
  const s = { ...DEFAULT_SETTINGS, ...settings }
  if (!player.goals) return false
  const objective = s.objective ?? s.tier2Threshold
  const total = players.reduce((a, p) => a + (p.goals || 0), 0)
  if (!(s.phaseEnded || total > objective)) return false
  const maxG = Math.max(...players.map(p => p.goals||0), 0)
  return player.goals === maxG && players.filter(p => (p.goals||0) === maxG).length === 1
}
export function hasHatTrick(player) { return (player.goals||0) >= 3 }
