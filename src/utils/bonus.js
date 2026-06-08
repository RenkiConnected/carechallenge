/**
 * CALCUL DES PRIMES — RÉTROACTIF + COMBINÉ (forfaits + pronostics)
 */
export const DEFAULT_SETTINGS = {
  tier1Rate: 9.99,
  tier2Rate: 12,
  tier3Rate: 15,
  topScorerRate: 20,
  tier1Threshold: 40,
  tier2Threshold: 50,
  phaseEnded: false,
  minForTier3: 3,
}

export const PRONO_BONUS = 20

/** Gains forfaits d'un joueur — RÉTROACTIF au taux actuel */
export function getPlayerEarnings(player, players, totalGoals, settings = DEFAULT_SETTINGS) {
  const {
    tier1Rate, tier2Rate, tier3Rate, topScorerRate,
    tier1Threshold, tier2Threshold, phaseEnded, minForTier3,
  } = { ...DEFAULT_SETTINGS, ...settings }

  if (!player.goals || player.goals === 0) return 0

  if (phaseEnded) {
    const maxG = Math.max(...players.map(p => p.goals || 0), 0)
    const tops = players.filter(p => (p.goals||0) === maxG && maxG > 0)
    if (tops.length === 1 && player.goals === maxG) return round2(player.goals * topScorerRate)
  }

  let rate
  if (totalGoals >= tier2Threshold)       rate = (player.goals >= (minForTier3||3)) ? tier3Rate : tier2Rate
  else if (totalGoals >= tier1Threshold)  rate = tier2Rate
  else                                    rate = tier1Rate

  return round2(player.goals * rate)
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

  // Parcours de tous les modules
  modules.forEach(mod => {
    const allPeople = [...(mod.players || []), ...coaches]

    if (!mod.type || mod.type === 'forfaits') {
      const totalGoals = allPeople.reduce((s, p) => s + (p.goals||0), 0)
      const s = { ...DEFAULT_SETTINGS, ...mod.settings }

      allPeople.forEach(p => {
        const key = String(p.id)
        if (!map.has(key)) {
          map.set(key, { id:p.id, name:p.name, color:p.color, isCoach:p.isCoach, role:p.role,
            totalGoals:0, totalPronoWins:0, totalEarnings:0, forfaitEarnings:0, pronoEarningsTotal:0, moduleDetails:[] })
        }
        const entry = map.get(key)
        entry.name = p.name; entry.color = p.color
        const earnings = getPlayerEarnings(p, allPeople, totalGoals, s)
        entry.totalGoals += (p.goals||0)
        entry.forfaitEarnings += earnings
        entry.totalEarnings += earnings
        entry.moduleDetails.push({ type:'forfait', name:mod.name, goals:p.goals||0, earnings })
      })
    } else if (mod.type === 'pronostic') {
      allPeople.forEach(p => {
        const key = String(p.id)
        if (!map.has(key)) {
          map.set(key, { id:p.id, name:p.name, color:p.color, isCoach:p.isCoach, role:p.role,
            totalGoals:0, totalPronoWins:0, totalEarnings:0, forfaitEarnings:0, pronoEarningsTotal:0, moduleDetails:[] })
        }
        const entry = map.get(key)
        entry.name = p.name; entry.color = p.color
        const wins = p.validatedPronos || 0
        const earnings = wins * PRONO_BONUS
        entry.totalPronoWins += wins
        entry.pronoEarningsTotal += earnings
        entry.totalEarnings += earnings
        if (wins > 0 || (p.pronos||0) > 0)
          entry.moduleDetails.push({ type:'prono', name:mod.name, wins, pronos:p.pronos||0, earnings })
      })
    }
  })

  return [...map.values()]
    .sort((a, b) => b.totalEarnings - a.totalEarnings || b.totalGoals - a.totalGoals)
}

function round2(n) { return Math.round(n * 100) / 100 }

export function getCurrentTier(totalGoals, settings = DEFAULT_SETTINGS) {
  const { tier1Threshold, tier2Threshold } = { ...DEFAULT_SETTINGS, ...settings }
  if (totalGoals >= tier2Threshold) return 3
  if (totalGoals >= tier1Threshold) return 2
  return 1
}
export function getTierRate(totalGoals, settings = DEFAULT_SETTINGS) {
  const { tier1Rate, tier2Rate, tier3Rate, tier1Threshold, tier2Threshold } = { ...DEFAULT_SETTINGS, ...settings }
  if (totalGoals >= tier2Threshold) return tier3Rate
  if (totalGoals >= tier1Threshold) return tier2Rate
  return tier1Rate
}
export function isTopScorer(player, players, settings = DEFAULT_SETTINGS) {
  if (!settings?.phaseEnded || !player.goals) return false
  const maxG = Math.max(...players.map(p => p.goals||0), 0)
  return player.goals === maxG && players.filter(p => (p.goals||0) === maxG).length === 1
}
export function hasHatTrick(player) { return (player.goals||0) >= 3 }
