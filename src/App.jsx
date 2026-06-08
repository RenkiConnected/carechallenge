import { useState, useEffect } from 'react'
import Pitch from './components/Pitch'
import Leaderboard from './components/Leaderboard'
import Rules from './components/Rules'
import Dashboard from './components/Dashboard'
import { getCurrentTier, getTierRate } from './utils/bonus'

const DEFAULT_PLAYERS = [
  { id: 1, name: 'Alex', goals: 0, extraSlots: 0, x: 28, y: 28, color: '#e74c3c' },
  { id: 2, name: 'Jordan', goals: 0, extraSlots: 0, x: 50, y: 22, color: '#3498db' },
  { id: 3, name: 'Morgan', goals: 0, extraSlots: 0, x: 72, y: 28, color: '#2ecc71' },
  { id: 4, name: 'Taylor', goals: 0, extraSlots: 0, x: 28, y: 72, color: '#e67e22' },
  { id: 5, name: 'Casey', goals: 0, extraSlots: 0, x: 50, y: 78, color: '#9b59b6' },
  { id: 6, name: 'Riley', goals: 0, extraSlots: 0, x: 72, y: 72, color: '#1abc9c' },
  { id: 7, name: 'Sam', goals: 0, extraSlots: 0, x: 38, y: 50, color: '#e91e8c' },
  { id: 8, name: 'Chris', goals: 0, extraSlots: 0, x: 62, y: 50, color: '#ff9800' },
]

const DEFAULT_COACHES = [
  { id: 'david', name: 'David', goals: 0, extraSlots: 0, x: 6, y: 38, color: '#ffd700', isCoach: true, role: 'Coach' },
  { id: 'yannis', name: 'Yannis', goals: 0, extraSlots: 0, x: 6, y: 62, color: '#dda0dd', isCoach: true, role: 'Adj.' },
]

function loadState() {
  try {
    const raw = localStorage.getItem('fc2026_state')
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

export default function App() {
  const saved = loadState()
  const [players, setPlayers] = useState(saved?.players || DEFAULT_PLAYERS)
  const [coaches, setCoaches] = useState(saved?.coaches || DEFAULT_COACHES)
  const [tab, setTab] = useState('pitch')
  const [selectedId, setSelectedId] = useState(null)
  const [dashAuth, setDashAuth] = useState(false)
  const [goalBurst, setGoalBurst] = useState(null)

  useEffect(() => {
    try {
      localStorage.setItem('fc2026_state', JSON.stringify({ players, coaches }))
    } catch {}
  }, [players, coaches])

  const allPeople = [...players, ...coaches]
  const totalGoals = allPeople.reduce((s, p) => s + p.goals, 0)
  const currentTier = getCurrentTier(totalGoals)
  const tierRate = getTierRate(totalGoals)

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
    const newId = Date.now()
    const idx = players.filter(p => !p.isCoach).length
    setPlayers(prev => [...prev, {
      id: newId,
      name: `Joueur ${idx + 1}`,
      goals: 0,
      extraSlots: 0,
      x: 35 + Math.random() * 30,
      y: 35 + Math.random() * 30,
      color: colors[Math.floor(Math.random() * colors.length)],
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
    setPlayers(DEFAULT_PLAYERS.map((dp, i) => {
      const existing = players.find(p => p.id === dp.id)
      return existing ? { ...existing, x: dp.x, y: dp.y } : players[i] ? { ...players[i], x: dp.x, y: dp.y } : dp
    }))
  }

  const selectedPerson = allPeople.find(p => p.id === selectedId)

  return (
    <div className="app">
      {/* HEADER */}
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
          </div>
        </div>
        <div className="tier-bar">
          <div className="tier-segments">
            <div className="tier-seg tier1" style={{ width: '40%' }}>
              <span>0→40 · 10€</span>
              <div className="tier-fill" style={{ width: `${Math.min(100, (totalGoals / 40) * 100)}%` }} />
            </div>
            <div className="tier-seg tier2" style={{ width: '30%' }}>
              <span>41→50 · 12€</span>
              <div className="tier-fill" style={{ width: `${Math.min(100, Math.max(0, ((totalGoals - 40) / 10) * 100))}%` }} />
            </div>
            <div className="tier-seg tier3" style={{ width: '30%' }}>
              <span>51+ · 15€</span>
              <div className="tier-fill" style={{ width: `${Math.min(100, Math.max(0, ((totalGoals - 50) / 15) * 100))}%` }} />
            </div>
          </div>
        </div>
        <div className="ticker-wrap">
          <div className="ticker-content">
            <span>⚽ PHASE DE PRÉPARATION · JUSQU'AU 11/06/2026</span>
            <span>🏆 OBJECTIF : 50 FORFAITS POUR ATTEINDRE 15€/FORFAIT</span>
            <span>👑 MEILLEUR BUTEUR : 20€ PAR FORFAIT</span>
            <span>🌍 FIFA WORLD CUP 2026 · USA · CANADA · MEXIQUE</span>
          </div>
        </div>
      </header>

      {/* NAV */}
      <nav className="app-nav">
        {[
          { key: 'pitch', icon: '⚽', label: 'Terrain' },
          { key: 'leaderboard', icon: '🏆', label: 'Classement' },
          { key: 'rules', icon: '📋', label: 'Règles' },
          { key: 'dashboard', icon: '🔧', label: 'Manager' },
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

      {/* MAIN */}
      <main className="app-main">
        {tab === 'pitch' && (
          <Pitch
            players={players}
            coaches={coaches}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onUpdatePerson={updatePerson}
            onAddGoal={addGoal}
            onRemoveGoal={removeGoal}
            onAddSlot={addSlot}
            allPeople={allPeople}
            totalGoals={totalGoals}
          />
        )}
        {tab === 'leaderboard' && (
          <Leaderboard players={allPeople} totalGoals={totalGoals} />
        )}
        {tab === 'rules' && <Rules totalGoals={totalGoals} currentTier={currentTier} />}
        {tab === 'dashboard' && (
          <Dashboard
            players={players}
            coaches={coaches}
            allPeople={allPeople}
            totalGoals={totalGoals}
            auth={dashAuth}
            onAuth={setDashAuth}
            onAddPlayer={addPlayer}
            onRemovePlayer={removePlayer}
            onUpdatePerson={updatePerson}
            onAddGoal={(id) => addGoal(id, null)}
            onRemoveGoal={removeGoal}
            onResetScores={resetScores}
            onResetPositions={resetPositions}
            currentTier={currentTier}
            tierRate={tierRate}
          />
        )}
      </main>

      {/* GOAL BURST ANIMATION */}
      {goalBurst && (
        <div
          key={goalBurst.id}
          className="goal-burst"
          style={{ left: goalBurst.x - 20, top: goalBurst.y - 20, position: 'fixed' }}
        >
          ⚽
        </div>
      )}
    </div>
  )
}
