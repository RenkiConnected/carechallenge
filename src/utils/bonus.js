/**
 * CALCUL DES PRIMES — RÉTROACTIF
 * Quand l'équipe franchit un seuil, TOUS les forfaits antérieurs
 * sont recalculés au nouveau taux (rétroactif).
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

export function getPlayerEarnings(player, players, totalGoals, settings = DEFAULT_SETTINGS) {
  const {
    tier1Rate, tier2Rate, tier3Rate, topScorerRate,
    tier1Threshold, tier2Threshold, phaseEnded, minForTier3,
  } = { ...DEFAULT_SETTINGS, ...settings }

  if (player.goals === 0) return 0

  // Top buteur uniquement en fin de phase
  if (phaseEnded) {
    const maxG = Math.max(...players.map(p => p.goals), 0)
    const tops = players.filter(p => p.goals === maxG && maxG > 0)
    if (tops.length === 1 && player.goals === maxG) {
      return round2(player.goals * topScorerRate)
    }
  }

  // ── RÉTROACTIF : taux actuel appliqué à TOUS les forfaits ──────────────────
  // Franchissement du seuil 2 → 3 → le taux monte pour TOUT l'historique
  let rate
  if (totalGoals >= tier2Threshold) {
    rate = player.goals >= (minForTier3 || 3) ? tier3Rate : tier2Rate
  } else if (totalGoals >= tier1Threshold) {
    rate = tier2Rate   // ← tous les forfaits passent à 12€ dès 40 total
  } else {
    rate = tier1Rate
  }

  return round2(player.goals * rate)
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
  if (!settings?.phaseEnded) return false
  if (player.goals === 0) return false
  const maxG = Math.max(...players.map(p => p.goals), 0)
  return player.goals === maxG && players.filter(p => p.goals === maxG).length === 1
}

export function hasHatTrick(player) { return player.goals >= 3 }

// Earnings pronostic module
export const PRONO_BONUS = 20 // €20 par pronostic validé
export function getPronoEarnings(player) {
  return (player.validatedPronos || 0) * PRONO_BONUS
}
