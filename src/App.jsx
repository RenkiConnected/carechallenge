import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Pitch from './components/Pitch'
import PronosticModule from './components/PronosticModule'
import Fireworks from './components/Fireworks'
import Leaderboard from './components/Leaderboard'
import Rules from './components/Rules'
import Dashboard from './components/Dashboard'
import { getCurrentTier, getTierRate, DEFAULT_SETTINGS } from './utils/bonus'
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

// Préréglage 2ème partie — Phase de poules (objectif 100 lignes, 12→27 juillet)
const PART2_SETTINGS = {
  tier1Rate: 10, tier2Rate: 12, tier3Rate: 15, topScorerRate: 20,
  tier1Threshold: 50, tier2Threshold: 80, objective: 100,
  phaseEnded: false, minForTier3: 3,
  unit: 'forfait', phase: 'poules',
  bannerPhase: 'PHASE DE POULES', bannerDates: 'DU 12 AU 27 JUILLET 2026',
}

function loadLocal() { try { const r = localStorage.getItem('fc2026_v5'); return r ? JSON.parse(r) : null } catch { return null } }
function saveLocal(d) { try { localStorage.setItem('fc2026_v5', JSON.stringify(d)) } catch {} }

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
function buildRoster(modules) {
  const canon = canonicalModule(modules)
  const map = new Map()
  ;(canon?.players || []).forEach(p => {
    if (!map.has(p.id)) map.set(p.id, { id: p.id, name: p.name, color: p.color, x: p.x, y: p.y })
  })
  return map
}

// Force CHAQUE partie à contenir exactement le roster (ajoute manquants, retire orphelins,
// synchronise nom + couleur). Conserve les données par-partie des joueurs déjà présents.
function reconcileModules(modules) {
  if (!modules || !modules.length) return modules
  const roster = buildRoster(modules)
  if (!roster.size) return modules
  return modules.map(m => {
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
    return { ...m, players, settings }
  })
}

export default function App() {
  const saved = loadLocal()
  const freshStart = useRef(!saved) // aucun stockage local au lancement
  const [modules,    setModules]    = useState(() => reconcileModules(saved?.modules || [makeModule(1,'1ère Partie'), makePronoModule(2)]))
  const [coaches,    setCoaches]    = useState(() => saved?.coaches  || BASE_COACHES)
  const [activeMod,  setActiveMod]  = useState(() => saved?.activeMod || 1)
  const [tab,        setTab]        = useState('module')
  const [selectedId, setSelectedId] = useState(null)
  const [dashAuth,   setDashAuth]   = useState(false)
  const [fbStatus,   setFbStatus]   = useState('connecting')
  const [fbError,    setFbError]    = useState('')
  // Synchro temps réel : si OFF, on ne voit PAS en direct ce que font les autres
  // (les données restent partagées : enregistrées et rechargées à l'ouverture).
  const [liveSync,   setLiveSync]   = useState(() => localStorage.getItem('fc2026_live') === 'on')
  const liveSyncRef = useRef(liveSync)
  useEffect(() => { liveSyncRef.current = liveSync; try { localStorage.setItem('fc2026_live', liveSync ? 'on' : 'off') } catch {} }, [liveSync])
  const [goalBurst,  setGoalBurst]  = useState(null)
  const [gotRemote,  setGotRemote]  = useState(false) // vraies données reçues du serveur

  // ── REFS (évite les stale closures dans les callbacks) ─────────────────────
  const activeModRef = useRef(activeMod)
  useEffect(() => { activeModRef.current = activeMod }, [activeMod])
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
  // Snapshot de l'état courant (pour pousser/réparer le serveur)
  const stateRef = useRef({ modules, coaches, activeMod })
  useEffect(() => { stateRef.current = { modules, coaches, activeMod } }, [modules, coaches, activeMod])

  // Écrit immédiatement l'état courant sur Firebase (réparation / restauration), avec horodatage neuf
  const forcePush = useCallback(() => {
    const { modules: m, coaches: c, activeMod: am } = stateRef.current
    const now = Date.now()
    lastLocalEdit.current = now
    lastAcceptedAt.current = now
    const data = { modules: m, coaches: c, activeMod: am, updatedAt: now, clientId: clientId.current }
    saveLocal(data)
    if (isConfigured && db) {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      setDoc(doc(db, 'challenge', 'state'), data).catch(e => { setFbError(e.code || ''); setFbStatus('offline') })
    }
  }, [])

  // Sauvegarde : télécharge un fichier JSON de toutes les données
  const exportData = useCallback(() => {
    const { modules: m, coaches: c, activeMod: am } = stateRef.current
    const blob = new Blob([JSON.stringify({ modules: m, coaches: c, activeMod: am, updatedAt: Date.now() }, null, 2)], { type: 'application/json' })
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
      const roster = buildRoster(mods)
      const players = roster.size
        ? [...roster.values()].map(r => ({ id:r.id, name:r.name, color:r.color, x:r.x ?? 50, y:r.y ?? 50, goals:0, extraSlots:0 }))
        : []
      mods = [...mods, { id: uniqueId(), name:'2ème Partie', type:'forfaits', players, settings:{ ...PART2_SETTINGS } }]
    }
    setModules(reconcileModules(mods))
    if (obj.coaches) setCoaches(obj.coaches)
    if (obj.activeMod) setActiveMod(obj.activeMod)
    setGotRemote(true)
    setTimeout(() => forcePush(), 80) // horodatage neuf → restauration prioritaire partout
    return true
  }, [forcePush])

  // ── Firebase ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isConfigured || !db) { setFbStatus('offline'); return }
    // Filet de sécurité : si le serveur ne répond pas, on autorise l'écriture après 4s
    const fallback = setTimeout(() => { hydrated.current = true }, 4000)
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

        // 1) Notre propre écriture qui revient → on ignore.
        if (d.clientId && d.clientId === clientId.current) {
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

        // 3) Le serveur est plus récent → on l'applique.
        //    Si la synchro temps réel est désactivée, on n'applique PAS les mises à jour
        //    en direct après le 1er chargement (on garde notre écran stable).
        if (hydrated.current && !liveSyncRef.current) { return }
        applyingRemote.current = true
        if (saveTimer.current) clearTimeout(saveTimer.current)
        if (d.modules)   setModules(reconcileModules(d.modules))
        if (d.coaches)   setCoaches(d.coaches)
        if (d.activeMod) setActiveMod(d.activeMod)
        setGotRemote(true)
        lastAcceptedAt.current = ts
        hydrated.current = true
      },
      err => { console.warn('[FB]', err.code, err.message); setFbError(err.code || err.message || ''); setFbStatus('offline') }
    )
    return () => { clearTimeout(fallback); unsub() }
  }, [])

  const persist = useCallback((m, c, am) => {
    // Ne pas ré-écrire l'état qu'on vient juste de recevoir du serveur.
    if (applyingRemote.current) {
      applyingRemote.current = false
      if (saveTimer.current) clearTimeout(saveTimer.current)
      return
    }

    const now = Date.now()
    const data = { modules: m, coaches: c, activeMod: am, updatedAt: now, clientId: clientId.current }
    saveLocal(data) // localStorage : toujours (sauvegarde locale immédiate)

    // Firebase : seulement après avoir reçu l'état serveur (évite d'écraser les vraies données)
    if (isConfigured && db && hydrated.current) {
      lastLocalEdit.current = now
      lastAcceptedAt.current = now
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        setDoc(doc(db,'challenge','state'), data).catch(e => { console.warn('[FB write]',e); setFbError(e.code || e.message || ''); setFbStatus('offline') })
      }, 400)
    }
  }, [])

  useEffect(() => { persist(modules, coaches, activeMod) }, [modules, coaches, activeMod, persist])

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

  // ── Computed ──────────────────────────────────────────────────────────────
  const activeModule  = modules.find(m => m.id === activeMod) || modules[0]
  const modPlayers    = activeModule?.players || []
  const modSettings   = activeModule?.settings || DEFAULT_SETTINGS
  const isProno       = activeModule?.type === 'pronostic'
  const allPeople     = [...modPlayers, ...coaches]
  const totalGoals    = isProno ? 0 : allPeople.reduce((s,p) => s+(p.goals||0), 0)
  const currentTier   = getCurrentTier(totalGoals, modSettings)
  const tierRate      = getTierRate(totalGoals, modSettings)
  // Nombre de pronostics validés par joueur (sert à valoriser ces ballons à 20€ partout)
  const validatedById = useMemo(() => {
    const map = {}
    modules.forEach(m => { if (m.type === 'pronostic') (m.players||[]).forEach(p => { map[p.id] = (map[p.id]||0) + (p.validatedPronos||0) }) })
    coaches.forEach(c => { if (c.validatedPronos) map[c.id] = (map[c.id]||0) + (c.validatedPronos||0) })
    return map
  }, [modules, coaches])

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
    if (isGlobal) {
      // nom / couleur → toutes les parties
      setModules(prev => prev.map(m => ({
        ...m, players: m.players.map(p => p.id === id ? { ...p, ...updates } : p),
      })))
    } else {
      // données par-partie → uniquement la partie active
      setActivePlayers(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
    }
    setCoaches(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
  }, [setActivePlayers])

  const addGoal = useCallback((id, coords) => {
    setActivePlayers(prev => prev.map(p => p.id === id ? { ...p, goals: (p.goals||0)+1 } : p))
    setCoaches(prev => prev.map(p => p.id === id ? { ...p, goals: (p.goals||0)+1 } : p))
    if (coords) {
      setGoalBurst({ x: coords.x, y: coords.y, id: Date.now() })
      setTimeout(() => setGoalBurst(null), 700)
    }
  }, [setActivePlayers])

  const removeGoal = useCallback((id) => {
    setActivePlayers(prev => prev.map(p => p.id === id && (p.goals||0) > 0 ? { ...p, goals: p.goals-1 } : p))
    setCoaches(prev => prev.map(p => p.id === id && (p.goals||0) > 0 ? { ...p, goals: p.goals-1 } : p))
  }, [setActivePlayers])

  const addSlot = useCallback((id) => {
    setActivePlayers(prev => prev.map(p => p.id === id ? { ...p, extraSlots: (p.extraSlots||0)+1 } : p))
    setCoaches(prev => prev.map(p => p.id === id ? { ...p, extraSlots: (p.extraSlots||0)+1 } : p))
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
    setModules(prev => prev.map(m => ({ ...m, players: m.players.filter(p => p.id !== id) })))
    setSelectedId(sel => sel === id ? null : sel)
  }, [])

  // ── Pronostics ──────────────────────────────────────────────────────────────
  // Ajouter un ballon dans Bon Pronostiqueur = +1 pronostic ET +1 ballon (forfait) en 1ère Partie
  const addPronoBall = useCallback((id) => {
    setModules(prev => {
      const canon = prev.find(m => (m.type || 'forfaits') === 'forfaits') || prev[0]
      return prev.map(m => {
        let mm = m
        if (m.id === activeModRef.current) // module pronostic actif → +1 prono
          mm = { ...mm, players: mm.players.map(p => p.id === id ? { ...p, pronos: (p.pronos||0)+1 } : p) }
        if (canon && m.id === canon.id)    // 1ère Partie → +1 forfait
          mm = { ...mm, players: mm.players.map(p => p.id === id ? { ...p, goals: (p.goals||0)+1 } : p) }
        return mm
      })
    })
    setCoaches(prev => prev.map(p => p.id === id ? { ...p, pronos:(p.pronos||0)+1, goals:(p.goals||0)+1 } : p))
  }, [])

  const removePronoBall = useCallback((id) => {
    setModules(prev => {
      const canon = prev.find(m => (m.type || 'forfaits') === 'forfaits') || prev[0]
      return prev.map(m => {
        let mm = m
        if (m.id === activeModRef.current)
          mm = { ...mm, players: mm.players.map(p => {
            if (p.id !== id) return p
            const np = Math.max(0, (p.pronos||0)-1)
            return { ...p, pronos: np, validatedPronos: Math.min(p.validatedPronos||0, np) }
          }) }
        if (canon && m.id === canon.id)
          mm = { ...mm, players: mm.players.map(p => p.id === id && (p.goals||0) > 0 ? { ...p, goals: p.goals-1 } : p) }
        return mm
      })
    })
    setCoaches(prev => prev.map(p => {
      if (p.id !== id) return p
      const np = Math.max(0, (p.pronos||0)-1)
      return { ...p, pronos: np, validatedPronos: Math.min(p.validatedPronos||0, np), goals: Math.max(0, (p.goals||0)-1) }
    }))
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
    setModules(prev => prev.map(m => m.id === moduleId
      ? { ...m, validatedRound: (m.validatedRound || 0) + 1,
          players: m.players.map(p => ({ ...p, validatedPronos: newVP(p), pronoStatus: status(p) })) }
      : m))
    setCoaches(prev => prev.map(c => ({ ...c, validatedPronos: newVP(c), pronoStatus: status(c) })))
  }, [])

  // ── Gestion modules ───────────────────────────────────────────────────────
  // Une nouvelle partie reprend automatiquement TOUS les joueurs existants (roster global)
  const playersFromRoster = (prev, type) => {
    const roster = buildRoster(prev)
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

  return (
    <div className="app">
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
            {!isProno ? (
              <>
                <div className="stat-badge"><span className="stat-num">{totalGoals}</span><span className="stat-label">{unitU}</span></div>
                <div className={`stat-badge tier-${currentTier}`}><span className="stat-num">{tierRate}€</span><span className="stat-label">/ {unit.toUpperCase()}</span></div>
              </>
            ) : (
              <div className="stat-badge" style={{ borderColor:'rgba(255,152,0,.4)', background:'rgba(255,152,0,.08)' }}>
                <span className="stat-num" style={{ color:'#ff9800' }}>{allPeople.reduce((s,p)=>s+(p.validatedPronos||0),0)}</span>
                <span className="stat-label">VALIDÉS</span>
              </div>
            )}
            <div className="fb-dot" title={fbStatus==='ok'?'Firebase connecté':fbStatus==='offline'?'Mode local':'Connexion...'}>
              <span style={{ color:fbStatus==='ok'?'#2ecc71':fbStatus==='offline'?'#e67e22':'#ffd700', fontSize:'1rem' }}>●</span>
              <span className="fb-dot-label">{fbStatus==='ok'?'Live':fbStatus==='offline'?'Local':'...'}</span>
            </div>
          </div>
        </div>
        {!isProno && (
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
        )}
        <div className="ticker-wrap">
          <div className="ticker-content">
            {(() => {
              const items = isProno
                ? ['🎯 BON PRONOSTIQUEUR · FRANCE VS IRLANDE', '⭐ PRONOSTIC VALIDÉ = 20€ DE BONUS', '🏆 CLASSEMENT COMPTABILISÉ DANS PRÉPARATION MONDIALE', '🔧 RÉSULTAT OFFICIEL SAISI PAR LE MANAGER']
                : (modSettings.phase === 'poules'
                    ? [`⚽ ${modSettings.bannerPhase || 'PHASE DE POULES'} · ${modSettings.bannerDates || 'DU 12 AU 27 JUILLET 2026'}`, `🏆 OBJECTIF ${objective} FORFAITS → ${modSettings.tier3Rate}€ RÉTROACTIF`, '🇫🇷 FRANCE VS IRLANDE · PHASE DE POULES', `👑 TOP BUTEUR : ${modSettings.topScorerRate}€/FORFAIT SI 100 ATTEINT`, '🌍 FIFA WORLD CUP 2026 · USA · CANADA · MEXIQUE']
                    : [`⚽ ${modSettings.bannerPhase || 'PHASE DE PRÉPARATION MONDIALE'} · ${modSettings.bannerDates || "JUSQU'AU 11/06/2026"}`, `🏆 OBJECTIF ${objective} ${unitU} → ${modSettings.tier3Rate}€ RÉTROACTIF`, '🎯 PRONOSTIC FRANCE VS IRLANDE COMPTÉ ICI', `👑 TOP BUTEUR : ${modSettings.topScorerRate}€/${unit} SI OBJECTIF ATTEINT`, '🌍 FIFA WORLD CUP 2026 · USA · CANADA · MEXIQUE'])
              // contenu dupliqué pour un défilement continu sans coupure
              return [...items, ...items].map((t, i) => <span key={i}>{t}</span>)
            })()}
          </div>
        </div>
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
          isProno
            ? <PronosticModule module={activeModule} players={modPlayers} coaches={coaches} dashAuth={dashAuth} onUpdatePerson={updatePerson} onSetResult={setPronoResult} onValidateAll={validatePronos} onAddBall={addPronoBall} onRemoveBall={removePronoBall} />
            : <div className="module-stage">
                <Fireworks active={totalGoals >= objective} />
                <Pitch players={modPlayers} coaches={coaches} selectedId={selectedId} onSelect={setSelectedId} onUpdatePerson={updatePerson} onAddGoal={addGoal} onRemoveGoal={removeGoal} onAddSlot={addSlot} allPeople={allPeople} totalGoals={totalGoals} settings={modSettings} validatedById={validatedById} dashAuth={dashAuth} />
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
