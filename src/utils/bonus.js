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
export function getPlayerTotalEarnings(player, players, totalGoals, settings = DEFAULT_SETTINGS, validatedCount = 0, validatedValue = null) {
  const s = { ...DEFAULT_SETTINGS, ...settings }
  const goals = player.goals || 0
  if (!goals) return 0
  const rate = ballRateFor(player, players, totalGoals, s)
  const vc = validatedCount || 0
  const vp = Math.max(0, Math.min(vc, goals))
  // Valeur des ballons validés : si une valeur € est fournie (taux par pronostic, ex. Irak 25€),
  // on l'utilise (moyenne par ballon × ballons retenus) ; sinon repli au taux standard (20€).
  const bonus = (validatedValue != null && vc > 0) ? (validatedValue / vc) * vp : vp * VALIDATED_BALL_VALUE
  return round2((goals - vp) * rate + bonus)
}

/** Gains pronostic d'un joueur */
export function getPronoEarnings(player) {
  return round2((player.validatedPronos || 0) * PRONO_BONUS)
}

// ─── ÉLIMINATION DIRECTE : bonus QUOTIDIEN ─────────────────────────────────
// Règle d'une journée : le 1er à atteindre 3 ballons gagne bonusFirst3 (50€).
// Puis les bonus2Count (4) suivants à atteindre ≥2 ballons gagnent bonus2 (30€) chacun.
// Si PERSONNE n'atteint 3 ballons → aucun bonus ce jour-là.
// L'ordre est donné par reach3At / reach2At (timestamps posés à l'atteinte du 3e / 2e ballon).
export function computeElimDailyBonus(people, settings = {}) {
  const FIRST3 = settings.bonusFirst3 ?? 50
  const B2 = settings.bonus2 ?? 30
  const N2 = settings.bonus2Count ?? 4
  const earnings = {}
  const reached3 = (people || []).filter(p => (p.goals || 0) >= 3)
    .sort((a, b) => (a.reach3At || 9e15) - (b.reach3At || 9e15))
  if (!reached3.length) return earnings // personne n'a fait 3 → aucun bonus
  const first = reached3[0]
  earnings[String(first.id)] = FIRST3
  const others = (people || [])
    .filter(p => String(p.id) !== String(first.id) && (p.goals || 0) >= 2)
    .sort((a, b) => (a.reach2At || 9e15) - (b.reach2At || 9e15))
    .slice(0, N2)
  others.forEach(p => { earnings[String(p.id)] = B2 })
  return earnings
}

// Total cumulé d'un module Élimination directe = somme des journées figées (elimHistory)
// + le bonus LIVE du jour en cours (calculé sur les ballons actuels).
export function elimTotalsById(mod) {
  const totals = {}
  const add = (id, amt) => { totals[String(id)] = (totals[String(id)] || 0) + amt }
  const hist = mod.elimHistory || {}
  Object.values(hist).forEach(day => Object.entries(day || {}).forEach(([id, amt]) => add(id, amt)))
  return totals
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
      const val = m.settings?.pronoBonus || PRONO_BONUS
      ;(m.players || []).forEach(p => {
        map[p.id] = (map[p.id] || 0) + (p.validatedPronos || 0) * val
      })
      if (m.coachData) Object.entries(m.coachData).forEach(([id, d]) => {
        map[id] = (map[id] || 0) + (d?.validatedPronos || 0) * val
      })
    }
  })
  // Les coaches stockent validatedPronos sur leur propre objet (global) pour le prono historique
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

  // Pronostics validés répartis selon le classement alimenté :
  // France–Sénégal (feeds:'poules') → Phase de Poules ; France–Irlande → Préparation.
  const validatedPrep = {}, validatedPoules = {}
  const valuePrep = {}, valuePoules = {} // valeur € des ballons validés (taux par pronostic)
  ;(modules || []).forEach(m => {
    if (m.type !== 'pronostic') return
    if (m.settings?.feeds === 'none') return
    const toPoules = m.settings?.feeds === 'poules'
    const target = toPoules ? validatedPoules : validatedPrep
    const vtarget = toPoules ? valuePoules : valuePrep
    const val = m.settings?.pronoBonus || PRONO_BONUS
    ;(m.players || []).forEach(p => {
      target[String(p.id)] = (target[String(p.id)] || 0) + (p.validatedPronos || 0)
      vtarget[String(p.id)] = (vtarget[String(p.id)] || 0) + (p.validatedPronos || 0) * val
    })
    if (m.coachData) Object.entries(m.coachData).forEach(([id, d]) => {
      target[String(id)] = (target[String(id)] || 0) + (d?.validatedPronos || 0)
      vtarget[String(id)] = (vtarget[String(id)] || 0) + (d?.validatedPronos || 0) * val
    })
  })
  ;(coaches || []).forEach(c => { if (c.validatedPronos) {
    validatedPrep[String(c.id)] = (validatedPrep[String(c.id)] || 0) + (c.validatedPronos || 0)
    valuePrep[String(c.id)] = (valuePrep[String(c.id)] || 0) + (c.validatedPronos || 0) * PRONO_BONUS
  } })

  // La 1ère partie "forfaits" (Préparation) est le classement canonique.
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
    // Coachs avec leur compteur de forfaits PROPRE à ce module (coachData), pas le global.
    const moduleCoaches = coaches.map(c => ({ ...c, goals: mod.coachData?.[c.id]?.goals || 0, extraSlots: mod.coachData?.[c.id]?.extraSlots || 0 }))
    const allPeople = [...(mod.players || []), ...moduleCoaches]

    if (!mod.type || mod.type === 'forfaits') {
      const totalGoals = allPeople.reduce((s, p) => s + (p.goals || 0), 0)
      const s = { ...DEFAULT_SETTINGS, ...mod.settings }

      // ── Module ÉLIMINATION DIRECTE (bonus quotidien) ──
      if (mod.settings?.dailyBonus) {
        const histTotals = elimTotalsById(mod)              // journées figées
        const liveToday = computeElimDailyBonus(allPeople, mod.settings) // jour en cours
        const ids = new Set([...Object.keys(histTotals), ...Object.keys(liveToday), ...allPeople.map(p => String(p.id))])
        ids.forEach(key => {
          const person = allPeople.find(p => String(p.id) === key) || {}
          if (!map.has(key)) {
            map.set(key, { id:person.id ?? key, name:person.name, color:person.color, isCoach:person.isCoach, role:person.role,
              totalGoals:0, totalPronoWins:0, totalEarnings:0, forfaitEarnings:0, pronoEarningsTotal:0, moduleDetails:[] })
          }
          const entry = map.get(key)
          if (person.name) { entry.name = person.name; entry.color = person.color }
          const gain = (histTotals[key] || 0) + (liveToday[key] || 0)
          entry.totalEarnings += gain
          entry.pronoEarningsTotal += gain // affiché comme "bonus" (hors forfaits au taux)
          if (gain > 0) entry.moduleDetails.push({ type:'elim', name:mod.name, goals:person.goals || 0, earnings:gain })
        })
        return // module traité, on ne fait pas le calcul "forfaits au taux"
      }

      const isCanon = mod.id === canonId
      const isPoules = mod.settings?.phase === 'poules'
      const vmap = isPoules ? validatedPoules : (isCanon ? validatedPrep : null)
      const vvalmap = isPoules ? valuePoules : (isCanon ? valuePrep : null)

      allPeople.forEach(p => {
        const key = String(p.id)
        if (!map.has(key)) {
          map.set(key, { id:p.id, name:p.name, color:p.color, isCoach:p.isCoach, role:p.role,
            totalGoals:0, totalPronoWins:0, totalEarnings:0, forfaitEarnings:0, pronoEarningsTotal:0, moduleDetails:[] })
        }
        const entry = map.get(key)
        entry.name = p.name; entry.color = p.color
        const vp = vmap ? (vmap[key] || 0) : 0
        const vval = vvalmap ? (vvalmap[key] ?? null) : null
        const total = getPlayerTotalEarnings(p, allPeople, totalGoals, s, vp, vval)
        const forfaitOnly = getPlayerEarnings(p, allPeople, totalGoals, s)
        entry.totalGoals += (p.goals || 0)
        entry.forfaitEarnings += forfaitOnly
        entry.pronoEarningsTotal += Math.max(0, total - forfaitOnly) // surplus dû aux ballons validés
        entry.totalEarnings += total
        entry.moduleDetails.push({ type:'forfait', name:mod.name, goals:p.goals || 0, earnings:total })
      })
    } else if (mod.type === 'pronostic') {
      // Le gain est déjà compté dans le classement alimenté (ballons validés à 20€).
      // Ici on n'agrège que le nombre de pronostics validés (pour les badges).
      const pronoPeople = [
        ...(mod.players || []),
        ...coaches.map(c => mod.coachData ? { ...c, ...(mod.coachData[c.id] || { validatedPronos:0, pronos:0 }) } : c),
      ]
      pronoPeople.forEach(p => {
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
