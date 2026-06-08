/**
 * Calculate earnings for a player based on the current total and tier rules.
 * Rules:
 *  - Base: €10/forfait
 *  - ≥40 total forfaits: €12 for subsequent
 *  - ≥50 total forfaits: €15 for subsequent (only if individual ≥ 3)
 *  - Top scorer (unique): €20 for ALL their forfaits
 */
export function getPlayerEarnings(player, players, totalGoals) {
  if (player.goals === 0) return 0

  const maxG = Math.max(...players.map((p) => p.goals), 0)
  const topScorers = players.filter((p) => p.goals === maxG && maxG > 0)

  // Unique top scorer → €20 for all goals
  if (topScorers.length === 1 && player.goals === maxG) {
    return player.goals * 20
  }

  const g = player.goals
  const t = totalGoals || 1

  if (t <= 40) {
    return g * 10
  } else if (t <= 50) {
    const tier1 = Math.max(0, Math.round(g * 40 / t))
    const tier2 = g - tier1
    return tier1 * 10 + tier2 * 12
  } else {
    const tier1 = Math.max(0, Math.round(g * 40 / t))
    const tier2 = Math.max(0, Math.round(g * 10 / t))
    const tier3 = Math.max(0, g - tier1 - tier2)
    const rate3 = g >= 3 ? 15 : 12
    return tier1 * 10 + tier2 * 12 + tier3 * rate3
  }
}

export function getCurrentTier(totalGoals) {
  if (totalGoals >= 50) return 3
  if (totalGoals >= 40) return 2
  return 1
}

export function getTierRate(totalGoals) {
  if (totalGoals >= 50) return 15
  if (totalGoals >= 40) return 12
  return 10
}

export function getTierLabel(tier) {
  if (tier === 3) return '15€'
  if (tier === 2) return '12€'
  return '10€'
}

export function isTopScorer(player, players) {
  if (player.goals === 0) return false
  const maxG = Math.max(...players.map((p) => p.goals), 0)
  return player.goals === maxG && players.filter((p) => p.goals === maxG).length === 1
}

export function hasHatTrick(player) {
  return player.goals >= 3
}
