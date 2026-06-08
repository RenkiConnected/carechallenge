import { useState } from 'react'
import { PRONO_BONUS, getPronoEarnings } from '../utils/bonus'

const SPECIAL_DATE = '2026-06-08'
const isSpecialDay = new Date().toISOString().slice(0, 10) >= SPECIAL_DATE

function getInitials(name) { return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) }

// ── Carte de vote score ──────────────────────────────────────────────────────
function PredictionPoll({ player, onUpdate }) {
  const hasScore = player.franceScore !== '' && player.franceScore !== undefined && 
                   player.irelandScore !== '' && player.irelandScore !== undefined

  return (
    <div className="pred-score-box">
      <div className="pred-flags-row">
        <div className="pred-team">
          <span className="pred-flag">🇫🇷</span>
          <span className="pred-team-name">FRA</span>
        </div>
        <div className="pred-inputs">
          <input className="score-inp"
            type="number" min="0" max="20"
            value={player.franceScore ?? ''}
            placeholder="–"
            onChange={e => onUpdate(player.id, { franceScore: e.target.value === '' ? '' : Number(e.target.value) })}
          />
          <span className="score-colon">:</span>
          <input className="score-inp"
            type="number" min="0" max="20"
            value={player.irelandScore ?? ''}
            placeholder="–"
            onChange={e => onUpdate(player.id, { irelandScore: e.target.value === '' ? '' : Number(e.target.value) })}
          />
        </div>
        <div className="pred-team">
          <span className="pred-flag">🇮🇪</span>
          <span className="pred-team-name">IRL</span>
        </div>
      </div>
      {hasScore && (
        <div className="pred-locked">
          🇫🇷 {player.franceScore} — {player.irelandScore} 🇮🇪
        </div>
      )}
    </div>
  )
}

// ── Carte joueur ─────────────────────────────────────────────────────────────
function PlayerPronoCard({ player, onUpdate, onValidate, onUnvalidate, dashAuth }) {
  const validated = player.validatedPronos || 0
  const total = player.pronos || 0
  const earnings = getPronoEarnings(player)
  const hasWon = validated > 0

  return (
    <div className={`prono-card ${hasWon ? 'prono-card-won' : ''}`}>
      {/* Avatar */}
      <div className="prono-card-avatar-row">
        <div className="prono-avatar-wrap">
          {hasWon && <span className="prono-float-crown">👑</span>}
          <div className="prono-avatar" style={{ background: player.color }}>
            {getInitials(player.name)}
          </div>
          {validated > 0 && <div className="prono-validated-badge">{validated}✓</div>}
        </div>
        <div className="prono-card-info">
          <div className="prono-card-name">{player.name}</div>
          {player.isCoach && <div className="prono-card-role">{player.role}</div>}
          {earnings > 0 && <div className="prono-card-earnings">+{earnings}€</div>}
        </div>
      </div>

      {/* Prediction poll */}
      <PredictionPoll player={player} onUpdate={onUpdate} />

      {/* Pronostic balls */}
      <div className="prono-balls-section">
        <div className="prono-balls-label">Pronostics enregistrés</div>
        <div className="prono-balls-row">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`prono-ball ${i < validated ? 'prono-ball-won' : 'prono-ball-pending'}`}>⚽</span>
          ))}
          <button className="add-prono-ball" onClick={() => onUpdate(player.id, { pronos: total + 1 })} title="Ajouter un pronostic">+</button>
          {total > 0 && (
            <button className="rem-prono-ball" onClick={() => onUpdate(player.id, { pronos: Math.max(0, total - 1), validatedPronos: Math.min(validated, Math.max(0, total - 1)) })} title="Retirer">−</button>
          )}
        </div>
      </div>

      {/* Manager: validate */}
      {dashAuth && total > 0 && (
        <div className="prono-manager-actions">
          {validated < total && (
            <button className="prono-validate-btn" onClick={() => onValidate(player.id)}>
              ✓ Valider pronostic
            </button>
          )}
          {validated > 0 && (
            <button className="prono-unvalidate-btn" onClick={() => onUnvalidate(player.id)}>
              ✕ Annuler
            </button>
          )}
        </div>
      )}

      {/* Win display */}
      {hasWon && (
        <div className="prono-won-label">
          👑 {validated} juste{validated > 1 ? 's' : ''} · <strong>+{earnings}€</strong>
        </div>
      )}
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function PronosticModule({ players, coaches, dashAuth, onUpdatePerson }) {
  const allPeople = [...players, ...coaches]

  const onValidate = (id) => {
    const p = allPeople.find(x => x.id === id)
    if (!p) return
    onUpdatePerson(id, { validatedPronos: Math.min((p.validatedPronos || 0) + 1, (p.pronos || 0)) })
  }

  const onUnvalidate = (id) => {
    const p = allPeople.find(x => x.id === id)
    if (!p) return
    onUpdatePerson(id, { validatedPronos: Math.max(0, (p.validatedPronos || 0) - 1) })
  }

  const totalPronos    = allPeople.reduce((s, p) => s + (p.pronos || 0), 0)
  const totalValidated = allPeople.reduce((s, p) => s + (p.validatedPronos || 0), 0)
  const totalEarnings  = allPeople.reduce((s, p) => s + getPronoEarnings(p), 0)

  // Qui a voté quoi (résumé)
  const predictions = allPeople.filter(p => p.franceScore !== '' && p.franceScore !== undefined && p.irelandScore !== '' && p.irelandScore !== undefined)
  const voteMap = {}
  predictions.forEach(p => {
    const key = `${p.franceScore}-${p.irelandScore}`
    if (!voteMap[key]) voteMap[key] = { score: key, count: 0, players: [] }
    voteMap[key].count++
    voteMap[key].players.push(p.name)
  })
  const sortedVotes = Object.values(voteMap).sort((a, b) => b.count - a.count)

  return (
    <div className="prono-module">
      {/* ── Header ── */}
      <div className="prono-module-header">
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:'2rem' }}>🎯</span>
          <div>
            <div className="pmt-title">BON PRONOSTIQUEUR</div>
            <div className="pmt-sub">Challenge dans le challenge</div>
          </div>
        </div>
        {isSpecialDay && (
          <div className="special-day-pill">⭐ JOUR SPÉCIAL · 20€/PRONOSTIC JUSTE</div>
        )}
      </div>

      {/* ── Match card France vs Irlande ── */}
      <div className="match-card-big">
        <div className="match-card-overlay" />
        <div className="match-card-inner">
          <div className="match-card-label">📋 SONDAGE PRONOSTIC</div>
          <div className="match-teams-big">
            <div className="match-team-block france-side">
              <span className="match-big-flag">🇫🇷</span>
              <span className="match-team-name">FRANCE</span>
            </div>
            <div className="match-center-block">
              <div className="match-vs">VS</div>
              <div className="match-date">08 JUN 2026</div>
              <div className="match-competition">Coupe du Monde 2026</div>
            </div>
            <div className="match-team-block ireland-side">
              <span className="match-big-flag">🇮🇪</span>
              <span className="match-team-name">IRLANDE</span>
            </div>
          </div>
          <div className="match-bonus-tag">
            Pronostic correct = <strong style={{ color:'#ffd700' }}>{PRONO_BONUS}€</strong> de bonus 🏆
          </div>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="prono-stats-bar">
        <div className="prono-stat-item">
          <div className="psi-num">{totalPronos}</div>
          <div className="psi-label">Pronostics</div>
        </div>
        <div className="prono-stat-item">
          <div className="psi-num" style={{ color:'#ffd700' }}>{totalValidated}</div>
          <div className="psi-label">Validés ✓</div>
        </div>
        <div className="prono-stat-item">
          <div className="psi-num" style={{ color:'#2ecc71' }}>{predictions.length}/{allPeople.length}</div>
          <div className="psi-label">Ont voté</div>
        </div>
        <div className="prono-stat-item">
          <div className="psi-num" style={{ color:'#ff9800' }}>{totalEarnings}€</div>
          <div className="psi-label">Bonus total</div>
        </div>
      </div>

      {/* ── Synthèse des votes ── */}
      {sortedVotes.length > 0 && (
        <div className="votes-summary">
          <div className="votes-summary-title">📊 Répartition des pronostics</div>
          <div className="votes-summary-grid">
            {sortedVotes.map(v => (
              <div key={v.score} className="vote-item">
                <div className="vote-score">🇫🇷 {v.score.split('-')[0]} — {v.score.split('-')[1]} 🇮🇪</div>
                <div className="vote-players">{v.players.join(', ')}</div>
                <div className="vote-count">{v.count} joueur{v.count > 1 ? 's' : ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Grille joueurs ── */}
      <div className="prono-grid">
        {allPeople.map(player => (
          <PlayerPronoCard
            key={player.id}
            player={player}
            onUpdate={onUpdatePerson}
            onValidate={onValidate}
            onUnvalidate={onUnvalidate}
            dashAuth={dashAuth}
          />
        ))}
      </div>

      {!dashAuth && totalPronos > 0 && (
        <div style={{ textAlign:'center', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.78rem', color:'rgba(240,244,255,.38)', marginTop:8, paddingBottom:20 }}>
          🔧 Connectez-vous en Manager pour valider les bons pronostics
        </div>
      )}
    </div>
  )
}
