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
  return {
    id, name: 'Bon Pronostiqueur', type: 'pronostic',
    players: BASE_PLAYERS.map(p => ({
      ...p, goals: 0,
      pronos: 0, validatedPronos: 0,
      franceScore: '', irelandScore: '',
    })),
    settings: { pronoBonus: 20 },
  }
}

function ordinalName(n) { return n === 1 ? '1ère Partie' : `${n}ème Partie` }

function loadLocal() { try { const r = localStorage.getItem('fc2026_v4'); return r ? JSON.parse(r) : null } catch { return null } }
function saveLocal(data) { try { localStorage.setItem('fc2026_v4', JSON.stringify(data)) } catch {} }

const DEBOUNCE = 900

export default function App() {
  const saved = loadLocal()
  const [modules,    setModules]    = useState(() => saved?.modules  || [makeModule(1,'1ère Partie'), makePronoModule(2)])
  const [coaches,    setCoaches]    = useState(() => saved?.coaches  || BASE_COACHES)
  const [activeMod,  setActiveMod]  = useState(() => saved?.activeMod || 1)
  const [tab,        setTab]        = useState('module')
  const [selectedId, setSelectedId] = useState(null)
  const [dashAuth,   setDashAuth]   = useState(false)
  const [fbStatus,   setFbStatus]   = useState('connecting')
  const [goalBurst,  setGoalBurst]  = useState(null)
  const saveTimer = useRef(null)
  const remoteRef = useRef(false)

  // ── Firebase ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isConfigured || !db) { setFbStatus('offline'); return }
    const unsub = onSnapshot(doc(db, 'challenge', 'state'), snap => {
      if (snap.exists()) {
        const d = snap.data()
        remoteRef.current = true
        if (d.modules)   setModules(d.modules)
        if (d.coaches)   setCoaches(d.coaches)
        if (d.activeMod) setActiveMod(d.activeMod)
        setTimeout(() => { remoteRef.current = false }, 200)
      }
      setFbStatus('ok')
    }, err => { console.warn('[FB]', err); setFbStatus('offline') })
    return unsub
  }, [])

  const persist = useCallback((m, c, am) => {
    if (remoteRef.current) return
    const data = { modules: m, coaches: c, activeMod: am, updatedAt: Date.now() }
    saveLocal(data)
    if (isConfigured && db) {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        setDoc(doc(db, 'challenge', 'state'), data).catch(e => { console.warn('[FB write]', e); setFbStatus('offline') })
      }, DEBOUNCE)
    }
  }, [])

  useEffect(() => { persist(modules, coaches, activeMod) }, [modules, coaches, activeMod, persist])

  // ── Active module ─────────────────────────────────────────────────────────
  const activeModule  = modules.find(m => m.id === activeMod) || modules[0]
  const modPlayers    = activeModule?.players || []
  const modSettings   = activeModule?.settings || DEFAULT_SETTINGS
  const isProno       = activeModule?.type === 'pronostic'
  const allPeople     = [...modPlayers, ...coaches]
  const totalGoals    = isProno ? 0 : allPeople.reduce((s,p) => s + p.goals, 0)
  const currentTier   = getCurrentTier(totalGoals, modSettings)
  const tierRate      = getTierRate(totalGoals, modSettings)

  // ── Updaters ──────────────────────────────────────────────────────────────
  const updateModPlayers = useCallback((updater) => {
    setModules(prev => prev.map(m => m.id === activeMod ? { ...m, players: updater(m.players) } : m))
  }, [activeMod])

  const updatePerson = useCallback((id, updates) => {
    updateModPlayers(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
    setCoaches(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
  }, [updateModPlayers])

  const addGoal = useCallback((id, coords) => {
    updateModPlayers(prev => prev.map(p => p.id === id ? { ...p, goals: p.goals + 1 } : p))
    setCoaches(prev => prev.map(p => p.id === id ? { ...p, goals: p.goals + 1 } : p))
    if (coords) {
      setGoalBurst({ x: coords.x, y: coords.y, id: Date.now() })
      setTimeout(() => setGoalBurst(null), 700)
    }
  }, [updateModPlayers])

  const removeGoal = useCallback((id) => {
    updateModPlayers(prev => prev.map(p => p.id === id && p.goals > 0 ? { ...p, goals: p.goals - 1 } : p))
    setCoaches(prev => prev.map(p => p.id === id && p.goals > 0 ? { ...p, goals: p.goals - 1 } : p))
  }, [updateModPlayers])

  const addSlot = useCallback((id) => {
    updateModPlayers(prev => prev.map(p => p.id === id ? { ...p, extraSlots: (p.extraSlots||0)+1 } : p))
    setCoaches(prev => prev.map(p => p.id === id ? { ...p, extraSlots: (p.extraSlots||0)+1 } : p))
  }, [updateModPlayers])

  const addPlayer = useCallback(() => {
    const colors = ['#e74c3c','#3498db','#2ecc71','#e67e22','#9b59b6','#1abc9c','#e91e8c','#ff9800']
    const nid = Date.now()
    const base = isProno
      ? { pronos:0, validatedPronos:0, franceScore:'', irelandScore:'', goals:0 }
      : { goals:0, extraSlots:0 }
    updateModPlayers(prev => [...prev, { id:nid, name:`Joueur ${prev.length+1}`, color:colors[prev.length%colors.length], x:40+Math.random()*20, y:40+Math.random()*20, ...base }])
  }, [updateModPlayers, isProno])

  const removePlayer = useCallback((id) => {
    updateModPlayers(prev => prev.filter(p => p.id !== id))
    if (selectedId === id) setSelectedId(null)
  }, [updateModPlayers, selectedId])

  // ── Module management ─────────────────────────────────────────────────────
  const addModule = useCallback(() => {
    const nid = Date.now()
    const num = modules.filter(m => m.type === 'forfaits').length + 1
    setModules(prev => [...prev, makeModule(nid, ordinalName(num))])
    setActiveMod(nid); setTab('module')
  }, [modules])

  const addPronoModule = useCallback(() => {
    const nid = Date.now()
    setModules(prev => [...prev, { ...makePronoModule(nid), name: `Pronostics ${prev.filter(m=>m.type==='pronostic').length+1}` }])
    setActiveMod(nid); setTab('module')
  }, [modules])

  const renameModule   = useCallback((id, name) => { setModules(prev => prev.map(m => m.id===id ? {...m,name} : m)) }, [])
  const removeModule   = useCallback((id) => {
    if (modules.length <= 1) return alert('Impossible de supprimer le dernier module')
    setModules(prev => { const next=prev.filter(m=>m.id!==id); if(activeMod===id) setActiveMod(next[0].id); return next })
  }, [modules.length, activeMod])
  const updateModSettings = useCallback((updates) => { setModules(prev => prev.map(m => m.id===activeMod ? {...m,settings:{...m.settings,...updates}} : m)) }, [activeMod])
  const resetModScores    = useCallback(() => {
    updateModPlayers(prev => prev.map(p => isProno ? {...p,pronos:0,validatedPronos:0,franceScore:'',irelandScore:''} : {...p,goals:0,extraSlots:0}))
    if (!isProno) setCoaches(prev => prev.map(p => ({...p,goals:0,extraSlots:0})))
  }, [updateModPlayers, isProno])
  const resetModPositions = useCallback(() => {
    updateModPlayers(prev => prev.map((p,i) => BASE_PLAYERS[i] ? {...p,x:BASE_PLAYERS[i].x,y:BASE_PLAYERS[i].y} : p))
  }, [updateModPlayers])

  const t1=modSettings.tier1Threshold||40, t2=modSettings.tier2Threshold||50
  const pct1=Math.min(100,(totalGoals/t1)*100), pct2=Math.min(100,Math.max(0,((totalGoals-t1)/(t2-t1))*100)), pct3=Math.min(100,Math.max(0,((totalGoals-t2)/15)*100))

  return (
    <div className="app">
      {/* ── HEADER ── */}
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
                <div className="stat-badge">
                  <span className="stat-num">{totalGoals}</span>
                  <span className="stat-label">FORFAITS</span>
                </div>
                <div className={`stat-badge tier-${currentTier}`}>
                  <span className="stat-num">{tierRate}€</span>
                  <span className="stat-label">/ FORFAIT</span>
                </div>
              </>
            ) : (
              <div className="stat-badge" style={{ borderColor:'rgba(255,152,0,.4)', background:'rgba(255,152,0,.08)' }}>
                <span className="stat-num" style={{ color:'#ff9800' }}>{allPeople.reduce((s,p)=>s+(p.validatedPronos||0),0)}</span>
                <span className="stat-label">VALIDÉS</span>
              </div>
            )}
            <div className="fb-dot">
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
                <div className="tier-fill" style={{ width:`${pct1}%` }} />
              </div>
              <div className="tier-seg tier2" style={{ width:`${((t2-t1)/(t2+15))*100}%` }}>
                <span>{t1+1}→{t2} · {modSettings.tier2Rate}€</span>
                <div className="tier-fill" style={{ width:`${pct2}%` }} />
              </div>
              <div className="tier-seg tier3" style={{ flex:1 }}>
                <span>{t2+1}+ · {modSettings.tier3Rate}€</span>
                <div className="tier-fill" style={{ width:`${pct3}%` }} />
              </div>
            </div>
          </div>
        )}
        <div className="ticker-wrap">
          <div className="ticker-content">
            {isProno ? (
              <><span>🎯 BON PRONOSTIQUEUR · FRANCE VS IRLANDE 08/06/2026</span><span>⭐ PRONOSTIC VALIDÉ = 20€ DE BONUS</span><span>🔧 MANAGER : VALIDEZ LES BONS PRONOSTICS</span></>
            ) : (
              <><span>⚽ PHASE DE PRÉPARATION · JUSQU'AU 11/06/2026</span><span>🏆 OBJECTIF {t2} FORFAITS → {modSettings.tier3Rate}€ RÉTROACTIF</span><span>👑 TOP BUTEUR : {modSettings.topScorerRate}€/FORFAIT · FIN DE PHASE</span><span>🌍 FIFA WORLD CUP 2026 · USA · CANADA · MEXIQUE</span></>
            )}
          </div>
        </div>
      </header>

      {/* ── MODULE TABS ── */}
      <div className="module-tabs-bar">
        <div className="module-tabs-scroll">
          {modules.map(m => (
            <button key={m.id}
              className={`module-tab ${tab==='module' && activeMod===m.id ? 'active' : ''} ${m.type==='pronostic'?'module-tab-prono':''}`}
              onClick={() => { setActiveMod(m.id); setTab('module'); setSelectedId(null) }}
            >
              {m.type==='pronostic' ? '🎯' : '⚽'} {m.name}
            </button>
          ))}
          <button className="module-tab add-module-tab" onClick={addModule}>+ Partie</button>
          <button className="module-tab add-prono-tab" onClick={addPronoModule}>+ Pronostic</button>
        </div>
      </div>

      {/* ── NAV ── */}
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

      {/* ── MAIN ── */}
      <main className="app-main">
        {tab === 'module' && (
          isProno ? (
            <PronosticModule
              players={modPlayers} coaches={coaches}
              dashAuth={dashAuth}
              onUpdatePerson={updatePerson}
            />
          ) : (
            <Pitch
              players={modPlayers} coaches={coaches}
              selectedId={selectedId} onSelect={setSelectedId}
              onUpdatePerson={updatePerson}
              onAddGoal={addGoal} onRemoveGoal={removeGoal} onAddSlot={addSlot}
              allPeople={allPeople} totalGoals={totalGoals} settings={modSettings}
            />
          )
        )}
        {tab === 'leaderboard' && (
          <Leaderboard modules={modules} coaches={coaches} activeModId={activeMod} />
        )}
        {tab === 'rules' && (
          <Rules totalGoals={totalGoals} currentTier={currentTier} settings={modSettings} moduleName={activeModule?.name} />
        )}
        {tab === 'dashboard' && (
          <Dashboard
            modules={modules} coaches={coaches} activeModId={activeMod} onSetActiveMod={setActiveMod}
            allPeople={allPeople} totalGoals={totalGoals} settings={modSettings}
            auth={dashAuth} onAuth={setDashAuth}
            onAddPlayer={addPlayer} onRemovePlayer={removePlayer}
            onUpdatePerson={updatePerson}
            onAddGoal={id=>addGoal(id,null)} onRemoveGoal={removeGoal}
            onResetScores={resetModScores} onResetPositions={resetModPositions}
            onUpdateSettings={updateModSettings}
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
