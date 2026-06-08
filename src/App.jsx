import { useState, useEffect, useRef, useCallback } from 'react'
import Pitch from './components/Pitch'
import Leaderboard from './components/Leaderboard'
import Rules from './components/Rules'
import Dashboard from './components/Dashboard'
import { getCurrentTier, getTierRate, DEFAULT_SETTINGS } from './utils/bonus'
import { db, isConfigured, doc, setDoc, onSnapshot } from './firebase'

const DEFAULT_PLAYERS = [
  { id: 1, name: 'Alex',   goals: 0, extraSlots: 0, x: 28, y: 28, color: '#e74c3c' },
  { id: 2, name: 'Jordan', goals: 0, extraSlots: 0, x: 50, y: 22, color: '#3498db' },
  { id: 3, name: 'Morgan', goals: 0, extraSlots: 0, x: 72, y: 28, color: '#2ecc71' },
  { id: 4, name: 'Taylor', goals: 0, extraSlots: 0, x: 28, y: 72, color: '#e67e22' },
  { id: 5, name: 'Casey',  goals: 0, extraSlots: 0, x: 50, y: 78, color: '#9b59b6' },
  { id: 6, name: 'Riley',  goals: 0, extraSlots: 0, x: 72, y: 72, color: '#1abc9c' },
  { id: 7, name: 'Sam',    goals: 0, extraSlots: 0, x: 38, y: 50, color: '#e91e8c' },
  { id: 8, name: 'Chris',  goals: 0, extraSlots: 0, x: 62, y: 50, color: '#ff9800' },
]

const DEFAULT_COACHES = [
  { id: 'david',  name: 'David',  goals: 0, extraSlots: 0, x: 6, y: 38, color: '#ffd700', isCoach: true, role: 'Coach' },
  { id: 'yannis', name: 'Yannis', goals: 0, extraSlots: 0, x: 6, y: 62, color: '#dda0dd', isCoach: true, role: 'Adj.' },
]

// ─── LocalStorage fallback ───────────────────────────────────────────────────
function loadLocal() {
  try {
    const raw = localStorage.getItem('fc2026_v2')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
function saveLocal(data) {
  try { localStorage.setItem('fc2026_v2', JSON.stringify(data)) } catch {}
}

const DEBOUNCE_MS = 800

export default function App() {
  const [players,  setPlayers]  = useState(DEFAULT_PLAYERS)
  const [coaches,  setCoaches]  = useState(DEFAULT_COACHES)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [tab,      setTab]      = useState('pitch')
  const [selectedId, setSelectedId] = useState(null)
  const [dashAuth,   setDashAuth]   = useState(false)
  const [fbStatus,   setFbStatus]   = useState('connecting') // 'connecting' | 'ok' | 'offline'
  const [goalBurst,  setGoalBurst]  = useState(null)
  const saveTimer = useRef(null)
  const remoteRef = useRef(false) // évite boucle infinie

  // ── Charger depuis Firebase ou localStorage au démarrage ────────────────────
  useEffect(() => {
    if (!isConfigured || !db) {
      const saved = loadLocal()
      if (saved) {
        if (saved.players)  setPlayers(saved.players)
        if (saved.coaches)  setCoaches(saved.coaches)
        if (saved.settings) setSettings({ ...DEFAULT_SETTINGS, ...saved.settings })
      }
      setFbStatus('offline')
      return
    }

    // Firebase onSnapshot : écoute les changements en temps réel
    const unsubscribe = onSnapshot(
      doc(db, 'challenge', 'state'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data()
          remoteRef.current = true
          if (data.players)  setPlayers(data.players)
          if (data.coaches)  setCoaches(data.coaches)
          if (data.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.settings })
          setTimeout(() => { remoteRef.current = false }, 100)
        }
        setFbStatus('ok')
      },
      (err) => {
        console.warn('[Firebase] Erreur lecture:', err)
        const saved = loadLocal()
        if (saved) {
          if (saved.players)  setPlayers(saved.players)
          if (saved.coaches)  setCoaches(saved.coaches)
          if (saved.settings) setSettings({ ...DEFAULT_SETTINGS, ...saved.settings })
        }
        setFbStatus('offline')
      }
    )
    return unsubscribe
  }, [])

  // ── Sauvegarder (debounced) ──────────────────────────────────────────────────
  const persistState = useCallback((p, c, s) => {
    if (remoteRef.current) return
    const data = { players: p, coaches: c, settings: s, updatedAt: Date.now() }
    saveLocal(data)
    if (isConfigured && db) {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        setDoc(doc(db, 'challenge', 'state'), data).catch(err => {
          console.warn('[Firebase] Erreur écriture:', err)
          setFbStatus('offline')
        })
      }, DEBOUNCE_MS)
    }
  }, [])

  useEffect(() => { persistState(players, coaches, settings) }, [players, coaches, settings, persistState])

  // ── Computed ─────────────────────────────────────────────────────────────────
  const allPeople  = [...players, ...coaches]
  const totalGoals = allPeople.reduce((s, p) => s + p.goals, 0)
  const currentTier = getCurrentTier(totalGoals, settings)
  const tierRate    = getTierRate(totalGoals, settings)

  // ── Actions ──────────────────────────────────────────────────────────────────
  const updatePerson = (id, updates) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
    setCoaches(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
  }

  const addGoal = (id, coords) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, goals: p.goals + 1 } : p))
    setCoaches(prev => prev.map(p => p.id === id ? { ...p, goals: p.goals + 1 } : p))
    if (coords) {
      setGoalBurst({ x: coords.x, y: coords.y, id: Date.now() })
      setTimeout(() => setGoalBurst(null), 700)
    }
  }

  const removeGoal = (id) => {
    setPlayers(prev => prev.map(p => p.id === id && p.goals > 0 ? { ...p, goals: p.goals - 1 } : p))
    setCoaches(prev => prev.map(p => p.id === id && p.goals > 0 ? { ...p, goals: p.goals - 1 } : p))
  }

  const addSlot = (id) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, extraSlots: (p.extraSlots || 0) + 1 } : p))
    setCoaches(prev => prev.map(p => p.id === id ? { ...p, extraSlots: (p.extraSlots || 0) + 1 } : p))
  }

  const addPlayer = () => {
    const colors = ['#e74c3c','#3498db','#2ecc71','#e67e22','#9b59b6','#1abc9c','#e91e8c','#ff9800','#00bcd4','#f44336']
    const idx = players.length
    setPlayers(prev => [...prev, {
      id: Date.now(),
      name: `Joueur ${idx + 1}`,
      goals: 0, extraSlots: 0,
      x: 35 + Math.random() * 30,
      y: 35 + Math.random() * 30,
      color: colors[idx % colors.length],
    }])
  }

  const removePlayer = (id) => {
    setPlayers(prev => prev.filter(p => p.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const resetScores = () => {
    setPlayers(prev => prev.map(p => ({ ...p, goals: 0, extraSlots: 0 })))
    setCoaches(prev => prev.map(p => ({ ...p, goals: 0, extraSlots: 0 })))
  }

  const resetPositions = () => {
    setPlayers(prev => prev.map((p, i) => {
      const def = DEFAULT_PLAYERS[i]
      return def ? { ...p, x: def.x, y: def.y } : p
    }))
  }

  const updateSettings = (updates) => {
    setSettings(prev => ({ ...prev, ...updates }))
  }

  // ── Progress bar widths ───────────────────────────────────────────────────────
  const t1 = settings.tier1Threshold || 40
  const t2 = settings.tier2Threshold || 50
  const pct1 = Math.min(100, (totalGoals / t1) * 100)
  const pct2 = Math.min(100, Math.max(0, ((totalGoals - t1) / (t2 - t1)) * 100))
  const pct3 = Math.min(100, Math.max(0, ((totalGoals - t2) / 15) * 100))

  return (
    <div className="app">
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header className="app-header">
        <div className="header-content">
          <div className="header-logo">🏆</div>
          <div className="header-text">
            <h1>COUPE DU MONDE 2026</h1>
            <p>Challenge Forfaits · Phase de Préparation</p>
          </div>
          <div className="header-stats">
            <div className="stat-badge">
              <span className="stat-num">{totalGoals}</span>
              <span className="stat-label">FORFAITS</span>
            </div>
            <div className={`stat-badge tier-${currentTier}`}>
              <span className="stat-num">{tierRate}€</span>
              <span className="stat-label">/ FORFAIT</span>
            </div>
            {/* Firebase status */}
            <div className="fb-dot" title={fbStatus === 'ok' ? 'Firebase connecté' : fbStatus === 'offline' ? 'Mode hors-ligne' : 'Connexion...'}>
              <span style={{ color: fbStatus === 'ok' ? '#2ecc71' : fbStatus === 'offline' ? '#e67e22' : '#ffd700' }}>
                {fbStatus === 'ok' ? '●' : fbStatus === 'offline' ? '◌' : '○'}
              </span>
              <span className="fb-dot-label">{fbStatus === 'ok' ? 'Live' : fbStatus === 'offline' ? 'Local' : '...'}</span>
            </div>
          </div>
        </div>

        {/* Tier progress bar */}
        <div className="tier-bar">
          <div className="tier-segments">
            <div className="tier-seg tier1" style={{ width: `${(t1 / (t2 + 15)) * 100}%` }}>
              <span>0→{t1} · {settings.tier1Rate}€</span>
              <div className="tier-fill" style={{ width: `${pct1}%` }} />
            </div>
            <div className="tier-seg tier2" style={{ width: `${((t2 - t1) / (t2 + 15)) * 100}%` }}>
              <span>{t1+1}→{t2} · {settings.tier2Rate}€</span>
              <div className="tier-fill" style={{ width: `${pct2}%` }} />
            </div>
            <div className="tier-seg tier3" style={{ flex: 1 }}>
              <span>{t2+1}+ · {settings.tier3Rate}€</span>
              <div className="tier-fill" style={{ width: `${pct3}%` }} />
            </div>
          </div>
        </div>

        <div className="ticker-wrap">
          <div className="ticker-content">
            <span>⚽ PHASE DE PRÉPARATION · JUSQU'AU 11/06/2026</span>
            <span>🏆 OBJECTIF {t2} FORFAITS → {settings.tier3Rate}€/FORFAIT</span>
            <span>👑 MEILLEUR BUTEUR : {settings.topScorerRate}€ PAR FORFAIT</span>
            <span>🌍 FIFA WORLD CUP 2026 · USA · CANADA · MEXIQUE</span>
          </div>
        </div>
      </header>

      {/* ── NAV ───────────────────────────────────────────────────────────── */}
      <nav className="app-nav">
        {[
          { key: 'pitch',       icon: '⚽', label: 'Terrain'    },
          { key: 'leaderboard', icon: '🏆', label: 'Classement' },
          { key: 'rules',       icon: '📋', label: 'Règles'     },
          { key: 'dashboard',   icon: '🔧', label: 'Manager'    },
        ].map(({ key, icon, label }) => (
          <button
            key={key}
            className={`nav-btn ${tab === key ? 'active' : ''}`}
            onClick={() => { setTab(key); setSelectedId(null) }}
          >
            <span className="nav-icon">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* ── MAIN ──────────────────────────────────────────────────────────── */}
      <main className="app-main">
        {tab === 'pitch' && (
          <Pitch
            players={players} coaches={coaches}
            selectedId={selectedId} onSelect={setSelectedId}
            onUpdatePerson={updatePerson}
            onAddGoal={addGoal} onRemoveGoal={removeGoal} onAddSlot={addSlot}
            allPeople={allPeople} totalGoals={totalGoals} settings={settings}
          />
        )}
        {tab === 'leaderboard' && (
          <Leaderboard players={allPeople} totalGoals={totalGoals} settings={settings} />
        )}
        {tab === 'rules' && (
          <Rules totalGoals={totalGoals} currentTier={currentTier} settings={settings} />
        )}
        {tab === 'dashboard' && (
          <Dashboard
            players={players} coaches={coaches} allPeople={allPeople}
            totalGoals={totalGoals} settings={settings}
            auth={dashAuth} onAuth={setDashAuth}
            onAddPlayer={addPlayer} onRemovePlayer={removePlayer}
            onUpdatePerson={updatePerson}
            onAddGoal={(id) => addGoal(id, null)} onRemoveGoal={removeGoal}
            onResetScores={resetScores} onResetPositions={resetPositions}
            onUpdateSettings={updateSettings}
            currentTier={currentTier} tierRate={tierRate}
            fbStatus={fbStatus}
          />
        )}
      </main>

      {/* Goal burst animation */}
      {goalBurst && (
        <div key={goalBurst.id} className="goal-burst"
          style={{ left: goalBurst.x - 20, top: goalBurst.y - 20 }}>
          ⚽
        </div>
      )}
    </div>
  )
}
