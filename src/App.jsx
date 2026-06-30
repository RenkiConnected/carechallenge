import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Pitch from './components/Pitch'
import PronosticModule from './components/PronosticModule'
import Fireworks from './components/Fireworks'
import Leaderboard from './components/Leaderboard'
import Rules from './components/Rules'
import Dashboard from './components/Dashboard'
import Bracket, { setWinner as bracketSetWinner } from './components/Bracket'
import Login from './components/Login'
import WorldCupCountdown, { GROUP_PHASE_TS } from './components/WorldCupCountdown'
import { getCurrentTier, getTierRate, DEFAULT_SETTINGS, PRONO_BONUS, computeElimDailyBonus, isGroupModule } from './utils/bonus'

// Clé de jour locale 'AAAA-MM-JJ' (sert à la remise à zéro quotidienne de l'Élimination directe).
const dayKeyOf = (d = new Date()) => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
import { db, isConfigured, doc, setDoc, onSnapshot } from './firebase'

const BASE_PLAYERS = [
  { id: 1, name: 'Alex',   goals: 0, extraSlots: 0, x: 28, y: 28, color: '#e74c3c' },
  { id: 2, name: 'Jordan', goals: 0, extraSlots: 0, x: 50, y: 22, color: '#3498db' },
  { id: 3, name: 'Morgan', goals: 0, extraSlots: 0, x: 72, y: 28, color: '#2ecc71' },
  { id: 4, name: 'Taylor', goals: 0, extraSlots: 0, x: 28, y: 72, color: '#e67e22' },
  { id: 5, name: 'Casey',  goals: 0, extraSlots: 0, x: 50, y: 78, color: '#9b59b6' },
  { id: 6, name: 'Riley',  goals: 0, extraSlots: 0, x: 72, y: 72, color: '#1abc9c' },
  { id: 7, name: 'Sam',    goals: 0, extraSlots: 0, x: 38, y: 50, color: '#e91e8c' },
  { id: 8, name: 'Chris',  goals: 0, extraSlots: 0, x: 62, y: 50, color: '#ff9800' },
]
const BASE_COACHES = [
  { id: 'david',  name: 'David',  goals: 0, extraSlots: 0, x: 8, y: 38, color: '#ffd700', isCoach: true, role: 'Coach' },
  { id: 'yannis', name: 'Yannis', goals: 0, extraSlots: 0, x: 8, y: 62, color: '#dda0dd', isCoach: true, role: 'Adj.' },
]

function makeModule(id, name) {
  return { id, name, type: 'forfaits', players: BASE_PLAYERS.map(p => ({ ...p })), settings: { ...DEFAULT_SETTINGS } }
}
function makePronoModule(id) {
  return { id, name: 'Bon Pronostiqueur', type: 'pronostic', players: BASE_PLAYERS.map(p => ({ ...p, goals: 0, pronos: 0, validatedPronos: 0, franceScore: '', irelandScore: '' })), settings: { pronoBonus: 20 } }
}

// Préréglage 2ème partie — Phase de poules (objectif 100 forfaits, jusqu'au 27 juin)
const PART2_SETTINGS = {
  tier1Rate: 10, tier2Rate: 12, tier3Rate: 15, topScorerRate: 20,
  tier1Threshold: 50, tier2Threshold: 80, objective: 100,
  phaseEnded: false, minForTier3: 3,
  unit: 'forfait', phase: 'poules',
  bannerPhase: 'PHASE DE POULES', bannerDates: "JUSQU'AU 27 JUIN 2026",
}

// Préréglage — Élimination directe (MÊMES règles que la phase de poule).
// Active (informatif) du 28 juin 2026 09h00 au 19 juillet 2026 20h59.
const ELIM_SETTINGS = {
  unit: 'forfait', phase: 'elim',
  dailyBonus: true, bonusFirst3: 50, bonus2: 30, bonus2Count: 4,
  startDate: '2026-06-28', endDate: '2026-07-09',
  objective: 100,
  bannerPhase: 'ÉLIMINATION DIRECTE', bannerDates: 'DU 28 JUIN AU 09 JUILLET 2026',
}

// Préréglage du match France–Sénégal (pronostic de la PHASE DE GROUPE).
// Alimente la Phase de Poules (feeds:'poules'). Remplissable le 16/06 de 09h00 à 21h50.
const SENEGAL_SETTINGS = {
  pronoBonus: 20, feeds: 'poules',
  homeFlag: '🇫🇷', homeName: 'FRANCE', homeCode: 'FRA',
  awayFlag: '🇸🇳', awayName: 'SÉNÉGAL', awayCode: 'SEN',
  matchLabel: 'FRANCE VS SÉNÉGAL',
  window: { from: '2026-06-16T09:00:00', to: '2026-06-16T21:50:00' },
}

// Préréglage du match France–Irak (pronostic de la PHASE DE GROUPE).
// Alimente la Phase de Poules (feeds:'poules'). Deux créneaux distincts :
//  • Prédiction du score : LUNDI 22 juin, 09h00 → 22h59.
//  • Dépôt des ballons   : MARDI 23 juin, 09h00 → 20h00.
const IRAK_SETTINGS = {
  pronoBonus: 25, feeds: 'poules',
  homeFlag: '🇫🇷', homeName: 'FRANCE', homeCode: 'FRA',
  awayFlag: '🇮🇶', awayName: 'IRAK', awayCode: 'IRQ',
  matchLabel: 'FRANCE VS IRAK',
  window: { from: '2026-06-22T09:00:00', to: '2026-06-22T22:59:00' },
  ballWindow: { from: '2026-06-27T09:00:00', to: '2026-06-27T20:30:00' },
}

// Préréglage du match France–Norvège (pronostic de la PHASE DE GROUPE).
// Alimente la Phase de Poules (feeds:'poules'). Un seul créneau (prédiction ET ballons) :
//  • VENDREDI 26 juin, 09h00 → 20h59.
const NORVEGE_SETTINGS = {
  pronoBonus: 20, feeds: 'poules',
  homeFlag: '🇫🇷', homeName: 'FRANCE', homeCode: 'FRA',
  awayFlag: '🇳🇴', awayName: 'NORVÈGE', awayCode: 'NOR',
  matchLabel: 'FRANCE VS NORVÈGE',
  window: { from: '2026-06-26T09:00:00', to: '2026-06-26T20:59:00' },
}

// France–Suède · 16ᵉ DE FINALE. Vote (prédiction + ballons) le MARDI 30 juin (09h00→22h59).
// Règles de gains à définir plus tard → feeds:'none' (n'alimente aucun classement pour l'instant).
// knockout:true → animation différente dans la fiche du pronostic.
const SUEDE_SETTINGS = {
  pronoBonus: 20, feeds: 'none', knockout: true,
  homeFlag: '🇫🇷', homeName: 'FRANCE', homeCode: 'FRA',
  awayFlag: '🇸🇪', awayName: 'SUÈDE', awayCode: 'SWE',
  matchLabel: 'FRANCE VS SUÈDE',
  phaseLabel: '16ᵉ DE FINALE',
  window: { from: '2026-06-30T09:00:00', to: '2026-06-30T22:59:00' },
}

// Chargement local : si la clé principale a été vidée/réinitialisée, on récupère
// automatiquement la DERNIÈRE bonne sauvegarde locale (filet de secours par appareil).
function loadLocal() {
  try {
    const r = localStorage.getItem('fc2026_v5')
    const main = r ? JSON.parse(r) : null
    if (main && !looksLikeBootstrap(main)) return main
    const g = localStorage.getItem('fc2026_v5_good')
    const good = g ? JSON.parse(g) : null
    if (good && !looksLikeBootstrap(good)) return good
    return main
  } catch { return null }
}
// Sauvegarde locale : on garde TOUJOURS en plus une copie de la dernière VRAIE donnée
// (non par défaut) — elle ne sera jamais remplacée par du vide.
function saveLocal(d) {
  try {
    localStorage.setItem('fc2026_v5', JSON.stringify(d))
    if (d && !looksLikeBootstrap(d)) localStorage.setItem('fc2026_v5_good', JSON.stringify(d))
  } catch {}
}

// ── ROSTER GLOBAL : les joueurs sont PARTAGÉS sur toutes les parties ───────────
// La SOURCE DE VÉRITÉ = la 1ère partie "forfaits" (celle gérée dans le Manager).
// Toutes les autres parties (Pronostic, parties suivantes) sont FORCÉES à contenir
// exactement ces joueurs (mêmes id / nom / couleur), en ajoutant les manquants et
// en SUPPRIMANT les joueurs qui n'existent pas dans le Manager.
// Seules les données par-partie (buts, positions, pronostics) restent propres.
let _idCounter = 0
function uniqueId() { return Date.now() * 1000 + (_idCounter++ % 1000) }

function baseFor(type) {
  return type === 'pronostic'
    ? { goals: 0, pronos: 0, validatedPronos: 0, franceScore: '', irelandScore: '' }
    : { goals: 0, extraSlots: 0 }
}

// Module canonique = 1ère partie de type forfaits (sinon le 1er module)
function canonicalModule(modules) {
  return (modules || []).find(m => (m.type || 'forfaits') === 'forfaits') || (modules || [])[0]
}

// Liste de référence des joueurs (identité), issue du module canonique
function buildRoster(modules, deletedIds = []) {
  const dead = new Set(deletedIds)
  const canon = canonicalModule(modules)
  const map = new Map()
  ;(canon?.players || []).forEach(p => {
    if (dead.has(p.id)) return // joueur supprimé (pierre tombale) → jamais dans le roster
    if (!map.has(p.id)) map.set(p.id, { id: p.id, name: p.name, color: p.color, x: p.x, y: p.y })
  })
  return map
}

// Force CHAQUE partie à contenir exactement le roster (ajoute manquants, retire orphelins,
// synchronise nom + couleur). Conserve les données par-partie des joueurs déjà présents.
// deletedIds = pierres tombales : ces joueurs sont retirés PARTOUT, même s'ils réapparaissent.
function reconcileModules(modules, deletedIds = []) {
  if (!modules || !modules.length) return modules
  const roster = buildRoster(modules, deletedIds)
  if (!roster.size) return modules
  const canonId = (modules.find(m => (m.type || 'forfaits') === 'forfaits') || modules[0])?.id
  return modules.map(m => {
    if (m.type === 'bracket') return m // le Tableau n'a pas de joueurs : on le laisse tel quel
    const existing = new Map((m.players || []).map(p => [p.id, p]))
    const players = [...roster.values()].map(r => {
      const prev = existing.get(r.id)
      const merged = { ...baseFor(m.type), ...(prev || {}), id: r.id, name: r.name, color: r.color }
      if (merged.x == null) merged.x = r.x ?? (40 + Math.random() * 20)
      if (merged.y == null) merged.y = r.y ?? (40 + Math.random() * 20)
      return merged
    })
    // Migration : ancien taux de base 9.99€ → 10€
    let settings = m.settings
    if (settings && settings.tier1Rate === 9.99) settings = { ...settings, tier1Rate: 10 }
    // Migration : Phase de poules désormais en "forfaits" (et non "lignes")
    if (settings && settings.phase === 'poules' && settings.unit === 'ligne') settings = { ...settings, unit: 'forfait' }
    // Migration : la phase de poules va jusqu'au 27 JUIN 2026 (corrige 24 juin / 27 juillet)
    if (settings && settings.phase === 'poules' && settings.bannerDates !== "JUSQU'AU 27 JUIN 2026")
      settings = { ...settings, bannerDates: "JUSQU'AU 27 JUIN 2026" }
    // Élimination directe : un module créé à la main (nommé "élimination directe") est CONVERTI
    // aux mêmes règles que la phase de poule, puis on garde ses bonnes dates de bandeau.
    if (settings) {
      const nm = (m.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      if (settings.phase !== 'elim' && nm.includes('elimination directe'))
        settings = { ...settings, ...ELIM_SETTINGS }
      // Élimination directe : nouvelles règles (bonus quotidien 50€/30€) + dates jusqu'au 09 juillet.
      if (settings.phase === 'elim' && (!settings.dailyBonus || settings.endDate !== '2026-07-09' || settings.bannerDates !== 'DU 28 JUIN AU 09 JUILLET 2026')) {
        const { tier1Rate, tier2Rate, tier3Rate, topScorerRate, tier1Threshold, tier2Threshold, minForTier3, phaseEnded, ...keep } = settings
        settings = { ...keep, ...ELIM_SETTINGS }
      }
    }
    // Les pronostics des matchs de poule (Sénégal, Irak, Norvège) alimentent TOUJOURS la Phase de
    // Poules : leur bonus doit compter dans le classement du groupe. On le force au cas où une
    // ancienne donnée aurait perdu feeds:'poules' (sinon le bonus n'apparaît pas dans les Poules).
    if (settings && ['SEN', 'IRQ', 'NOR'].includes(settings.awayCode) && settings.feeds !== 'poules')
      settings = { ...settings, feeds: 'poules' }
    // Migration : créneau du pronostic France–Sénégal = 16 juin 09h00 → 21h50 (UNIQUEMENT ce match)
    if (settings && settings.feeds === 'poules' && settings.awayCode === 'SEN' && settings.window &&
        (settings.window.from !== '2026-06-16T09:00:00' || settings.window.to !== '2026-06-16T21:50:00'))
      settings = { ...settings, window: { from: '2026-06-16T09:00:00', to: '2026-06-16T21:50:00' } }
    // Migration : créneaux du pronostic France–Irak — prédictions le 22 juin (09h00→22h59),
    // ballons le 23 juin (09h00→20h00). Corrige d'anciennes données erronées (fenêtre Sénégal collée par erreur).
    if (settings && settings.awayCode === 'IRQ') {
      const W = { from: '2026-06-22T09:00:00', to: '2026-06-22T22:59:00' }
      const BW = { from: '2026-06-27T09:00:00', to: '2026-06-27T20:30:00' }
      const w = settings.window, bw = settings.ballWindow
      if (!w || w.from !== W.from || w.to !== W.to || !bw || bw.from !== BW.from || bw.to !== BW.to || settings.pronoBonus !== 25)
        settings = { ...settings, window: { ...W }, ballWindow: { ...BW }, pronoBonus: 25 }
    }
    // Migration : créneau du pronostic France–Norvège — prédictions ET ballons le VENDREDI 26 juin (09h00→20h59).
    if (settings && settings.awayCode === 'NOR') {
      const W = { from: '2026-06-26T09:00:00', to: '2026-06-26T20:59:00' }
      const w = settings.window
      if (!w || w.from !== W.from || w.to !== W.to || settings.ballWindow) {
        const { ballWindow, ...rest } = settings // on retire proprement ballWindow (un seul créneau)
        settings = { ...rest, window: { ...W } }
      }
    }
    // Migration : créneau France–Suède (16ᵉ de finale) — vote le MARDI 30 juin (09h00→22h59).
    if (settings && settings.awayCode === 'SWE') {
      const W = { from: '2026-06-30T09:00:00', to: '2026-06-30T22:59:00' }
      const w = settings.window
      if (!w || w.from !== W.from || w.to !== W.to || settings.phaseLabel !== '16ᵉ DE FINALE' || settings.feeds !== 'none' || !settings.knockout)
        settings = { ...settings, window: { ...W }, phaseLabel: '16ᵉ DE FINALE', feeds: 'none', knockout: true }
    }
    // Migration : la 1ère partie s'appelle "Préparation Mondiale"
    let name = m.name
    if (m.id === canonId && (name === '1ère Partie' || name === '1ere Partie')) name = 'Préparation Mondiale'
    return { ...m, name, players, settings }
  })
}

// ─── Fusion 3-way (anti-écrasement) ─────────────────────────────────────────
// base = ancêtre commun (dernier état synchronisé), local = nos modifications,
// server = état actuel du serveur (modifs des autres). Règle : pour chaque champ,
// si NOUS l'avons changé (local ≠ base) on garde le nôtre, sinon on prend le serveur.
// Ainsi deux personnes qui éditent des choses différentes ne s'écrasent jamais.
const _diff = (a, b) => JSON.stringify(a) !== JSON.stringify(b)

// Détecte un état "par défaut / vide" (roster de démarrage Alex/Jordan/…) : le vrai
// roster ne contient AUCUN de ces noms. Sert à ne jamais laisser un appareil réinitialisé
// écraser les vraies données — et à laisser un appareil sain RÉPARER un serveur écrasé.
const BOOTSTRAP_NAMES = new Set(['Alex','Jordan','Morgan','Taylor','Casey','Riley','Chris'])
function looksLikeBootstrap(s) {
  if (!s || !Array.isArray(s.modules) || s.modules.length === 0) return true
  const forfait = s.modules.find(m => (m.type || 'forfaits') === 'forfaits')
  const players = (forfait && forfait.players) || []
  if (players.length === 0) return true
  // Le roster de démarrage contient 7 noms distinctifs (Alex/Jordan/…). On exige au moins
  // 3 de ces noms pour conclure "données par défaut" (évite tout faux positif sur un vrai
  // roster qui aurait par hasard un seul de ces prénoms).
  const n = players.filter(p => BOOTSTRAP_NAMES.has(String(p.name))).length
  return n >= 3
}

function mergeObj(b, l, s) {
  if (!s) return l
  if (!l) return s
  const keys = new Set([...Object.keys(l), ...Object.keys(s)])
  const out = {}
  keys.forEach(k => {
    const lv = l[k], bv = b ? b[k] : undefined, sv = s[k]
    out[k] = _diff(lv, bv) ? lv : (k in s ? sv : lv)
  })
  return out
}
function mergeById(bArr, lArr, sArr) {
  const b = new Map((bArr || []).map(p => [p.id, p]))
  const s = new Map((sArr || []).map(p => [p.id, p]))
  const lIds = new Set((lArr || []).map(p => p.id))
  const out = []
  ;(lArr || []).forEach(lp => {
    // Présent dans l'ancêtre mais SUPPRIMÉ sur le serveur (par le manager) → on respecte
    // la suppression (on ne le garde pas). Sinon on fusionne ses champs.
    if (b.has(lp.id) && !s.has(lp.id)) return
    out.push(mergeObj(b.get(lp.id), lp, s.get(lp.id)))
  })
  ;(sArr || []).forEach(sp => {
    if (lIds.has(sp.id)) return
    // Présent serveur, absent en local : s'il était dans l'ancêtre → NOUS l'avons supprimé
    // → on ne le ré-ajoute pas. Sinon → ajouté par quelqu'un d'autre → on le garde.
    if (!b.has(sp.id)) out.push(sp)
  })
  return out
}
function mergeModule(b, l, s) {
  if (!s) return l
  if (!l) return s
  // Module à BONUS QUOTIDIEN (Élimination directe) : la remise à zéro des ballons change de jour
  // (elimDay). Avec une fusion par champ, un appareil resté sur la veille « ressusciterait » les
  // anciens ballons. Donc : le jour (elimDay) le plus récent fait foi pour les compteurs du jour,
  // et on UNIT l'historique des gains des deux côtés → l'argent déjà gagné n'est JAMAIS perdu.
  const daily = l.settings?.dailyBonus || s.settings?.dailyBonus || b?.settings?.dailyBonus
  if (daily && (l.elimDay || s.elimDay)) {
    const ld = l.elimDay || '', sd = s.elimDay || ''
    const histUnion = { ...(b?.elimHistory || {}), ...(s.elimHistory || {}), ...(l.elimHistory || {}) }
    if (ld !== sd) {
      const winner = ld > sd ? l : s          // jour le plus récent = compteurs du jour à jour (remis à zéro)
      return { ...winner, elimHistory: histUnion }
    }
    const out = mergeObj(b, l, s)
    out.players = mergeById(b?.players, l.players, s.players)
    out.settings = mergeObj(b?.settings, l.settings, s.settings)
    out.elimHistory = histUnion
    return out
  }
  const out = mergeObj(b, l, s)           // champs scalaires (name, type, result, settings…)
  out.players  = mergeById(b?.players,  l.players,  s.players)
  out.settings = mergeObj(b?.settings,  l.settings, s.settings)
  return out
}
export function mergeState(base, local, server) {
  const b = base || {}, l = local || {}, s = server || {}
  const bM = new Map((b.modules || []).map(m => [m.id, m]))
  const sM = new Map((s.modules || []).map(m => [m.id, m]))
  const seen = new Set()
  const modules = (l.modules || []).map(lm => { seen.add(lm.id); return mergeModule(bM.get(lm.id), lm, sM.get(lm.id)) })
  ;(s.modules || []).forEach(sm => { if (!seen.has(sm.id)) modules.push(sm) }) // module ajouté ailleurs
  const coaches = mergeById(b.coaches, l.coaches, s.coaches)
  // Pierres tombales : UNION des suppressions (local + serveur + base) → une suppression
  // faite n'importe où n'est JAMAIS perdue, et le joueur reste supprimé partout.
  const deleted = [...new Set([...(b.deleted || []), ...(l.deleted || []), ...(s.deleted || [])])]
  return { modules, coaches, deleted }
}

export default function App() {
  const APP_VERSION = 'v28 · Bonus prono compté en Poules' // repère visible : confirme que la dernière version est en ligne
  const saved = loadLocal()
  const freshStart = useRef(!saved) // aucun stockage local au lancement
  // Pierres tombales : liste des id de joueurs supprimés (ne réapparaissent jamais).
  const [deleted, setDeleted] = useState(() => saved?.deleted || [])
  const deletedRef = useRef(deleted)
  useEffect(() => { deletedRef.current = deleted }, [deleted])
  const [modules,    setModules]    = useState(() => reconcileModules(saved?.modules || [makeModule(1,'Préparation Mondiale'), makePronoModule(2)], saved?.deleted || []))
  const [coaches,    setCoaches]    = useState(() => saved?.coaches  || BASE_COACHES)
  const [activeMod,  setActiveMod]  = useState(() => saved?.activeMod || 1)
  const [tab,        setTab]        = useState('module')
  const [cdDismissed, setCdDismissed] = useState(false)
  const landedRef = useRef(false)
  const [selectedId, setSelectedId] = useState(null)
  const selectedIdRef = useRef(null)
  useEffect(() => { selectedIdRef.current = selectedId }, [selectedId])
  const [dashAuth,   setDashAuth]   = useState(false)
  // Connexion : qui utilise l'appli (null = page de connexion). NON persisté →
  // on revient toujours à la connexion au rechargement (anti-écrasement par session figée).
  const [currentUser, setCurrentUser] = useState(null)
  const currentUserRef = useRef(null)
  useEffect(() => { currentUserRef.current = currentUser }, [currentUser])
  const dashAuthRef = useRef(false)
  useEffect(() => { dashAuthRef.current = dashAuth }, [dashAuth])

  // ── Verrou d'édition (Option 2) : un SEUL éditeur à la fois ──────────────────
  // Un "jeton" stocké en ligne (challenge/editlock) désigne qui peut modifier.
  // Les autres sont en lecture seule. Le jeton se libère à la déconnexion ou après
  // 2 min d'inactivité (et expire seul au bout de 2 min en cas de fermeture brutale).
  const LOCK_TTL = 125000
  const [editLock, setEditLock] = useState(null) // { holderId, holderName, ts }
  const editLockRef = useRef(null)
  useEffect(() => { editLockRef.current = editLock }, [editLock])
  const lockFresh = (l) => !!(l && l.holderId && (Date.now() - (l.ts || 0) < LOCK_TTL))
  // En local (sans serveur) il n'y a qu'un appareil → on peut toujours éditer.
  const holdsLockRef = () => !isConfigured || !db || (editLockRef.current?.holderId === clientId.current && lockFresh(editLockRef.current))
  const lockDoc = () => doc(db, 'challenge', 'editlock')
  const lockName = () => (currentUserRef.current?.manager ? 'Manager' : (currentUserRef.current?.name || '?'))
  const acquireLock = useCallback(() => {
    if (!isConfigured || !db || !currentUserRef.current) return
    const l = { holderId: clientId.current, holderName: lockName(), ts: Date.now() }
    setEditLock(l) // optimiste : on se considère détenteur tout de suite (évite un clignotement)
    setDoc(lockDoc(), l).catch(() => {})
  }, [])
  const refreshLock = useCallback(() => {
    if (!isConfigured || !db) return
    if (editLockRef.current?.holderId === clientId.current)
      setDoc(lockDoc(), { holderId: clientId.current, holderName: lockName(), ts: Date.now() }).catch(() => {})
  }, [])
  const releaseLock = useCallback(() => {
    if (!isConfigured || !db) return
    if (editLockRef.current?.holderId === clientId.current)
      setDoc(lockDoc(), { holderId: '', holderName: '', ts: 0 }).catch(() => {})
  }, [])

  // Droit d'édition : il faut DÉTENIR le verrou ET (être Manager OU modifier ses propres points).
  const mayEdit = (id) => holdsLockRef() && (dashAuthRef.current || (currentUserRef.current && !currentUserRef.current.manager && currentUserRef.current.id === id))
  const canEditUI = (id) => dashAuth || (currentUser && !currentUser.manager && currentUser.id === id)

  // Déconnexion automatique : retour à la page de connexion après 2 min d'inactivité,
  // ou dès qu'on quitte/masque la page. Libère aussi le verrou d'édition.
  const logout = useCallback(() => { releaseLock(); setCurrentUser(null); setDashAuth(false); setSelectedId(null) }, [releaseLock])
  const idleTimer = useRef(null)
  const resetIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => logout(), 120000) // 2 minutes
  }, [logout])
  useEffect(() => {
    if (!currentUser) { if (idleTimer.current) clearTimeout(idleTimer.current); return }
    resetIdle()
    // À la connexion : on prend le jeton s'il est libre/périmé (sinon on reste en lecture seule).
    if (!lockFresh(editLockRef.current) || editLockRef.current?.holderId === clientId.current) acquireLock()
    const onAct = () => resetIdle()
    const evs = ['pointerdown', 'keydown', 'touchstart', 'scroll']
    evs.forEach(e => window.addEventListener(e, onAct, { passive: true }))
    // Battement de cœur : si on détient le jeton on le rafraîchit ; sinon, s'il est
    // libre/périmé, on le prend (on devient éditeur quand le précédent part).
    const hb = setInterval(() => {
      if (editLockRef.current?.holderId === clientId.current) refreshLock()
      else if (!lockFresh(editLockRef.current)) acquireLock()
    }, 20000)
    const onVis = () => { if (document.hidden) logout() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pagehide', logout)
    return () => {
      evs.forEach(e => window.removeEventListener(e, onAct))
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pagehide', logout)
      clearInterval(hb)
      if (idleTimer.current) clearTimeout(idleTimer.current)
    }
  }, [currentUser, resetIdle, logout, acquireLock, refreshLock])

  // Abonnement temps réel au jeton d'édition (qui modifie en ce moment).
  useEffect(() => {
    if (!isConfigured || !db) return
    const unsub = onSnapshot(lockDoc(), snap => setEditLock(snap.exists() ? snap.data() : null), () => {})
    return () => unsub()
  }, [])
  const [fbStatus,   setFbStatus]   = useState('connecting')
  const [fbError,    setFbError]    = useState('')
  // Synchro temps réel : ACTIVÉE par défaut pour que les points de chacun s'additionnent
  // (sinon le dernier qui enregistre écrase les points des autres). La navigation reste
  // locale à chaque personne, donc la synchro ne fait plus "sauter" l'écran.
  const [liveSync,   setLiveSync]   = useState(() => localStorage.getItem('fc2026_live') !== 'off')
  const liveSyncRef = useRef(liveSync)
  useEffect(() => { liveSyncRef.current = liveSync; try { localStorage.setItem('fc2026_live', liveSync ? 'on' : 'off') } catch {} }, [liveSync])
  const [goalBurst,  setGoalBurst]  = useState(null)
  const [gotRemote,  setGotRemote]  = useState(false) // vraies données reçues du serveur
  const [warnLocal,  setWarnLocal]  = useState(true)   // afficher l'avertissement mode local
  const [showRules,  setShowRules]  = useState(false)

  // ── REFS (évite les stale closures dans les callbacks) ─────────────────────
  const activeModRef = useRef(activeMod)
  useEffect(() => { activeModRef.current = activeMod }, [activeMod])
  const coachesRef = useRef(coaches)
  useEffect(() => { coachesRef.current = coaches }, [coaches])

  // Navigation INDÉPENDANTE et PERSISTANTE par appareil : chaque personne retrouve
  // l'onglet où elle était (sauvegardé en local) et n'est jamais déplacée par les autres.
  // Au tout premier passage seulement (après le coup d'envoi), on ouvre directement la
  // Phase de Poules ; ensuite on respecte toujours l'onglet enregistré.
  useEffect(() => {
    if (landedRef.current) return
    landedRef.current = true
    if (localStorage.getItem('fc2026_landed') === 'done') return
    localStorage.setItem('fc2026_landed', 'done')
    if (saved?.activeMod) return                       // l'utilisateur a déjà un onglet → on le respecte
    if (Date.now() < GROUP_PHASE_TS) return
    const poules = (modules || []).find(m => m.settings && m.settings.phase === 'poules')
    if (poules) { setActiveMod(poules.id); setTab('module') }
  }, [modules])
  const saveTimer = useRef(null)

  // Identité unique de CE client (pour ignorer nos propres échos Firebase)
  const clientId = useRef(Math.random().toString(36).slice(2) + Date.now().toString(36))
  // Horodatage de la dernière MODIFICATION LOCALE non encore confirmée par le serveur.
  // Tant qu'un snapshot entrant est plus ancien que ça, on NE l'applique PAS (sinon il
  // écraserait un ajout/suppression qu'on vient de faire et qui n'est pas encore écrit).
  const lastLocalEdit = useRef(saved?.updatedAt || 0)
  // Quand on applique un état distant, on ne veut pas le ré-écrire immédiatement.
  const applyingRemote = useRef(false)
  // Date du dernier état accepté (local ou distant) — pour comparer les snapshots.
  const lastAcceptedAt = useRef(saved?.updatedAt || 0)
  // Tant qu'on n'a pas reçu l'état du serveur, on N'ÉCRIT PAS sur Firebase
  // (sinon l'état par défaut écraserait les vraies données partagées).
  const hydrated = useRef(false)
  const savedTs = saved?.updatedAt || 0
  // Ancêtre commun (dernier état synchronisé) et dernier état serveur connu — pour la fusion 3-way.
  const baseRef = useRef(saved ? { modules: saved.modules, coaches: saved.coaches, deleted: saved.deleted || [] } : null)
  const serverRef = useRef(null)
  const mergeReflect = useRef(false)
  // Snapshot de l'état courant (pour pousser/réparer le serveur)
  const stateRef = useRef({ modules, coaches, activeMod, deleted })
  useEffect(() => { stateRef.current = { modules, coaches, activeMod, deleted } }, [modules, coaches, activeMod, deleted])

  // Fusionne notre état avec les éventuelles modifs concurrentes du serveur (anti-écrasement).
  const mergeForWrite = useCallback((m, c) => {
    if (baseRef.current && serverRef.current && !looksLikeBootstrap(serverRef.current) &&
        _diff(serverRef.current.modules, baseRef.current.modules)) {
      const merged = mergeState(baseRef.current, { modules: m, coaches: c, deleted: deletedRef.current }, serverRef.current)
      if (_diff(merged.deleted || [], deletedRef.current || [])) setDeleted(merged.deleted)
      return { modules: reconcileModules(merged.modules, merged.deleted), coaches: merged.coaches, deleted: merged.deleted }
    }
    return { modules: m, coaches: c, deleted: deletedRef.current }
  }, [])

  // Écrit immédiatement l'état courant sur Firebase (réparation / restauration), avec horodatage neuf
  const forcePush = useCallback(() => {
    const { modules: m0, coaches: c0, activeMod: am } = stateRef.current
    // Sécurité : si NOTRE état ressemble aux données par défaut alors que le serveur a de
    // vraies données, on ne pousse RIEN (on n'écrase jamais les vraies données par du vide).
    if (looksLikeBootstrap({ modules: m0, coaches: c0 }) && serverRef.current && !looksLikeBootstrap(serverRef.current)) return
    const { modules: m, coaches: c } = mergeForWrite(m0, c0)
    if (_diff(m, m0)) { mergeReflect.current = true; setModules(m) }
    if (_diff(c, c0)) { setCoaches(c) }
    // baseRef n'avance QUE sur confirmation serveur (echo) — jamais de façon optimiste.
    const now = Date.now()
    lastLocalEdit.current = now
    lastAcceptedAt.current = now
    const data = { modules: m, coaches: c, deleted: deletedRef.current, activeMod: am, updatedAt: now, clientId: clientId.current }
    saveLocal(data)
    if (isConfigured && db) {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      setDoc(doc(db, 'challenge', 'state'), data).catch(e => { setFbError(e.code || ''); setFbStatus('offline') })
    }
  }, [mergeForWrite])

  // Sauvegarde : télécharge un fichier JSON de toutes les données
  const exportData = useCallback(() => {
    const { modules: m, coaches: c, activeMod: am, deleted: dl } = stateRef.current
    const blob = new Blob([JSON.stringify({ modules: m, coaches: c, deleted: dl, activeMod: am, updatedAt: Date.now() }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `care-challenges-sauvegarde-${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }, [])

  // Restauration : recharge depuis un objet importé puis pousse sur le serveur (gagne sur tout)
  const importData = useCallback((obj) => {
    if (!obj || !Array.isArray(obj.modules)) return false
    let mods = obj.modules
    // Garantir la présence de la 2ème partie (Phase de poules) même si la sauvegarde est ancienne
    if (!mods.some(m => m.settings?.phase === 'poules')) {
      const roster = buildRoster(mods, Array.isArray(obj.deleted) ? obj.deleted : [])
      const players = roster.size
        ? [...roster.values()].map(r => ({ id:r.id, name:r.name, color:r.color, x:r.x ?? 50, y:r.y ?? 50, goals:0, extraSlots:0 }))
        : []
      mods = [...mods, { id: uniqueId(), name:'2ème Partie', type:'forfaits', players, settings:{ ...PART2_SETTINGS } }]
    }
    const dl = Array.isArray(obj.deleted) ? obj.deleted : []
    if (dl.length) setDeleted(dl)
    setModules(reconcileModules(mods, dl))
    if (obj.coaches) setCoaches(obj.coaches)
    if (obj.activeMod) setActiveMod(obj.activeMod)
    setGotRemote(true)
    setTimeout(() => forcePush(), 80) // horodatage neuf → restauration prioritaire partout
    return true
  }, [forcePush])

  // ── Firebase ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isConfigured || !db) { setFbStatus('offline'); return }
    // Filet de sécurité : si le serveur ne répond pas, on bascule SEULEMENT l'indicateur
    // sur "hors-ligne". On n'autorise SURTOUT PAS l'écriture distante tant qu'on n'a pas
    // lu l'état du serveur au moins une fois — sinon un nouvel appareil (mémoire vide)
    // écraserait les données de tout le monde avec du vide à sa connexion.
    const fallback = setTimeout(() => { if (!hydrated.current) setFbStatus('offline') }, 6000)
    const unsub = onSnapshot(doc(db, 'challenge', 'state'),
      snap => {
        setFbStatus('ok')
        clearTimeout(fallback)
        if (!snap.exists()) {
          hydrated.current = true
          if (savedTs > 0) forcePush() // serveur vide → on y restaure nos données locales
          return
        }
        const d = snap.data()
        // On mémorise TOUJOURS le dernier état serveur connu (même si on ne l'applique
        // pas à l'écran) pour pouvoir fusionner sans rien écraser au moment d'écrire.
        serverRef.current = { modules: d.modules, coaches: d.coaches, deleted: d.deleted || [] }

        // 1) Notre propre écriture qui revient → on ignore (et le serveur = notre nouvel ancêtre).
        if (d.clientId && d.clientId === clientId.current) {
          baseRef.current = { modules: d.modules, coaches: d.coaches, deleted: d.deleted || [] }
          lastAcceptedAt.current = d.updatedAt || lastAcceptedAt.current
          if ((d.updatedAt || 0) >= lastLocalEdit.current) lastLocalEdit.current = 0
          hydrated.current = true
          return
        }

        const ts = d.updatedAt || 0
        // 2) Notre état LOCAL est plus récent (ou égal) → on garde le local et on RÉPARE le serveur.
        if (ts <= lastAcceptedAt.current) {
          hydrated.current = true
          forcePush()
          return
        }

        // 2bis) RÉCUPÉRATION : le serveur a été RÉINITIALISÉ (données par défaut / vidées) par
        //       erreur, mais NOUS avons les vraies données → on restaure le serveur au lieu
        //       d'adopter le vide. (Un appareil sain répare automatiquement tout le monde.)
        if (looksLikeBootstrap({ modules: d.modules, coaches: d.coaches }) &&
            !looksLikeBootstrap(stateRef.current)) {
          hydrated.current = true
          forcePush()
          return
        }

        // 3) Le serveur a du nouveau.
        // 3a) PREMIER état serveur (pas encore hydraté) → on l'adopte tel quel.
        if (!hydrated.current) {
          // Pierres tombales : on UNIT nos suppressions locales avec celles du serveur.
          const dl = [...new Set([...(deletedRef.current || []), ...((d.deleted) || [])])]
          if (_diff(dl, deletedRef.current || [])) setDeleted(dl)
          applyingRemote.current = true
          if (saveTimer.current) clearTimeout(saveTimer.current)
          const reconciled0 = d.modules ? reconcileModules(d.modules, dl) : null
          if (reconciled0) setModules(reconciled0)
          if (d.coaches) setCoaches(d.coaches)
          baseRef.current = { modules: reconciled0 || d.modules, coaches: d.coaches, deleted: dl }
          setGotRemote(true); lastAcceptedAt.current = ts; hydrated.current = true
          // Si une pierre tombale a retiré un joueur encore présent côté serveur (repoussé par un
          // autre appareil / ancienne version) → on CORRIGE immédiatement le serveur.
          if (reconciled0 && _diff(reconciled0, reconcileModules(d.modules, []))) {
            const now = Date.now(); lastLocalEdit.current = now; lastAcceptedAt.current = now
            const data = { modules: reconciled0, coaches: d.coaches, deleted: dl, activeMod: stateRef.current.activeMod, updatedAt: now, clientId: clientId.current }
            saveLocal(data)
            if (isConfigured && db) setDoc(doc(db, 'challenge', 'state'), data).catch(() => {})
          }
          return
        }
        // 3b) Synchro live OFF ou fiche joueur ouverte → on garde l'écran stable.
        //     (Aucune perte : la fusion à l'écriture combinera nos ajouts au moment de sauvegarder.)
        if (!liveSyncRef.current) return
        if (selectedIdRef.current != null) return
        // 3c) FUSION À LA LECTURE : on combine l'état serveur avec NOS ajouts locaux pas encore
        //     sauvegardés (délai de sauvegarde). On ne perd ainsi JAMAIS un forfait en cours.
        const localNow = stateRef.current
        const merged = mergeState(baseRef.current, localNow, { modules: d.modules, coaches: d.coaches, deleted: d.deleted || [] })
        if (_diff(merged.deleted || [], deletedRef.current || [])) setDeleted(merged.deleted)
        const reconciled = reconcileModules(merged.modules, merged.deleted)
        const haveLocalEdits = _diff(reconciled, reconcileModules(d.modules, d.deleted || [])) || _diff(merged.coaches || [], d.coaches || [])
        applyingRemote.current = true
        if (saveTimer.current) clearTimeout(saveTimer.current)
        setModules(reconciled)
        setCoaches(merged.coaches || [])
        // baseRef n'avance QUE sur confirmation serveur (echo) — pas ici.
        setGotRemote(true)
        lastAcceptedAt.current = ts
        hydrated.current = true
        if (haveLocalEdits) {
          // Nos ajouts/suppressions n'étaient pas encore sur le serveur → on POUSSE le résultat fusionné.
          const now = Date.now()
          lastLocalEdit.current = now; lastAcceptedAt.current = now
          const data = { modules: reconciled, coaches: merged.coaches || [], deleted: merged.deleted || [], activeMod: stateRef.current.activeMod, updatedAt: now, clientId: clientId.current }
          saveLocal(data)
          setDoc(doc(db,'challenge','state'), data).catch(e => { setFbError(e.code||''); setFbStatus('offline') })
        }
      },
      err => { console.warn('[FB]', err.code, err.message); setFbError(err.code || err.message || ''); setFbStatus('offline') }
    )
    return () => { clearTimeout(fallback); unsub() }
  }, [])

  const persist = useCallback((m, c, am) => {
    // Ré-entrée provoquée par notre propre fusion → ne rien faire (l'écriture est déjà programmée).
    if (mergeReflect.current) { mergeReflect.current = false; return }
    // Ne pas ré-écrire l'état qu'on vient juste de recevoir du serveur.
    if (applyingRemote.current) {
      applyingRemote.current = false
      if (saveTimer.current) clearTimeout(saveTimer.current)
      return
    }

    // Fusion 3-way avant écriture : si un autre appareil a modifié le serveur entre-temps,
    // on combine au lieu d'écraser (on ne perd ni nos ajouts, ni les leurs).
    let outM = m, outC = c
    if (hydrated.current) {
      const merged = mergeForWrite(m, c)
      outM = merged.modules; outC = merged.coaches
      if (_diff(outM, m)) { mergeReflect.current = true; setModules(outM) }
      if (_diff(outC, c)) { mergeReflect.current = true; setCoaches(outC) }
    }

    const now = Date.now()
    const data = { modules: outM, coaches: outC, deleted: deletedRef.current || [], activeMod: am, updatedAt: now, clientId: clientId.current }
    // baseRef n'avance QUE sur confirmation serveur (echo) — pas de façon optimiste,
    // sinon la fusion suivante croirait que notre ajout fait déjà partie de la base et le perdrait.
    saveLocal(data) // localStorage : toujours (sauvegarde locale immédiate)

    // Firebase : seulement après avoir reçu l'état serveur (évite d'écraser les vraies données)
    if (isConfigured && db && hydrated.current) {
      // Ne jamais écrire des données par défaut/vides par-dessus de vraies données serveur.
      if (looksLikeBootstrap({ modules: outM, coaches: outC }) && serverRef.current && !looksLikeBootstrap(serverRef.current)) return
      lastLocalEdit.current = now
      lastAcceptedAt.current = now
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        setDoc(doc(db,'challenge','state'), data).catch(e => { console.warn('[FB write]',e); setFbError(e.code || e.message || ''); setFbStatus('offline') })
      }, 400)
    }
  }, [mergeForWrite])

  useEffect(() => { persist(modules, coaches, activeMod) }, [modules, coaches, activeMod, deleted, persist])

  // Création AUTOMATIQUE de la 2ème partie (Phase de poules), une seule fois, après synchro
  const p2Done = useRef(false)
  useEffect(() => {
    if (p2Done.current) return
    // attendre d'avoir l'état réel (serveur si en ligne, sinon local)
    if (isConfigured && db && !hydrated.current && fbStatus === 'connecting') return
    const hasPart2 = modules.some(m => m.settings?.phase === 'poules')
    if (hasPart2 || localStorage.getItem('fc2026_p2') === 'done') { p2Done.current = true; return }
    p2Done.current = true
    localStorage.setItem('fc2026_p2', 'done')
    const nid = uniqueId()
    setModules(prev => {
      if (prev.some(m => m.settings?.phase === 'poules')) return prev
      const players = playersFromRoster(prev, 'forfaits') // lignes à 0, terrain vierge
      return [...prev, { id: nid, name: '2ème Partie', type: 'forfaits', players, settings: { ...PART2_SETTINGS } }]
    })
  }, [modules, fbStatus])

  // Création AUTOMATIQUE du pronostic France–Sénégal (phase de groupe → alimente la Phase de Poules)
  const senDone = useRef(false)
  useEffect(() => {
    if (senDone.current) return
    // On attend d'avoir LU le serveur (sinon on risquerait un doublon avant la synchro).
    if (isConfigured && db && !hydrated.current) return
    const hasSen = modules.some(m => m.type === 'pronostic' && m.settings?.awayCode === 'SEN')
    if (hasSen) { senDone.current = true; return } // déjà présent → rien à faire
    if (!modules.some(m => m.settings?.phase === 'poules')) return // attend la Phase de Poules
    senDone.current = true
    localStorage.setItem('fc2026_sen', 'done')
    const nid = uniqueId()
    setModules(prev => {
      if (prev.some(m => m.type === 'pronostic' && m.settings?.awayCode === 'SEN')) return prev
      const players = playersFromRoster(prev, 'pronostic')
      return [...prev, { id: nid, name: 'France - Sénégal', type: 'pronostic', players, coachData: {}, settings: { ...SENEGAL_SETTINGS } }]
    })
  }, [modules, fbStatus])

  // Création AUTOMATIQUE du pronostic France–Irak (phase de groupe → alimente la Phase de Poules).
  // AUTO-RÉPARANT : si le module a disparu côté serveur, il est RECRÉÉ (après lecture du serveur).
  const irakDone = useRef(false)
  useEffect(() => {
    if (irakDone.current) return
    if (isConfigured && db && !hydrated.current) return // attend la lecture serveur (anti-doublon)
    const hasIrak = modules.some(m => m.type === 'pronostic' && m.settings?.awayCode === 'IRQ')
    if (hasIrak) { irakDone.current = true; return } // déjà présent → rien à faire
    if (!modules.some(m => m.settings?.phase === 'poules')) return // attend la Phase de Poules
    irakDone.current = true
    localStorage.setItem('fc2026_irak', 'done')
    const nid = uniqueId()
    setModules(prev => {
      if (prev.some(m => m.type === 'pronostic' && m.settings?.awayCode === 'IRQ')) return prev
      const players = playersFromRoster(prev, 'pronostic')
      return [...prev, { id: nid, name: 'France - Irak', type: 'pronostic', players, coachData: {}, settings: { ...IRAK_SETTINGS } }]
    })
  }, [modules, fbStatus])

  // Création AUTOMATIQUE du pronostic France–Norvège (phase de groupe → alimente la Phase de Poules).
  // AUTO-RÉPARANT : recréé s'il a disparu (après lecture du serveur). Détecté par l'équipe (NOR).
  const norDone = useRef(false)
  useEffect(() => {
    if (norDone.current) return
    if (isConfigured && db && !hydrated.current) return // attend la lecture serveur (anti-doublon)
    const hasNor = modules.some(m => m.type === 'pronostic' && m.settings?.awayCode === 'NOR')
    if (hasNor) { norDone.current = true; return }
    if (!modules.some(m => m.settings?.phase === 'poules')) return // attend la Phase de Poules
    norDone.current = true
    localStorage.setItem('fc2026_nor', 'done')
    const nid = uniqueId()
    setModules(prev => {
      if (prev.some(m => m.type === 'pronostic' && m.settings?.awayCode === 'NOR')) return prev
      const players = playersFromRoster(prev, 'pronostic')
      return [...prev, { id: nid, name: 'France - Norvège', type: 'pronostic', players, coachData: {}, settings: { ...NORVEGE_SETTINGS } }]
    })
  }, [modules, fbStatus])

  // France – Suède · 16ᵉ de finale. AUTO-RÉPARANT : créée si absente (après la Phase de Poules).
  const sweDone = useRef(false)
  useEffect(() => {
    if (sweDone.current) return
    if (isConfigured && db && !hydrated.current) return
    if (modules.some(m => m.type === 'pronostic' && m.settings?.awayCode === 'SWE')) { sweDone.current = true; return }
    if (!modules.some(m => m.settings?.phase === 'poules')) return
    sweDone.current = true
    localStorage.setItem('fc2026_swe', 'done')
    const nid = uniqueId()
    setModules(prev => {
      if (prev.some(m => m.type === 'pronostic' && m.settings?.awayCode === 'SWE')) return prev
      const players = playersFromRoster(prev, 'pronostic')
      return [...prev, { id: nid, name: 'France - Suède', type: 'pronostic', players, coachData: {}, settings: { ...SUEDE_SETTINGS } }]
    })
  }, [modules, fbStatus])

  // Tableau de la compétition (bracket). AUTO-RÉPARANT : créé si absent.
  const bracketDone = useRef(false)
  useEffect(() => {
    if (bracketDone.current) return
    if (isConfigured && db && !hydrated.current) return
    if (modules.some(m => m.type === 'bracket')) { bracketDone.current = true; return }
    if (!modules.some(m => m.settings?.phase === 'poules')) return
    bracketDone.current = true
    const nid = uniqueId()
    setModules(prev => {
      if (prev.some(m => m.type === 'bracket')) return prev
      return [...prev, { id: nid, name: 'Tableau', type: 'bracket', winners: {} }]
    })
  }, [modules, fbStatus])

  // Désigner le vainqueur d'un match du Tableau (Manager) → il avance au tour suivant.
  const setBracketWinner = useCallback((round, idx, teamId) => {
    if (!dashAuthRef.current) return
    setModules(prev => prev.map(m => m.type === 'bracket'
      ? { ...m, winners: bracketSetWinner(m.winners || {}, round, idx, teamId) }
      : m))
  }, [])

  // Élimination directe (mêmes règles que la phase de poule). AUTO-RÉPARANT : créée si absente.
  const elimDone = useRef(false)
  const isElim = (m) => m.settings?.phase === 'elim' ||
    (m.type !== 'pronostic' && (m.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes('elimination directe'))
  useEffect(() => {
    if (elimDone.current) return
    if (isConfigured && db && !hydrated.current) return // attend la lecture serveur (anti-doublon)
    if (modules.some(isElim)) { elimDone.current = true; return } // déjà présent (créé à la main ou ailleurs)
    if (!modules.some(m => m.settings?.phase === 'poules')) return // attend la Phase de Poules
    elimDone.current = true
    localStorage.setItem('fc2026_elim', 'done')
    const nid = uniqueId()
    setModules(prev => {
      if (prev.some(isElim)) return prev
      const players = playersFromRoster(prev, 'forfaits')
      return [...prev, { id: nid, name: 'Élimination directe', type: 'forfaits', players, settings: { ...ELIM_SETTINGS } }]
    })
  }, [modules, fbStatus])

  // Migration unique : les forfaits des coachs étaient GLOBAUX (mêmes sur toutes les parties).
  // On les déplace dans le coachData de la partie Préparation (pour ne rien perdre), puis on
  // remet le compteur global à zéro → désormais chaque évènement a son propre compteur (zéro au départ).
  const coachMigDone = useRef(false)
  useEffect(() => {
    if (coachMigDone.current) return
    if (isConfigured && db && !hydrated.current) return
    if (!coaches.some(c => (c.goals || 0) > 0 || (c.extraSlots || 0) > 0)) { coachMigDone.current = true; return }
    const canon = modules.find(m => (m.type || 'forfaits') === 'forfaits')
    if (!canon) return
    coachMigDone.current = true
    setModules(prev => prev.map(m => {
      if (m.id !== canon.id) return m
      const cd = { ...(m.coachData || {}) }
      coaches.forEach(c => {
        const g = c.goals || 0, e = c.extraSlots || 0
        if (g > 0 || e > 0) cd[c.id] = { ...(cd[c.id] || {}), goals: (cd[c.id]?.goals || 0) + g, extraSlots: (cd[c.id]?.extraSlots || 0) + e }
      })
      return { ...m, coachData: cd }
    }))
    setCoaches(prev => prev.map(c => ({ ...c, goals: 0, extraSlots: 0 })))
  }, [modules, coaches, fbStatus])

  // ── ÉLIMINATION DIRECTE : remise à zéro QUOTIDIENNE des ballons à minuit ──
  // À chaque changement de jour, on FIGE les gains de la journée écoulée (50€ au 1er à 3 ballons,
  // 30€ aux 4 suivants à ≥2 ballons, rien si personne n'a fait 3) dans elimHistory, puis on remet
  // les ballons à zéro. Les gains cumulés sont conservés. Tourne jusqu'au 09 juillet.
  useEffect(() => {
    const tick = () => {
      const today = dayKeyOf()
      setModules(prev => {
        let changed = false
        const next = prev.map(m => {
          if (!m.settings?.dailyBonus) return m
          // 1ère initialisation : on démarre la journée à zéro proprement.
          if (!m.elimDay) {
            changed = true
            const players = (m.players || []).map(p => ({ ...p, goals: 0, reach2At: null, reach3At: null }))
            const coachData = {}
            Object.entries(m.coachData || {}).forEach(([id, d]) => { coachData[id] = { ...d, goals: 0, reach2At: null, reach3At: null } })
            return { ...m, players, coachData, elimDay: today, elimHistory: m.elimHistory || {} }
          }
          if (m.elimDay === today) return m
          // Changement de jour → on fige la journée écoulée puis remise à zéro.
          changed = true
          const within = m.elimDay >= (m.settings.startDate || '0000') && m.elimDay <= (m.settings.endDate || '9999')
          const cPeople = coachesRef.current.map(c => ({ id: c.id, goals: m.coachData?.[c.id]?.goals || 0, reach2At: m.coachData?.[c.id]?.reach2At, reach3At: m.coachData?.[c.id]?.reach3At }))
          const people = [...(m.players || []).map(p => ({ id: p.id, goals: p.goals || 0, reach2At: p.reach2At, reach3At: p.reach3At })), ...cPeople]
          const hist = { ...(m.elimHistory || {}) }
          if (within && !hist[m.elimDay]) hist[m.elimDay] = computeElimDailyBonus(people, m.settings)
          const players = (m.players || []).map(p => ({ ...p, goals: 0, reach2At: null, reach3At: null }))
          const coachData = {}
          Object.entries(m.coachData || {}).forEach(([id, d]) => { coachData[id] = { ...d, goals: 0, reach2At: null, reach3At: null } })
          return { ...m, players, coachData, elimDay: today, elimHistory: hist }
        })
        return changed ? next : prev
      })
    }
    tick()
    const iv = setInterval(tick, 60000)
    return () => clearInterval(iv)
  }, [modules.length, fbStatus])

  const activeModule  = modules.find(m => m.id === activeMod) || modules[0]
  const modPlayers    = activeModule?.players || []
  const modSettings   = activeModule?.settings || DEFAULT_SETTINGS
  const isProno       = activeModule?.type === 'pronostic'
  const isBracket     = activeModule?.type === 'bracket'
  // Coachs avec leur compteur PROPRE à ce module (stocké dans coachData) → ils repartent
  // à zéro sur chaque évènement, exactement comme les joueurs.
  const coachesForModule = (mod) => coaches.map(c => {
    const cd = mod?.coachData?.[c.id] || {}
    return { ...c,
      goals: cd.goals || 0, extraSlots: cd.extraSlots || 0,
      franceScore: cd.franceScore ?? '', irelandScore: cd.irelandScore ?? '',
      pronos: cd.pronos || 0, validatedPronos: cd.validatedPronos || 0, pronoStatus: cd.pronoStatus,
    }
  })
  const activeCoaches = coachesForModule(activeModule)
  const allPeople     = [...modPlayers, ...activeCoaches]
  const totalGoals    = isProno ? 0 : allPeople.reduce((s,p) => s+(p.goals||0), 0)
  const currentTier   = getCurrentTier(totalGoals, modSettings)
  const tierRate      = getTierRate(totalGoals, modSettings)
  // Nombre de pronostics validés par joueur (valorise ces ballons à 20€).
  // Chaque pronostic alimente SON classement : France–Sénégal → Phase de Poules,
  // France–Irlande → Préparation Mondiale. On ne mélange donc pas les deux.
  const validatedById = useMemo(() => {
    const map = {}
    const activeIsPoules = isGroupModule(activeModule)
    const feedsThis = m => { const f = m.settings?.feeds; if (f === 'none') return false; return activeIsPoules ? f === 'poules' : f !== 'poules' }
    modules.forEach(m => {
      if (m.type !== 'pronostic' || !feedsThis(m)) return
      ;(m.players || []).forEach(p => { map[p.id] = (map[p.id] || 0) + (p.validatedPronos || 0) })
      if (m.coachData) Object.entries(m.coachData).forEach(([id, d]) => { map[id] = (map[id] || 0) + (d?.validatedPronos || 0) })
    })
    // Pronostic historique France–Irlande (coachs en global, sans coachData) → groupe Préparation
    if (!activeIsPoules) coaches.forEach(c => { if (c.validatedPronos) map[c.id] = (map[c.id] || 0) + (c.validatedPronos || 0) })
    return map
  }, [modules, coaches, activeModule])

  // Valeur € des ballons validés par joueur (taux PROPRE à chaque pronostic, ex. France–Irak 25€).
  const validatedValueById = useMemo(() => {
    const map = {}
    const activeIsPoules = isGroupModule(activeModule)
    const feedsThis = m => { const f = m.settings?.feeds; if (f === 'none') return false; return activeIsPoules ? f === 'poules' : f !== 'poules' }
    modules.forEach(m => {
      if (m.type !== 'pronostic' || !feedsThis(m)) return
      const val = m.settings?.pronoBonus || PRONO_BONUS
      ;(m.players || []).forEach(p => { map[p.id] = (map[p.id] || 0) + (p.validatedPronos || 0) * val })
      if (m.coachData) Object.entries(m.coachData).forEach(([id, d]) => { map[id] = (map[id] || 0) + (d?.validatedPronos || 0) * val })
    })
    if (!activeIsPoules) coaches.forEach(c => { if (c.validatedPronos) map[c.id] = (map[c.id] || 0) + (c.validatedPronos || 0) * PRONO_BONUS })
    return map
  }, [modules, coaches, activeModule])

  // ── Helpers d'update robustes (utilise ref, pas closure) ──────────────────
  // Met à jour les joueurs du MODULE ACTIF
  const setActivePlayers = useCallback((updater) => {
    setModules(prev => prev.map(m =>
      m.id === activeModRef.current ? { ...m, players: updater(m.players) } : m
    ))
  }, []) // pas de dépendances → stable, utilise le ref

  // Met à jour les settings du module actif
  const setActiveSettings = useCallback((updates) => {
    setModules(prev => prev.map(m =>
      m.id === activeModRef.current ? { ...m, settings: { ...m.settings, ...updates } } : m
    ))
  }, [])

  // ── Actions joueurs ───────────────────────────────────────────────────────
  // Champs d'IDENTITÉ : synchronisés sur TOUTES les parties + coaches.
  // Les autres champs (positions, pronostics…) restent propres à la partie active.
  const GLOBAL_FIELDS = ['name', 'color']
  const updatePerson = useCallback((id, updates) => {
    const keys = Object.keys(updates)
    const isGlobal = keys.length > 0 && keys.every(k => GLOBAL_FIELDS.includes(k))
    // Nom/couleur = réservé au Manager ; le reste (points, pronostics) = soi-même ou Manager.
    if (isGlobal ? !dashAuthRef.current : !mayEdit(id)) return
    if (isGlobal) {
      // nom / couleur → toutes les parties
      setModules(prev => prev.map(m => ({
        ...m, players: m.players.map(p => p.id === id ? { ...p, ...updates } : p),
      })))
      setCoaches(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
      return
    }
    // Donnée par-module d'un COACH (forfaits OU pronostic) → coachData du module actif,
    // pour que chaque évènement ait son propre compteur (zéro au départ), comme les joueurs.
    const isCoachId = stateRef.current.coaches.some(c => c.id === id)
    if (isCoachId) {
      setModules(prev => prev.map(m => {
        if (m.id !== activeModRef.current) return m
        const cd = { ...(m.coachData || {}) }
        cd[id] = { ...(cd[id] || {}), ...updates }
        return { ...m, coachData: cd }
      }))
      return
    }
    // données par-partie d'un joueur → uniquement la partie active
    setActivePlayers(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
  }, [setActivePlayers])

  // Incrémente/décrémente une valeur par-module d'un coach dans son coachData.
  const bumpCoach = (id, field, delta, floor0) => {
    setModules(prev => prev.map(m => {
      if (m.id !== activeModRef.current) return m
      const cd = { ...(m.coachData || {}) }
      const cur = (cd[id]?.[field]) || 0
      if (floor0 && cur + delta < 0) return m
      cd[id] = { ...(cd[id] || {}), [field]: cur + delta }
      return { ...m, coachData: cd }
    }))
  }

  const addGoal = useCallback((id, coords) => {
    if (!mayEdit(id)) return
    const active = stateRef.current.modules.find(m => m.id === activeModRef.current)
    const daily = !!active?.settings?.dailyBonus
    const now = Date.now()
    const stamp = (cur, ng) => {
      const u = {}
      if (daily) { if (ng >= 2 && !cur.reach2At) u.reach2At = now; if (ng >= 3 && !cur.reach3At) u.reach3At = now }
      return u
    }
    if (coachesRef.current.some(c => c.id === id)) {
      setModules(prev => prev.map(m => {
        if (m.id !== activeModRef.current) return m
        const cd = { ...(m.coachData || {}) }; const cur = cd[id] || {}; const ng = (cur.goals || 0) + 1
        cd[id] = { ...cur, goals: ng, ...stamp(cur, ng) }
        return { ...m, coachData: cd }
      }))
    } else {
      setActivePlayers(prev => prev.map(p => { if (p.id !== id) return p; const ng = (p.goals || 0) + 1; return { ...p, goals: ng, ...stamp(p, ng) } }))
    }
    if (coords) {
      setGoalBurst({ x: coords.x, y: coords.y, id: Date.now() })
      setTimeout(() => setGoalBurst(null), 700)
    }
  }, [setActivePlayers])

  const removeGoal = useCallback((id) => {
    if (!mayEdit(id)) return
    const active = stateRef.current.modules.find(m => m.id === activeModRef.current)
    const daily = !!active?.settings?.dailyBonus
    const unstamp = (ng) => {
      const u = {}
      if (daily) { if (ng < 3) u.reach3At = null; if (ng < 2) u.reach2At = null }
      return u
    }
    if (coachesRef.current.some(c => c.id === id)) {
      setModules(prev => prev.map(m => {
        if (m.id !== activeModRef.current) return m
        const cd = { ...(m.coachData || {}) }; const cur = cd[id] || {}
        if ((cur.goals || 0) <= 0) return m
        const ng = cur.goals - 1
        cd[id] = { ...cur, goals: ng, ...unstamp(ng) }
        return { ...m, coachData: cd }
      }))
    } else {
      setActivePlayers(prev => prev.map(p => { if (p.id !== id || (p.goals || 0) <= 0) return p; const ng = p.goals - 1; return { ...p, goals: ng, ...unstamp(ng) } }))
    }
  }, [setActivePlayers])

  // Tout retirer à un joueur (remet ses ballons à 0 d'un coup) — pratique pour corriger.
  const clearGoals = useCallback((id) => {
    if (!mayEdit(id)) return
    if (coachesRef.current.some(c => c.id === id)) {
      setModules(prev => prev.map(m => {
        if (m.id !== activeModRef.current) return m
        const cd = { ...(m.coachData || {}) }
        if (cd[id]) cd[id] = { ...cd[id], goals: 0, reach2At: null, reach3At: null }
        return { ...m, coachData: cd }
      }))
    } else {
      setActivePlayers(prev => prev.map(p => p.id === id ? { ...p, goals: 0, reach2At: null, reach3At: null } : p))
    }
  }, [setActivePlayers])

  const addSlot = useCallback((id) => {
    if (!mayEdit(id)) return
    if (coachesRef.current.some(c => c.id === id)) bumpCoach(id, 'extraSlots', +1)
    else setActivePlayers(prev => prev.map(p => p.id === id ? { ...p, extraSlots: (p.extraSlots||0)+1 } : p))
  }, [setActivePlayers])

  // Ajoute le MÊME joueur (même id, nom, couleur) à TOUTES les parties
  const addPlayer = useCallback(() => {
    const COLORS = ['#e74c3c','#3498db','#2ecc71','#e67e22','#9b59b6','#1abc9c','#e91e8c','#ff9800','#00bcd4','#f1c40f']
    const nid = uniqueId()
    setModules(prev => {
      const canonical = prev.find(m => m.id === activeModRef.current) || prev[0]
      const count = canonical?.players.length || 0
      const name = `Joueur ${count + 1}`
      const color = COLORS[count % COLORS.length]
      const x = 40 + Math.random() * 20, y = 40 + Math.random() * 20
      return prev.map(m => {
        if (m.players.some(p => p.id === nid)) return m
        return { ...m, players: [...m.players, { id: nid, name, color, x, y, ...baseFor(m.type) }] }
      })
    })
  }, [])

  // Retire le joueur de TOUTES les parties
  const removePlayer = useCallback((id) => {
    if (!dashAuthRef.current) return // suppression réservée au Manager
    // Pierre tombale : on enregistre l'id supprimé pour qu'il ne réapparaisse JAMAIS,
    // même si un autre appareil (ou une ancienne version) le repousse.
    setDeleted(prev => prev.includes(id) ? prev : [...prev, id])
    setModules(prev => prev.map(m => ({
      ...m,
      players: m.players.filter(p => p.id !== id),
      coachData: m.coachData ? Object.fromEntries(Object.entries(m.coachData).filter(([k]) => k !== String(id))) : m.coachData,
    })))
    setCoaches(prev => prev.filter(p => p.id !== id))
    setSelectedId(sel => sel === id ? null : sel)
  }, [])

  // ── Pronostics ──────────────────────────────────────────────────────────────
  // Ajouter un ballon dans Bon Pronostiqueur = +1 pronostic ET +1 ballon (forfait) en 1ère Partie
  // Module forfait cible d'un pronostic : France–Sénégal → Phase de Poules, sinon Préparation.
  const targetForfaitModule = (prev, pronoModule) => {
    const f = pronoModule?.settings?.feeds
    if (f === 'none') return null
    if (f === 'poules') return prev.find(m => m.settings?.phase === 'poules')
    return prev.find(m => (m.type || 'forfaits') === 'forfaits') || prev[0]
  }

  const addPronoBall = useCallback((id) => {
    if (!mayEdit(id)) return
    setModules(prev => {
      const active = prev.find(m => m.id === activeModRef.current)
      const target = targetForfaitModule(prev, active)
      const coachMode = active && active.coachData !== undefined
      return prev.map(m => {
        let mm = m
        if (m.id === activeModRef.current) {
          if (coachMode && stateRef.current.coaches.some(c => c.id === id)) {
            const cd = { ...(mm.coachData || {}) }
            const cur = cd[id] || {}
            cd[id] = { ...cur, pronos: (cur.pronos || 0) + 1 }
            mm = { ...mm, coachData: cd }
          } else {
            mm = { ...mm, players: mm.players.map(p => p.id === id ? { ...p, pronos: (p.pronos || 0) + 1 } : p) }
          }
        }
        if (target && m.id === target.id) { // +1 forfait dans le classement alimenté
          if (stateRef.current.coaches.some(c => c.id === id)) {
            const cd = { ...(mm.coachData || {}) }
            cd[id] = { ...(cd[id] || {}), goals: (cd[id]?.goals || 0) + 1 }
            mm = { ...mm, coachData: cd }
          } else {
            mm = { ...mm, players: mm.players.map(p => p.id === id ? { ...p, goals: (p.goals || 0) + 1 } : p) }
          }
        }
        return mm
      })
    })
  }, [])

  const removePronoBall = useCallback((id) => {
    if (!mayEdit(id)) return
    setModules(prev => {
      const active = prev.find(m => m.id === activeModRef.current)
      const target = targetForfaitModule(prev, active)
      const coachMode = active && active.coachData !== undefined
      return prev.map(m => {
        let mm = m
        if (m.id === activeModRef.current) {
          if (coachMode && stateRef.current.coaches.some(c => c.id === id)) {
            const cd = { ...(mm.coachData || {}) }
            const cur = cd[id] || {}
            const np = Math.max(0, (cur.pronos || 0) - 1)
            cd[id] = { ...cur, pronos: np, validatedPronos: Math.min(cur.validatedPronos || 0, np) }
            mm = { ...mm, coachData: cd }
          } else {
            mm = { ...mm, players: mm.players.map(p => {
              if (p.id !== id) return p
              const np = Math.max(0, (p.pronos || 0) - 1)
              return { ...p, pronos: np, validatedPronos: Math.min(p.validatedPronos || 0, np) }
            }) }
          }
        }
        if (target && m.id === target.id) {
          if (stateRef.current.coaches.some(c => c.id === id)) {
            const cd = { ...(mm.coachData || {}) }
            if ((cd[id]?.goals || 0) > 0) { cd[id] = { ...(cd[id] || {}), goals: cd[id].goals - 1 }; mm = { ...mm, coachData: cd } }
          } else {
            mm = { ...mm, players: mm.players.map(p => p.id === id && (p.goals || 0) > 0 ? { ...p, goals: p.goals - 1 } : p) }
          }
        }
        return mm
      })
    })
  }, [])

  // Le manager saisit le résultat officiel France-Irlande sur le module pronostic
  const setPronoResult = useCallback((moduleId, field, value) => {
    setModules(prev => prev.map(m => m.id === moduleId
      ? { ...m, result: { ...(m.result || {}), [field]: value } }
      : m))
  }, [])

  // Valide TOUS les pronostics d'un coup en comparant au résultat officiel.
  // Si le pronostic est BON → toutes les lignes du jour de ce joueur passent à 20€
  // (les lignes sont déjà comptées en Préparation Mondiale via le bouton +).
  const validatePronos = useCallback((moduleId) => {
    const { modules: mods, coaches: cs } = stateRef.current
    const mod = mods.find(m => m.id === moduleId)
    const R = mod?.result || {}
    const rf = R.france, ri = R.ireland
    if (rf === '' || rf == null || ri === '' || ri == null) return
    const predicted = p => p.franceScore !== '' && p.franceScore != null && p.irelandScore !== '' && p.irelandScore != null
    const isWin = p => predicted(p) && Number(p.franceScore) === Number(rf) && Number(p.irelandScore) === Number(ri)
    const status = p => predicted(p) ? (isWin(p) ? 'won' : 'lost') : ''
    const newVP = p => isWin(p) ? (p.pronos || 0) : 0   // toutes les lignes du jour à 20€ si bon prono
    setModules(prev => prev.map(m => {
      if (m.id !== moduleId) return m
      const players = m.players.map(p => ({ ...p, validatedPronos: newVP(p), pronoStatus: status(p) }))
      let coachData = m.coachData
      if (m.coachData !== undefined) {
        coachData = { ...m.coachData }
        cs.forEach(c => { const d = coachData[c.id] || {}; coachData[c.id] = { ...d, validatedPronos: newVP(d), pronoStatus: status(d) } })
      }
      return { ...m, validatedRound: (m.validatedRound || 0) + 1, players, ...(coachData !== undefined ? { coachData } : {}) }
    }))
    // France–Irlande historique : coachs en global
    if (mod?.coachData === undefined) setCoaches(prev => prev.map(c => ({ ...c, validatedPronos: newVP(c), pronoStatus: status(c) })))
  }, [])

  // ── Gestion modules ───────────────────────────────────────────────────────
  // Une nouvelle partie reprend automatiquement TOUS les joueurs existants (roster global)
  const playersFromRoster = (prev, type) => {
    const roster = buildRoster(prev, deletedRef.current)
    if (!roster.size) return (type === 'pronostic' ? makePronoModule(0) : makeModule(0, '')).players
    return [...roster.values()].map(r => ({
      id: r.id, name: r.name, color: r.color,
      x: r.x ?? (40 + Math.random() * 20), y: r.y ?? (40 + Math.random() * 20),
      ...baseFor(type),
    }))
  }

  const addModule = useCallback(() => {
    const nid = uniqueId()
    setModules(prev => {
      const num = prev.filter(m => m.type==='forfaits').length + 1
      const players = playersFromRoster(prev, 'forfaits') // lignes/forfaits à 0 (terrain vierge)
      if (num === 2) {
        return [...prev, { id: nid, name: '2ème Partie', type: 'forfaits', players, settings: { ...PART2_SETTINGS } }]
      }
      const name = num===1 ? '1ère Partie' : `${num}ème Partie`
      return [...prev, { id: nid, name, type: 'forfaits', players, settings: { ...DEFAULT_SETTINGS } }]
    })
    setActiveMod(nid); setTab('module')
  }, [])

  const addPronoModule = useCallback(() => {
    const nid = uniqueId()
    setModules(prev => {
      const name = `Pronostics ${prev.filter(m=>m.type==='pronostic').length+1}`
      return [...prev, { id: nid, name, type: 'pronostic', players: playersFromRoster(prev, 'pronostic'), settings: { pronoBonus: 20 } }]
    })
    setActiveMod(nid); setTab('module')
  }, [])

  const renameModule = useCallback((id, name) => {
    setModules(prev => prev.map(m => m.id === id ? { ...m, name } : m))
  }, [])

  const removeModule = useCallback((id) => {
    setModules(prev => {
      if (prev.length <= 1) return prev
      const next = prev.filter(m => m.id !== id)
      setActiveMod(am => am === id ? next[0].id : am)
      return next
    })
  }, [])

  const resetModScores = useCallback(() => {
    setActivePlayers(prev => prev.map(p =>
      p.pronos !== undefined
        ? { ...p, pronos:0, validatedPronos:0, franceScore:'', irelandScore:'' }
        : { ...p, goals:0, extraSlots:0 }
    ))
    setCoaches(prev => prev.map(p => ({ ...p, goals:0, extraSlots:0 })))
  }, [setActivePlayers])

  const resetModPositions = useCallback(() => {
    setActivePlayers(prev => prev.map((p,i) => BASE_PLAYERS[i] ? { ...p, x:BASE_PLAYERS[i].x, y:BASE_PLAYERS[i].y } : p))
  }, [setActivePlayers])

  const t1=modSettings.tier1Threshold||40, t2=modSettings.tier2Threshold||50
  const objective = modSettings.objective ?? t2
  const unit = modSettings.unit || 'forfait'
  const unitU = unit.toUpperCase() + 'S' // FORFAITS / LIGNES
  const progressPct = Math.min(100, Math.round((totalGoals / objective) * 100))

  // Élimination directe : stats du jour (bonus quotidien) pour l'en-tête et le bandeau.
  const elimDaily = modSettings.dailyBonus ? computeElimDailyBonus(allPeople, modSettings) : null
  const elimFirst3 = modSettings.bonusFirst3 ?? 50
  const elimB2 = modSettings.bonus2 ?? 30
  const elimN2 = modSettings.bonus2Count ?? 4
  const elimTriples = elimDaily ? Object.values(elimDaily).filter(v => v === elimFirst3).length : 0 // 0 ou 1
  const elimDoubles = elimDaily ? Object.values(elimDaily).filter(v => v === elimB2).length : 0     // 0..4

  // ── Porte d'entrée : page de connexion ─────────────────────────────────────
  if (!currentUser) {
    const rosterPlayers = (modules.find(m => (m.type || 'forfaits') === 'forfaits') || modules[0])?.players || []
    return (
      <Login
        players={rosterPlayers}
        coaches={coaches}
        onPick={(p) => setCurrentUser({ id: p.id, name: p.name, isCoach: !!p.isCoach })}
        onManager={(pw) => { if (pw === 'Raphael2232') { setCurrentUser({ manager: true, name: 'Manager' }); setDashAuth(true); return true } return false }}
      />
    )
  }

  // État du verrou pour le rendu
  const holding = !isConfigured || !db || (editLock?.holderId === clientId.current && lockFresh(editLock))
  const lockedByOther = isConfigured && db && lockFresh(editLock) && editLock?.holderId !== clientId.current
  const editableId = !holding ? null : (currentUser?.manager ? '*' : currentUser?.id)

  return (
    <div className="app">
      <WorldCupCountdown
        dismissed={cdDismissed}
        onDismiss={() => setCdDismissed(true)}
        onExpand={() => setCdDismissed(false)}
      />
      {lockedByOther ? (
        <div className="lock-banner locked">
          <span>🔒 <strong>Modification en cours par {editLock?.holderName || 'quelqu\u2019un'}</strong> — tu es en lecture seule. La main se libère à sa déconnexion ou après 2&nbsp;min d'inactivité.</span>
          {dashAuth && <button className="lock-take-btn" onClick={acquireLock}>Prendre la main (Manager)</button>}
        </div>
      ) : holding && isConfigured && db ? (
        <div className="lock-banner mine">
          <span>✏️ <strong>Tu as la main</strong> — tu peux enregistrer tes points. Pense à te déconnecter pour laisser la main aux autres.</span>
        </div>
      ) : null}
      {fbStatus === 'offline' && warnLocal && (
        <div className="local-warn-banner">
          <span>🔴 <strong>Mode LOCAL</strong> — les données ne sont PAS partagées ni sauvegardées en ligne (risque de perte si on vide le cache). Pour activer la sauvegarde permanente et le partage entre appareils, applique les règles Firestore.</span>
          <button className="local-warn-btn" onClick={() => setShowRules(true)}>Voir les règles</button>
          <button className="local-warn-close" onClick={() => setWarnLocal(false)}>✕</button>
        </div>
      )}
      {showRules && (
        <div className="rules-modal-overlay" onClick={() => setShowRules(false)}>
          <div className="rules-modal" onClick={e => e.stopPropagation()}>
            <h3>Activer la sauvegarde en ligne (Firestore)</h3>
            <ol>
              <li>Va sur <b>console.firebase.google.com</b> → projet <b>carechallenge-24abd</b>.</li>
              <li>Menu <b>Firestore Database</b> → onglet <b>Règles</b>.</li>
              <li>Colle ces règles, puis clique <b>Publier</b> :</li>
            </ol>
            <pre className="rules-code">{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /challenge/{doc} {
      allow read, write: if true;
    }
  }
}`}</pre>
            <p className="rules-note">Ces règles autorisent la lecture/écriture du challenge. Une fois publiées, recharge l'appli : l'indicateur passera à « EN LIGNE » (vert) et tout sera sauvegardé et partagé.</p>
            <button className="rules-modal-close" onClick={() => setShowRules(false)}>Fermer</button>
          </div>
        </div>
      )}
      {freshStart.current && !gotRemote && fbStatus === 'offline' && (
        <div className="recovery-banner">
          <span>⚠️ Aucune donnée trouvée sur cet appareil. Si tu avais déjà une équipe, restaure ta sauvegarde&nbsp;:</span>
          <label className="recovery-btn">
            ⬆️ Restaurer une sauvegarde
            <input type="file" accept="application/json,.json" style={{ display:'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0]; if (!f) return
                const r = new FileReader()
                r.onload = () => { try { importData(JSON.parse(String(r.result))) ? alert('✅ Données restaurées !') : alert('❌ Fichier invalide.') } catch { alert('❌ Fichier illisible.') } e.target.value='' }
                r.readAsText(f)
              }} />
          </label>
        </div>
      )}
      <header className="app-header">
        <div className="header-content">
          <img src="/favicon.png" alt="Logo" className="header-logo-img" />
          <div className="header-text">
            <h1>CARE CHALLENGES</h1>
            <p>World Cup 2026 · {activeModule?.name}</p>
          </div>
          <div className="header-stats">
            {isBracket ? <div className="stat-badge"><span className="stat-num">🏆</span><span className="stat-label">TABLEAU</span></div> : !isProno ? (
              modSettings.dailyBonus ? (
                <>
                  <div className="stat-badge"><span className="stat-num">{totalGoals}</span><span className="stat-label">BALLONS AUJ.</span></div>
                  <div className="stat-badge tier-3"><span className="stat-num">{elimFirst3}€</span><span className="stat-label">1ER À 3</span></div>
                </>
              ) : (
              <>
                <div className="stat-badge"><span className="stat-num">{totalGoals}</span><span className="stat-label">{unitU}</span></div>
                <div className={`stat-badge tier-${currentTier}`}><span className="stat-num">{tierRate}€</span><span className="stat-label">/ {unit.toUpperCase()}</span></div>
              </>
              )
            ) : (
              <div className="stat-badge" style={{ borderColor:'rgba(255,152,0,.4)', background:'rgba(255,152,0,.08)' }}>
                <span className="stat-num" style={{ color:'#ff9800' }}>{allPeople.reduce((s,p)=>s+(p.validatedPronos||0),0)}</span>
                <span className="stat-label">VALIDÉS</span>
              </div>
            )}
            <div className="fb-dot" title={fbStatus==='ok'?'Données sauvegardées en ligne et partagées':fbStatus==='offline'?'Mode local : données NON partagées/sauvegardées en ligne':'Connexion...'}>
              <span style={{ color:fbStatus==='ok'?'#2ecc71':fbStatus==='offline'?'#e74c3c':'#ffd700', fontSize:'1rem' }}>●</span>
              <span className="fb-dot-label">{fbStatus==='ok'?'EN LIGNE':fbStatus==='offline'?'LOCAL ⚠':'...'}</span>
            </div>
            <span title="Version installée — sert à vérifier que la dernière mise à jour est bien en ligne"
              style={{ fontSize:'.62rem', fontWeight:700, letterSpacing:'.3px', color:'rgba(255,255,255,.45)', padding:'2px 6px', border:'1px solid rgba(255,255,255,.12)', borderRadius:6, whiteSpace:'nowrap' }}>
              {APP_VERSION}
            </span>
            <div className="user-pill" title={currentUser?.manager ? 'Connecté en Manager (accès complet)' : 'Tu ne peux modifier que tes propres points'}>
              <span className="user-pill-name">{currentUser?.manager ? '🔧 Manager' : `👤 ${currentUser?.name}`}</span>
              <button className="user-logout" onClick={logout} title="Se déconnecter">Déconnexion</button>
            </div>
          </div>
        </div>
        {!isProno && !isBracket && (
          modSettings.dailyBonus ? (
            <div className="tier-bar" style={{ position:'relative' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:18, flexWrap:'wrap', marginBottom:6, fontFamily:"'Barlow Condensed',sans-serif" }}>
                <span style={{ display:'flex', alignItems:'baseline', gap:6 }}>
                  <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'1.35rem', color:elimTriples>0?'#ff6b35':'rgba(240,244,255,.5)', letterSpacing:1, lineHeight:1 }}>TRIPLE {elimTriples}/1</span>
                  <span style={{ fontSize:'.8rem', color:'#ff6b35', fontWeight:700 }}>· {elimFirst3}€</span>
                </span>
                <span style={{ display:'flex', alignItems:'baseline', gap:6 }}>
                  <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'1.35rem', color:elimDoubles>0?'#00e5cc':'rgba(240,244,255,.5)', letterSpacing:1, lineHeight:1 }}>DOUBLE {elimDoubles}/{elimN2}</span>
                  <span style={{ fontSize:'.8rem', color:'#00e5cc', fontWeight:700 }}>· {elimB2}€</span>
                </span>
              </div>
              <div style={{ textAlign:'center', fontSize:'.72rem', color:'rgba(240,244,255,.5)', letterSpacing:.5 }}>
                Bonus du jour uniquement si un <strong>triple</strong> est réalisé · ballons remis à zéro chaque jour à minuit
              </div>
            </div>
          ) : (
          <div className="tier-bar" style={{ position:'relative' }}>
            <div style={{ display:'flex', alignItems:'baseline', justifyContent:'center', gap:8, marginBottom:6, fontFamily:"'Barlow Condensed',sans-serif" }}>
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'1.35rem', color:'var(--gold)', letterSpacing:1, lineHeight:1 }}>{totalGoals}</span>
              <span style={{ fontSize:'.78rem', color:'rgba(240,244,255,.6)', letterSpacing:1 }}>{unitU} SUR {objective} · OBJECTIF</span>
              <span style={{ fontSize:'.78rem', color:'rgba(240,244,255,.4)' }}>({progressPct}%)</span>
            </div>
            <div className="tier-segments">
              <div className="tier-seg tier1" style={{ width:`${(t1/(t2+15))*100}%` }}>
                <span>0→{t1} · {modSettings.tier1Rate}€</span>
                <div className="tier-fill" style={{ width:`${Math.min(100,(totalGoals/t1)*100)}%` }} />
              </div>
              <div className="tier-seg tier2" style={{ width:`${((t2-t1)/(t2+15))*100}%` }}>
                <span>{t1+1}→{t2} · {modSettings.tier2Rate}€</span>
                <div className="tier-fill" style={{ width:`${Math.min(100,Math.max(0,((totalGoals-t1)/(t2-t1))*100))}%` }} />
              </div>
              <div className="tier-seg tier3" style={{ flex:1 }}>
                <span>{t2+1}+ · {modSettings.tier3Rate}€</span>
                <div className="tier-fill" style={{ width:`${Math.min(100,Math.max(0,((totalGoals-t2)/15)*100))}%` }} />
              </div>
            </div>
          </div>
          )
        )}
        {!isBracket && <div className="ticker-wrap">
          <div className="ticker-content">
            {(() => {
              const pronoMatch = modSettings.matchLabel || 'FRANCE VS IRLANDE'
              const pronoTarget = modSettings.feeds === 'poules' ? 'PHASE DE POULES' : 'PRÉPARATION MONDIALE'
              const items = isProno
                ? [`🎯 BON PRONOSTIQUEUR · ${pronoMatch}`, '⭐ PRONOSTIC VALIDÉ = 20€ DE BONUS', `🏆 CLASSEMENT COMPTABILISÉ DANS ${pronoTarget}`, '🔧 RÉSULTAT OFFICIEL SAISI PAR LE MANAGER']
                : (modSettings.dailyBonus
                    ? [`⚔️ ${modSettings.bannerPhase || 'ÉLIMINATION DIRECTE'} · ${modSettings.bannerDates || 'DU 28 JUIN AU 09 JUILLET 2026'}`, `🥇 1ER À 3 BALLONS : ${elimFirst3}€ · ${elimN2} SUIVANTS À 2 BALLONS : ${elimB2}€`, `🏆 AUJOURD'HUI · TRIPLE ${elimTriples}/1 · DOUBLE ${elimDoubles}/${elimN2}`, '⚠️ AUCUN BONUS SI AUCUN TRIPLE DANS LA JOURNÉE', '🔄 COMPTEUR REMIS À ZÉRO CHAQUE JOUR À MINUIT · GAINS CUMULÉS', '🌍 FIFA WORLD CUP 2026 · USA · CANADA · MEXIQUE']
                : modSettings.phase === 'elim'
                    ? [`⚔️ ${modSettings.bannerPhase || 'ÉLIMINATION DIRECTE'} · ${modSettings.bannerDates || 'DU 28 JUIN AU 09 JUILLET 2026'}`, `🥇 1ER À 3 BALLONS : ${elimFirst3}€ · ${elimN2} SUIVANTS À 2 BALLONS : ${elimB2}€`, '🔄 COMPTEUR REMIS À ZÉRO CHAQUE JOUR À MINUIT', '🌍 FIFA WORLD CUP 2026 · USA · CANADA · MEXIQUE']
                : modSettings.phase === 'poules'
                    ? [`⚽ ${modSettings.bannerPhase || 'PHASE DE POULES'} · ${modSettings.bannerDates || "JUSQU'AU 27 JUIN 2026"}`, `🏆 OBJECTIF ${objective} FORFAITS → ${modSettings.tier3Rate}€ RÉTROACTIF`, '🇫🇷 FRANCE VS SÉNÉGAL · PHASE DE GROUPE', `👑 TOP BUTEUR : ${modSettings.topScorerRate}€/FORFAIT SI 100 ATTEINT`, '🌍 FIFA WORLD CUP 2026 · USA · CANADA · MEXIQUE']
                    : [`⚽ ${modSettings.bannerPhase || 'PHASE DE PRÉPARATION MONDIALE'} · ${modSettings.bannerDates || "JUSQU'AU 11/06/2026"}`, `🏆 OBJECTIF ${objective} ${unitU} → ${modSettings.tier3Rate}€ RÉTROACTIF`, '🎯 PRONOSTIC FRANCE VS IRLANDE COMPTÉ ICI', `👑 TOP BUTEUR : ${modSettings.topScorerRate}€/${unit} SI OBJECTIF ATTEINT`, '🌍 FIFA WORLD CUP 2026 · USA · CANADA · MEXIQUE'])
              // contenu dupliqué pour un défilement continu sans coupure
              return [...items, ...items].map((t, i) => <span key={i}>{t}</span>)
            })()}
          </div>
        </div>}
      </header>

      <div className="module-tabs-bar">
        <div className="module-tabs-scroll">
          {modules.map(m => (
            <button key={m.id}
              className={`module-tab ${tab==='module'&&activeMod===m.id?'active':''} ${m.type==='pronostic'?'module-tab-prono':''}`}
              onClick={() => { setActiveMod(m.id); setTab('module'); setSelectedId(null) }}
            >
              {m.type==='pronostic'?'🎯':'⚽'} {m.name}
            </button>
          ))}
          {dashAuth && <button className="module-tab add-module-tab" onClick={addModule}>+ Partie</button>}
          {dashAuth && <button className="module-tab add-prono-tab" onClick={addPronoModule}>+ Pronostic</button>}
        </div>
      </div>

      <nav className="app-nav">
        {[
          { key:'leaderboard', icon:'🏆', label:'Classement' },
          { key:'rules',       icon:'📋', label:'Règles'     },
          { key:'dashboard',   icon:'🔧', label:'Manager'    },
        ].map(({ key, icon, label }) => (
          <button key={key} className={`nav-btn ${tab===key?'active':''}`}
            onClick={() => { setTab(key); setSelectedId(null) }}
          >
            <span className="nav-icon">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <main className="app-main">
        {tab === 'module' && (
          isBracket
            ? <Bracket winners={activeModule.winners || {}} canEdit={dashAuth} onPick={setBracketWinner} />
            : isProno
            ? <PronosticModule module={activeModule} players={modPlayers} coaches={activeCoaches} dashAuth={dashAuth} editableId={editableId} onUpdatePerson={updatePerson} onSetResult={setPronoResult} onValidateAll={validatePronos} onAddBall={addPronoBall} onRemoveBall={removePronoBall} />
            : <div className="module-stage">
                <Fireworks active={!modSettings.dailyBonus && totalGoals >= objective} confetti />
                {!modSettings.dailyBonus && totalGoals >= objective && (
                  <div className="objective-badge">🎉 Objectif atteint · {objective} {unitU.toLowerCase()}</div>
                )}
                {activeModule?.settings?.phase === 'poules' && (() => {
                  const n = new Date()
                  const isToday2706 = n.getFullYear() === 2026 && n.getMonth() === 5 && n.getDate() === 27
                  return isToday2706 ? (
                    <div className="poules-irak-note">
                      ⚽ <strong>Aujourd'hui</strong> — les ballons des <strong>vainqueurs du pronostic France–Irak</strong> sont à enregistrer directement dans la section <strong>« France - Irak »</strong> (onglet du match), pas sur ce terrain.
                    </div>
                  ) : null
                })()}
                {activeModule?.settings?.dailyBonus && (
                  <div className="poules-irak-note" style={{ background:'linear-gradient(135deg, rgba(255,107,53,.16), rgba(255,193,7,.10))', borderColor:'rgba(255,107,53,.45)' }}>
                    🏆 <strong>Élimination directe — bonus du jour.</strong> Le 1ᵉʳ à <strong>3 ballons</strong> gagne <strong>{activeModule.settings.bonusFirst3 ?? 50}€</strong>, les <strong>{activeModule.settings.bonus2Count ?? 4} suivants</strong> à <strong>2 ballons</strong> gagnent <strong>{activeModule.settings.bonus2 ?? 30}€</strong>. Si personne n'atteint 3, aucun bonus. Ballons remis à zéro chaque jour à minuit, gains cumulés jusqu'au 9 juillet.
                  </div>
                )}
                <Pitch players={modPlayers} coaches={activeCoaches} selectedId={selectedId} onSelect={setSelectedId} onUpdatePerson={updatePerson} onAddGoal={addGoal} onRemoveGoal={removeGoal} onClearGoals={clearGoals} onAddSlot={addSlot} allPeople={allPeople} totalGoals={totalGoals} settings={modSettings} validatedById={validatedById} validatedValueById={validatedValueById} dashAuth={dashAuth} editableId={editableId} />
              </div>
        )}
        {tab === 'leaderboard' && <Leaderboard modules={modules} coaches={coaches} activeModId={activeMod} />}
        {tab === 'rules' && <Rules totalGoals={totalGoals} currentTier={currentTier} settings={modSettings} moduleName={activeModule?.name} />}
        {tab === 'dashboard' && (
          <Dashboard
            modules={modules} coaches={coaches} activeModId={activeMod}
            onSetActiveMod={(id) => { setActiveMod(id); activeModRef.current = id }}
            allPeople={allPeople} totalGoals={totalGoals} settings={modSettings}
            auth={dashAuth} onAuth={setDashAuth}
            onAddPlayer={addPlayer} onRemovePlayer={removePlayer}
            onUpdatePerson={updatePerson}
            onAddGoal={(id) => addGoal(id, null)} onRemoveGoal={removeGoal}
            onResetScores={resetModScores} onResetPositions={resetModPositions}
            onUpdateSettings={setActiveSettings}
            onAddModule={addModule} onAddPronoModule={addPronoModule}
            onRenameModule={renameModule} onRemoveModule={removeModule}
            currentTier={currentTier} tierRate={tierRate} fbStatus={fbStatus} fbError={fbError}
            validatedById={validatedById}
            validatedValueById={validatedValueById}
            onExport={exportData} onImport={importData}
            liveSync={liveSync} onToggleLiveSync={setLiveSync}
          />
        )}
      </main>

      {goalBurst && (
        <div key={goalBurst.id} className="goal-burst" style={{ left:goalBurst.x-20, top:goalBurst.y-20 }}>⚽</div>
      )}
    </div>
  )
}
