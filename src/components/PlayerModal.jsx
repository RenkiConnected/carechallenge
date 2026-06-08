import { useState, useEffect } from 'react'
import { getPlayerEarnings, isTopScorer, hasHatTrick } from '../utils/bonus'

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function PlayerModal({
  player, allPeople, totalGoals,
  onAddGoal, onRemoveGoal, onAddSlot, onUpdatePerson, onClose,
}) {
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(player.name)
  const [lastFilled, setLastFilled] = useState(null)

  useEffect(() => {
    setNameVal(player.name)
  }, [player.name])

  const earnings = getPlayerEarnings(player, allPeople, totalGoals)
  const isTop = isTopScorer(player, allPeople)
  const hatTrick = hasHatTrick(player)

  const totalSlots = Math.max(3, player.goals) + (player.extraSlots || 0) + (player.goals >= (Math.max(3, player.goals) + (player.extraSlots || 0)) ? 0 : 0)
  const displaySlots = Math.max(3 + (player.extraSlots || 0), player.goals + 1)

  const handleBallClick = (ballIndex, e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2

    if (ballIndex < player.goals) {
      // Filled ball → remove goal
      onRemoveGoal(player.id)
    } else {
      // Empty ball → add goal
      onAddGoal(player.id, { x: cx, y: cy })
      setLastFilled(ballIndex)
      setTimeout(() => setLastFilled(null), 500)
    }
  }

  const handleNameSave = () => {
    if (nameVal.trim()) {
      onUpdatePerson(player.id, { name: nameVal.trim() })
    }
    setEditingName(false)
  }

  const balls = Array.from({ length: displaySlots }, (_, i) => i)

  return (
    <div className="player-modal-overlay" onClick={onClose}>
      <div className="player-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-player-circle" style={{ background: player.color }}>
            {hatTrick && <span className="modal-player-crown">👑</span>}
            {getInitials(player.name)}
          </div>

          <div className="modal-player-info">
            {editingName ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  autoFocus
                  value={nameVal}
                  onChange={e => setNameVal(e.target.value)}
                  onBlur={handleNameSave}
                  onKeyDown={e => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') setEditingName(false) }}
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,215,0,0.5)',
                    borderRadius: 6,
                    padding: '4px 8px',
                    color: '#fff',
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: '1.4rem',
                    letterSpacing: 1,
                    outline: 'none',
                    width: '100%',
                  }}
                />
              </div>
            ) : (
              <div
                className="modal-player-name"
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => setEditingName(true)}
                title="Cliquer pour renommer"
              >
                {player.name}
                <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>✏️</span>
              </div>
            )}
            <div className="modal-player-role" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              {player.isCoach && <span style={{ background: 'rgba(255,215,0,0.2)', padding: '1px 6px', borderRadius: 4 }}>{player.role}</span>}
              {isTop && <span style={{ background: 'rgba(255,107,53,0.2)', color: '#ff6b35', padding: '1px 6px', borderRadius: 4 }}>⭐ MEILLEUR BUTEUR</span>}
              {hatTrick && !isTop && <span style={{ background: 'rgba(255,215,0,0.15)', padding: '1px 6px', borderRadius: 4 }}>👑 HAT-TRICK</span>}
            </div>
          </div>

          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Stats */}
        <div className="modal-stats">
          <div className="modal-stat">
            <div className="modal-stat-num" style={{ color: isTop ? '#ff6b35' : 'var(--gold)' }}>
              {player.goals}
            </div>
            <div className="modal-stat-label">Forfaits</div>
          </div>
          <div className="modal-stat">
            <div className="modal-stat-num" style={{ color: earnings > 0 ? '#2ecc71' : 'var(--text-dim)' }}>
              {earnings}€
            </div>
            <div className="modal-stat-label">
              {isTop ? '🏆 Prime Top' : 'Gain estimé'}
            </div>
          </div>
        </div>

        {/* Hat trick badge */}
        {hatTrick && (
          <div className="hat-trick-badge">
            <span className="ht-icon">👑</span>
            <div className="ht-text">
              <div className="ht-title">COUP DU CHAPEAU !</div>
              <div className="ht-sub">
                {isTop
                  ? `⭐ Meilleur buteur · Prime garantie à 20€/forfait`
                  : `3+ forfaits · Bonus palier 15€ débloqué !`}
              </div>
            </div>
            <span style={{ fontSize: '1.8rem' }}>🎉</span>
          </div>
        )}

        {/* Voting balls */}
        <div className="balls-section">
          <div className="balls-title">⚽ Cliquer pour enregistrer un forfait</div>
          <div className="balls-grid">
            {balls.map((_, i) => {
              const isFilled = i < player.goals
              const isNew = i === lastFilled
              return (
                <button
                  key={i}
                  className={`goal-ball ${isFilled ? 'filled' : 'empty'} ${isNew ? 'new-fill' : ''}`}
                  onClick={(e) => handleBallClick(i, e)}
                  title={isFilled ? 'Cliquer pour annuler' : 'Cliquer pour valider un forfait'}
                  style={isNew ? { animation: 'fill-ball 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' } : {}}
                >
                  ⚽
                </button>
              )
            })}

            {/* Add slot button */}
            <button
              className="add-ball-btn"
              onClick={() => onAddSlot(player.id)}
              title="Ajouter un emplacement"
            >
              +
            </button>
          </div>
        </div>

        {/* Progress bar toward hat-trick */}
        {!hatTrick && (
          <div style={{ marginTop: 8 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '0.7rem',
              color: 'rgba(240,244,255,0.5)',
              marginBottom: 4,
            }}>
              <span>Progression vers le Hat-Trick 👑</span>
              <span>{player.goals}/3</span>
            </div>
            <div style={{
              height: 6,
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 3,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, (player.goals / 3) * 100)}%`,
                background: 'linear-gradient(90deg, #ffd700, #ffb300)',
                borderRadius: 3,
                transition: 'width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }} />
            </div>
          </div>
        )}

        {/* Tier note */}
        <div style={{
          marginTop: 12,
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 8,
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: '0.72rem',
          color: 'rgba(240,244,255,0.45)',
          lineHeight: 1.5,
        }}>
          💡 Taux actuel : <strong style={{ color: 'var(--gold)' }}>
            {isTop ? '20€/forfait (meilleur buteur)' : totalGoals >= 50 ? (player.goals >= 3 ? '15€/forfait' : '12€/forfait (besoin de 3+ forfaits)') : totalGoals >= 40 ? '12€/forfait' : '10€/forfait'}
          </strong>
        </div>
      </div>
    </div>
  )
}
