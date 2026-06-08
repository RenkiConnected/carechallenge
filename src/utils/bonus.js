/**
 * CALCUL DES PRIMES — World Cup Challenge 2026
 *
 * RÈGLES :
 * - Base : tier1Rate (défaut 9,99€) par forfait
 * - À tier1Threshold forfaits cumulés → tier2Rate pour les SUIVANTS
 * - À tier2Threshold forfaits cumulés → tier3Rate pour les SUIVANTS (si individuel ≥ 3)
 * - Top buteur : topScorerRate pour TOUS ses forfaits (UNIQUEMENT si phaseEnded = true)
 */

export const DEFAULT_SETTINGS = {
  tier1Rate: 9.99,       // Taux de base (€/forfait)
  tier2Rate: 12,         // Taux palier 2
  tier3Rate: 15,         // Taux palier 3
  topScorerRate: 20,     // Taux meilleur buteur (fin de phase)
  tier1Threshold: 40,    // Seuil palier 1→2 (total équipe)
  tier2Threshold: 50,    // Seuil palier 2→3 (total équipe)
  phaseEnded: false,     // Active le bonus top buteur (fin de phase de préparation)
  minForTier3: 3,        // Minimum forfaits individuels pour accéder au palier 3
}

export function getPlayerEarnings(player, players, totalGoals, settings = DEFAULT_SETTINGS) {
  const {
    tier1Rate, tier2Rate, tier3Rate, topScorerRate,
    tier1Threshold, tier2Threshold,
    phaseEnded, minForTier3,
  } = { ...DEFAULT_SETTINGS, ...settings }

  if (player.goals === 0) return 0

  // ── Top buteur uniquement en fin de phase ──
  if (phaseEnded) {
    const maxG = Math.max(...players.map(p => p.goals), 0)
    const topScorers = players.filter(p => p.goals === maxG && maxG > 0)
    if (topScorers.length === 1 && player.goals === maxG) {
      return round2(player.goals * topScorerRate)
    }
  }

  const g = player.goals
  const t = Math.max(totalGoals, 1)

  if (t <= tier1Threshold) {
    // Tout le monde au taux de base
    return round2(g * tier1Rate)
  } else if (t <= tier2Threshold) {
    // Partage proportionnel entre palier 1 et 2
    const inTier1 = Math.max(0, Math.round(g * tier1Threshold / t))
    const inTier2 = g - inTier1
    return round2(inTier1 * tier1Rate + inTier2 * tier2Rate)
  } else {
    // Partage proportionnel entre les 3 paliers
    const inTier1 = Math.max(0, Math.round(g * tier1Threshold / t))
    const inTier2 = Math.max(0, Math.round(g * (tier2Threshold - tier1Threshold) / t))
    const inTier3 = Math.max(0, g - inTier1 - inTier2)
    const rate3 = g >= minForTier3 ? tier3Rate : tier2Rate // Pas éligible si < 3 forfaits indiv.
    return round2(inTier1 * tier1Rate + inTier2 * tier2Rate + inTier3 * rate3)
  }
}

function round2(n) {
  return Math.round(n * 100) / 100
}

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
  if (!settings?.phaseEnded) return false
  if (player.goals === 0) return false
  const maxG = Math.max(...players.map(p => p.goals), 0)
  return player.goals === maxG && players.filter(p => p.goals === maxG).length === 1
}

export function hasHatTrick(player) {
  return player.goals >= 3
}
