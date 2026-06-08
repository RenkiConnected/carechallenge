import { useState, useEffect, useRef, useCallback } from 'react'
import Pitch from './components/Pitch'
import PronosticModule from './components/PronosticModule'
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

function loadLocal() { try { const r = localStorage.getItem('fc2026_v5'); return r ? JSON.parse(r) : null } catch { return null } }
function saveLocal(d) { try { localStorage.setItem('fc2026_v5', JSON.stringify(d)) } catch {} }

// ── ROSTER GLOBAL : les joueurs sont PARTAGÉS sur toutes les parties ───────────
// Identité (id + nom + couleur) = commune à toutes les parties + Bon Pronostiqueur.
// Données par-partie (buts, positions, pronostics) = propres à chaque partie.
let _idCounter = 0
function uniqueId() { return Date.now() * 1000 + (_idCounter++ % 1000) }

// Champs de données spécifiques à une partie (jamais synchronisés globalement)
function baseFor(type) {
  return type === 'pronostic'
    ? { goals: 0, pronos: 0, validatedPronos: 0, franceScore: '', irelandScore: '' }
    : { goals: 0, extraSlots: 0 }
}

// Construit la liste unique de tous les joueurs présents dans n'importe quelle partie
function buildRoster(modules) {
  const map = new Map()
  ;(modules || []).forEach(m => (m.players || []).forEach(p => {
    const ex = map.get(p.id)
    const isPlaceholder = n => !n || /^Joueur \d+$/.test(n)
    if (!ex) {
      map.set(p.id, { id: p.id, name: p.name, color: p.color, x: p.x, y: p.y })
    } else if (isPlaceholder(ex.name) && !isPlaceholder(p.name)) {
      // on garde le vrai nom plutôt qu'un "Joueur N" générique
      map.set(p.id, { ...ex, name: p.name, color: p.color })
    }
  }))
  return map
}

// Garantit que CHAQUE partie contient TOUS les joueurs du roster (et synchronise nom/couleur)
function reconcileModules(modules) {
  if (!modules || !modules.length) return modules
  const roster = buildRoster(modules)
  return modules.map(m => {
    const have = new Set((m.players || []).map(p => p.id))
    const additions = []
    roster.forEach((r, id) => {
      if (!have.has(id)) {
        additions.push({
          id: r.id, name: r.name, color: r.color,
          x: r.x ?? (40 + Math.random() * 20),
          y: r.y ?? (40 + Math.random() * 20),
          ...baseFor(m.type),
        })
      }
    })
    const players = (m.players || []).map(p => {
      const r = roster.get(p.id)
      return r ? { ...p, name: r.name, color: r.color } : p
    })
    return { ...m, players: [...players, ...additions] }
  })
}

export default function App() {
  const saved = loadLocal()
  const [modules,    setModules]    = useState(() => reconcileModules(saved?.modules || [makeModule(1,'1ère Partie'), makePronoModule(2)]))
  const [coaches,    setCoaches]    = useState(() => saved?.coaches  || BASE_COACHES)
  const [activeMod,  setActiveMod]  = useState(() => saved?.activeMod || 1)
  const [tab,        setTab]        = useState('module')
  const [selectedId, setSelectedId] = useState(null)
  const [dashAuth,   setDashAuth]   = useState(false)
  const [fbStatus,   setFbStatus]   = useState('connecting')
  const [goalBurst,  setGoalBurst]  = useState(null)

  // ── REFS (évite les stale closures dans les callbacks) ─────────────────────
  const activeModRef = useRef(activeMod)
  useEffect(() => { activeModRef.current = activeMod }, [activeMod])
  const saveTimer = useRef(null)

  // Identité unique de CE client (pour ignorer nos propres échos Firebase)
  const clientId = useRef(Math.random().toString(36).slice(2) + Date.now().toString(36))
  // Horodatage de la dernière MODIFICATION LOCALE non encore confirmée par le serveur.
  // Tant qu'un snapshot entrant est plus ancien que ça, on NE l'applique PAS (sinon il
  // écraserait un ajout/suppression qu'on vient de faire et qui n'est pas encore écrit).
  const lastLocalEdit = useRef(0)
  // Quand on applique un état distant, on ne veut pas le ré-écrire immédiatement.
  const applyingRemote = useRef(false)
  // Date du dernier état accepté (local ou distant) — pour comparer les snapshots.
  const lastAcceptedAt = useRef(0)

  // ── Firebase ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isConfigured || !db) { setFbStatus('offline'); return }
    const unsub = onSnapshot(doc(db, 'challenge', 'state'),
      snap => {
        setFbStatus('ok')
        if (!snap.exists()) return
        const d = snap.data()

        // 1) C'est notre propre écriture qui revient → on a déjà cet état, on ignore.
        if (d.clientId && d.clientId === clientId.current) {
          lastAcceptedAt.current = d.updatedAt || lastAcceptedAt.current
          // notre écriture est confirmée : plus de modif locale en attente
          if ((d.updatedAt || 0) >= lastLocalEdit.current) lastLocalEdit.current = 0
          return
        }

        // 2) Snapshot plus ancien que nos modifs locales non écrites → on l'ignore
        //    (sinon il efface ce qu'on vient de faire).
        const ts = d.updatedAt || 0
        if (lastLocalEdit.current && ts < lastLocalEdit.current) return
        if (ts && ts <= lastAcceptedAt.current) return

        // 3) État distant légitime (autre client, plus récent) → on l'applique.
        applyingRemote.current = true
        if (d.modules)   setModules(reconcileModules(d.modules))
        if (d.coaches)   setCoaches(d.coaches)
        if (d.activeMod) setActiveMod(d.activeMod)
        lastAcceptedAt.current = ts
      },
      err => { console.warn('[FB]', err.code, err.message); setFbStatus('offline') }
    )
    return unsub
  }, [])

  const persist = useCallback((m, c, am) => {
    // Ne pas ré-écrire l'état qu'on vient juste de recevoir du serveur.
    if (applyingRemote.current) { applyingRemote.current = false; return }

    const now = Date.now()
    lastLocalEdit.current = now
    lastAcceptedAt.current = now
    const data = { modules: m, coaches: c, activeMod: am, updatedAt: now, clientId: clientId.current }
    saveLocal(data)

    if (isConfigured && db) {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        setDoc(doc(db,'challenge','state'), data).catch(e => { console.warn('[FB write]',e); setFbStatus('offline') })
      }, 400)
    }
  }, [])

  useEffect(() => { persist(modules, coaches, activeMod) }, [modules, coaches, activeMod, persist])

  // ── Computed ──────────────────────────────────────────────────────────────
  const activeModule  = modules.find(m => m.id === activeMod) || modules[0]
  const modPlayers    = activeModule?.players || []
  const modSettings   = activeModule?.settings || DEFAULT_SETTINGS
  const isProno       = activeModule?.type === 'pronostic'
  const allPeople     = [...modPlayers, ...coaches]
  const totalGoals    = isProno ? 0 : allPeople.reduce((s,p) => s+(p.goals||0), 0)
  const currentTier   = getCurrentTier(totalGoals, modSettings)
  const tierRate      = getTierRate(totalGoals, modSettings)

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
      const name = num===1 ? '1ère Partie' : `${num}ème Partie`
      return [...prev, { id: nid, name, type: 'forfaits', players: playersFromRoster(prev, 'forfaits'), settings: { ...DEFAULT_SETTINGS } }]
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

  return (
    <div className="app">
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
                <div className="stat-badge"><span className="stat-num">{totalGoals}</span><span className="stat-label">FORFAITS</span></div>
                <div className={`stat-badge tier-${currentTier}`}><span className="stat-num">{tierRate}€</span><span className="stat-label">/ FORFAIT</span></div>
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
          <div className="tier-bar">
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
            {isProno
              ? <><span>🎯 BON PRONOSTIQUEUR · FRANCE VS IRLANDE</span><span>⭐ PRONOSTIC VALIDÉ = 20€ DE BONUS</span><span>🔧 MANAGER VALIDE LES BONS PRONOSTICS</span></>
              : <><span>⚽ PHASE DE PRÉPARATION · JUSQU'AU 11/06/2026</span><span>🏆 OBJECTIF {t2} FORFAITS → {modSettings.tier3Rate}€ RÉTROACTIF</span><span>👑 TOP BUTEUR : {modSettings.topScorerRate}€ · FIN DE PHASE</span><span>🌍 FIFA WORLD CUP 2026 · USA · CANADA · MEXIQUE</span></>
            }
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
            ? <PronosticModule players={modPlayers} coaches={coaches} dashAuth={dashAuth} onUpdatePerson={updatePerson} />
            : <Pitch players={modPlayers} coaches={coaches} selectedId={selectedId} onSelect={setSelectedId} onUpdatePerson={updatePerson} onAddGoal={addGoal} onRemoveGoal={removeGoal} onAddSlot={addSlot} allPeople={allPeople} totalGoals={totalGoals} settings={modSettings} />
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
            currentTier={currentTier} tierRate={tierRate} fbStatus={fbStatus}
          />
        )}
      </main>

      {goalBurst && (
        <div key={goalBurst.id} className="goal-burst" style={{ left:goalBurst.x-20, top:goalBurst.y-20 }}>⚽</div>
      )}
    </div>
  )
}
