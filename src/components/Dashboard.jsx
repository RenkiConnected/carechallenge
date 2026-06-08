import { useState } from 'react'
import { getPlayerEarnings, isTopScorer, hasHatTrick } from '../utils/bonus'

const PASSWORD = 'Raphael2232'

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function ColorPicker({ current, onChange }) {
  const colors = ['#e74c3c','#3498db','#2ecc71','#e67e22','#9b59b6','#1abc9c','#e91e8c','#ff9800','#00bcd4','#ffd700','#ff6b35','#c0392b']
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', padding: '6px 0' }}>
      {colors.map(c => (
        <button
          key={c}
          onClick={() => onChange(c)}
          style={{
            width: 20, height: 20,
            borderRadius: '50%',
            background: c,
            border: current === c ? '2px solid #fff' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'transform 0.15s',
            transform: current === c ? 'scale(1.2)' : 'scale(1)',
            outline: 'none',
          }}
        />
      ))}
    </div>
  )
}

function PlayerRow({ player, onUpdate, onRemoveGoal, onAddGoal, onRemove, allPeople, totalGoals }) {
  const [expanded, setExpanded] = useState(false)
  const earnings = getPlayerEarnings(player, allPeople, totalGoals)
  const isTop = isTopScorer(player, allPeople)

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 2 }}>
      <div className="player-manage-row">
        <div
          className="pm-avatar"
          style={{ background: player.color, cursor: 'pointer' }}
          onClick={() => setExpanded(!expanded)}
        >
          {getInitials(player.name)}
        </div>

        <input
          className="pm-name-input"
          value={player.name}
          onChange={e => onUpdate(player.id, { name: e.target.value })}
          placeholder="Nom du joueur"
        />

        {player.isCoach && (
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '0.65rem',
            color: 'var(--gold)',
            fontWeight: 700,
            letterSpacing: 0.5,
            flexShrink: 0,
          }}>
            {player.role}
          </span>
        )}

        {/* Goals stepper */}
        <div className="pm-goals">
          <button className="pm-goal-btn" onClick={() => onRemoveGoal(player.id)}>−</button>
          <span className="pm-goal-num">{player.goals}</span>
          <button className="pm-goal-btn" onClick={() => onAddGoal(player.id)}>+</button>
        </div>

        {/* Earnings */}
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '1rem',
          color: isTop ? '#ff6b35' : earnings > 0 ? 'var(--gold)' : 'rgba(240,244,255,0.3)',
          minWidth: 42,
          textAlign: 'right',
          flexShrink: 0,
        }}>
          {earnings}€
        </div>

        {/* Delete (not for coaches) */}
        {!player.isCoach && (
          <button
            className="pm-remove-btn"
            onClick={() => {
              if (window.confirm(`Supprimer ${player.name} ?`)) onRemove(player.id)
            }}
          >
            🗑
          </button>
        )}
      </div>

      {/* Expanded color picker */}
      {expanded && (
        <div style={{ padding: '4px 0 8px 48px' }}>
          <ColorPicker
            current={player.color}
            onChange={color => onUpdate(player.id, { color })}
          />
        </div>
      )}
    </div>
  )
}

export default function Dashboard({
  players, coaches, allPeople, totalGoals,
  auth, onAuth, onAddPlayer, onRemovePlayer,
  onUpdatePerson, onAddGoal, onRemoveGoal,
  onResetScores, onResetPositions,
  currentTier, tierRate,
}) {
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState(false)

  const handleLogin = () => {
    if (pwInput === PASSWORD) {
      onAuth(true)
      setPwError(false)
    } else {
      setPwError(true)
      setTimeout(() => setPwError(false), 1000)
    }
  }

  if (!auth) {
    return (
      <div className="dashboard-auth">
        <div className="auth-card">
          <div className="auth-icon">🔐</div>
          <div className="auth-title">ACCÈS MANAGER</div>
          <div className="auth-sub">Réservé aux encadrants</div>
          <input
            className={`auth-input ${pwError ? 'error' : ''}`}
            type="password"
            placeholder="Mot de passe"
            value={pwInput}
            onChange={e => setPwInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          {pwError && (
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '0.8rem',
              color: 'var(--red)',
              marginBottom: 8,
              letterSpacing: 1,
            }}>
              ✕ Mot de passe incorrect
            </div>
          )}
          <button className="auth-btn" onClick={handleLogin}>
            ENTRER ⚡
          </button>
        </div>
      </div>
    )
  }

  const totalEarnings = allPeople.reduce(
    (s, p) => s + getPlayerEarnings(p, allPeople, totalGoals), 0
  )
  const playersWithHatTrick = allPeople.filter(p => hasHatTrick(p)).length
  const topScorerPlayer = [...allPeople].sort((a, b) => b.goals - a.goals)[0]

  return (
    <div className="dashboard">
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: 2, color: 'var(--text)' }}>
            🔧 TABLEAU DE BORD
          </div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem', color: 'rgba(240,244,255,0.5)', letterSpacing: 1, textTransform: 'uppercase' }}>
            Gestion du challenge
          </div>
        </div>
        <button
          onClick={() => onAuth(false)}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '6px 12px',
            color: 'rgba(240,244,255,0.6)',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '0.75rem',
            cursor: 'pointer',
            letterSpacing: 1,
          }}
        >
          🔒 Déconnexion
        </button>
      </div>

      {/* Stats overview */}
      <div className="dash-section">
        <div className="dash-section-title">Aperçu global</div>
        <div className="dash-stats-grid">
          <div className="dash-stat-card">
            <div className="dsc-num">{totalGoals}</div>
            <div className="dsc-label">Total forfaits</div>
          </div>
          <div className="dash-stat-card">
            <div className="dsc-num" style={{ color: 'var(--teal)' }}>{totalEarnings}€</div>
            <div className="dsc-label">Primes totales</div>
          </div>
          <div className="dash-stat-card">
            <div className="dsc-num" style={{ color: tierRate === 15 ? 'var(--gold)' : tierRate === 12 ? 'var(--teal)' : 'var(--tier1)' }}>
              {tierRate}€
            </div>
            <div className="dsc-label">Taux actuel</div>
          </div>
          <div className="dash-stat-card">
            <div className="dsc-num" style={{ color: '#ff6b35' }}>{playersWithHatTrick}</div>
            <div className="dsc-label">Hat-Tricks 👑</div>
          </div>
        </div>

        {topScorerPlayer && topScorerPlayer.goals > 0 && (
          <div style={{
            marginTop: 12,
            background: 'rgba(255,107,53,0.08)',
            border: '1px solid rgba(255,107,53,0.2)',
            borderRadius: 8,
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <span style={{ fontSize: '1.3rem' }}>⭐</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.85rem', color: '#ff6b35', letterSpacing: 0.5 }}>
                TOP BUTEUR ACTUEL
              </div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.8rem', color: 'rgba(240,244,255,0.7)' }}>
                {topScorerPlayer.name} · {topScorerPlayer.goals} forfait{topScorerPlayer.goals > 1 ? 's' : ''}
              </div>
            </div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem', color: '#ff6b35' }}>
              {getPlayerEarnings(topScorerPlayer, allPeople, totalGoals)}€
            </div>
          </div>
        )}
      </div>

      {/* Tier progress controls */}
      <div className="dash-section">
        <div className="dash-section-title">Progression des paliers</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'Palier 1 → 2 (40 forfaits)', target: 40, color: 'var(--tier1)' },
            { label: 'Palier 2 → 3 (50 forfaits)', target: 50, color: 'var(--teal)' },
          ].map(({ label, target, color }) => (
            <div key={target}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem', color: 'rgba(240,244,255,0.6)' }}>
                  {label}
                </span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem', color }}>
                  {Math.min(totalGoals, target)}/{target}
                </span>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, (totalGoals / target) * 100)}%`,
                  background: color,
                  borderRadius: 4,
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Player management */}
      <div className="dash-section">
        <div className="dash-section-title">Gestion des joueurs</div>

        {/* Coaches first */}
        {coaches.map(coach => (
          <PlayerRow
            key={coach.id}
            player={coach}
            onUpdate={onUpdatePerson}
            onAddGoal={onAddGoal}
            onRemoveGoal={onRemoveGoal}
            onRemove={() => {}}
            allPeople={allPeople}
            totalGoals={totalGoals}
          />
        ))}

        {/* Players */}
        {players.map(player => (
          <PlayerRow
            key={player.id}
            player={player}
            onUpdate={onUpdatePerson}
            onAddGoal={onAddGoal}
            onRemoveGoal={onRemoveGoal}
            onRemove={onRemovePlayer}
            allPeople={allPeople}
            totalGoals={totalGoals}
          />
        ))}

        <div className="btn-row">
          <button className="btn-primary" onClick={onAddPlayer}>
            + Ajouter un joueur
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="dash-section" style={{ borderColor: 'rgba(255,68,68,0.2)' }}>
        <div className="dash-section-title" style={{ color: 'rgba(255,68,68,0.7)' }}>Zone danger</div>
        <div className="btn-row">
          <button
            className="btn-danger"
            onClick={() => {
              if (window.confirm('⚠️ Réinitialiser TOUS les scores ? Cette action est irréversible.')) {
                onResetScores()
              }
            }}
          >
            🔄 Reset scores
          </button>
          <button
            className="btn-danger"
            onClick={() => {
              if (window.confirm('Réinitialiser les positions sur le terrain ?')) {
                onResetPositions()
              }
            }}
          >
            📍 Reset positions
          </button>
        </div>
      </div>

      {/* Instructions reminder */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10,
        padding: '14px',
        marginBottom: 24,
      }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.75rem', letterSpacing: 2, color: 'rgba(240,244,255,0.4)', textTransform: 'uppercase', marginBottom: 8 }}>
          💡 Guide rapide
        </div>
        <ul style={{ fontFamily: "'Barlow', sans-serif", fontSize: '0.78rem', color: 'rgba(240,244,255,0.5)', lineHeight: 1.8, paddingLeft: 16 }}>
          <li>Onglet Terrain → cliquer un avatar pour ouvrir le panneau de vote</li>
          <li>Glisser-déposer les avatars pour les repositionner</li>
          <li>Cliquer sur un ballon ⚽ = valider un forfait</li>
          <li>Cliquer sur un ballon rempli = annuler ce forfait</li>
          <li>Cliquer sur le nom du joueur dans le panneau pour le renommer</li>
          <li>Ici, gérer joueurs, couleurs et scores manuellement</li>
        </ul>
      </div>
    </div>
  )
}
