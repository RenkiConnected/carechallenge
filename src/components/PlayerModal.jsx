import { useState, useEffect } from 'react'
import { getPlayerEarnings, getPlayerTotalEarnings, isTopScorer, hasHatTrick, DEFAULT_SETTINGS } from '../utils/bonus'

function getInitials(name) { return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) }

export default function PlayerModal({ player, allPeople, totalGoals, settings, validatedCount = 0, validatedValue = null, canEdit = true, onAddGoal, onRemoveGoal, onAddSlot, onUpdatePerson, onClose }) {
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(player.name)
  const [lastFilled, setLastFilled] = useState(null)
  const s = { ...DEFAULT_SETTINGS, ...settings }

  useEffect(() => { setNameVal(player.name) }, [player.name])

  const unit = s.unit || 'forfait'
  const earnings = getPlayerEarnings(player, allPeople, totalGoals, s)
  const totalEarnings = getPlayerTotalEarnings(player, allPeople, totalGoals, s, validatedCount, validatedValue)
  const vp = Math.min(validatedCount || 0, player.goals || 0)
  const pronoBonus = Math.max(0, totalEarnings - earnings)
  const isTop = isTopScorer(player, allPeople, s)
  const ht = hasHatTrick(player)
  const displaySlots = Math.max(3 + (player.extraSlots || 0), player.goals + 1)
  const balls = Array.from({ length: displaySlots }, (_, i) => i)

  const handleBallClick = (idx, e) => {
    if (!canEdit) return
    const rect = e.currentTarget.getBoundingClientRect()
    if (idx < player.goals) {
      onRemoveGoal(player.id)
    } else {
      onAddGoal(player.id, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
      setLastFilled(idx)
      setTimeout(() => setLastFilled(null), 500)
    }
  }

  const handleNameSave = () => {
    if (nameVal.trim()) onUpdatePerson(player.id, { name: nameVal.trim() })
    setEditingName(false)
  }

  return (
    <div className="player-modal-overlay" onClick={onClose}>
      <div className="player-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-player-circle" style={{ background: player.color }}>
            {ht && <span className="modal-player-crown">👑</span>}
            {getInitials(player.name)}
          </div>
          <div className="modal-player-info">
            {editingName ? (
              <input autoFocus value={nameVal}
                onChange={e => setNameVal(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={e => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') setEditingName(false) }}
                style={{ background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,215,0,.5)', borderRadius:6, padding:'4px 8px', color:'#fff', fontFamily:"'Bebas Neue',sans-serif", fontSize:clamp('1.4rem'), letterSpacing:1, outline:'none', width:'100%' }}
              />
            ) : (
              <div className="modal-player-name" style={{ cursor:'pointer', display:'flex', alignItems:'center', gap:6 }} onClick={() => setEditingName(true)} title="Cliquer pour renommer">
                {player.name} <span style={{ fontSize:'.75rem', opacity:.4 }}>✏️</span>
              </div>
            )}
            <div className="modal-player-role">
              {player.isCoach && <span style={{ background:'rgba(255,215,0,.2)', padding:'1px 7px', borderRadius:4, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.72rem', fontWeight:700, color:'var(--gold)' }}>{player.role}</span>}
              {isTop && <span style={{ background:'rgba(255,107,53,.2)', color:'#ff6b35', padding:'1px 7px', borderRadius:4, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.72rem', fontWeight:700 }}>⭐ MEILLEUR BUTEUR</span>}
              {ht && !isTop && <span style={{ background:'rgba(255,215,0,.15)', padding:'1px 7px', borderRadius:4, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.72rem', fontWeight:700, color:'var(--gold)' }}>👑 HAT-TRICK</span>}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Stats */}
        <div className="modal-stats">
          <div className="modal-stat">
            <div className="modal-stat-num" style={{ color: isTop ? '#ff6b35' : 'var(--gold)' }}>{player.goals}</div>
            <div className="modal-stat-label">{unit==="ligne"?"Lignes":"Forfaits"}</div>
          </div>
          <div className="modal-stat">
            <div className="modal-stat-num" style={{ color: totalEarnings > 0 ? '#2ecc71' : 'var(--text-dim)' }}>{totalEarnings.toFixed(2)}€</div>
            <div className="modal-stat-label">{isTop ? '🏆 Prime Top' : 'Gain total'}{vp > 0 ? ` · ${vp} 🎯 à 20€` : ''}</div>
          </div>
        </div>

        {/* Hat-trick badge */}
        {ht && (
          <div className="hat-trick-badge">
            <span className="ht-icon">👑</span>
            <div style={{ flex:1 }}>
              <div className="ht-title">COUP DU CHAPEAU !</div>
              <div className="ht-sub">
                {isTop ? `⭐ Meilleur buteur · Prime ${s.topScorerRate}€/${unit} garantie !` : `3+ ${unit}s · Éligible au palier ${s.tier3Rate}€ !`}
              </div>
            </div>
            <span style={{ fontSize:'1.8rem' }}>🎉</span>
          </div>
        )}

        {/* Voting balls */}
        <div className="balls-section">
          <div className="balls-title">{canEdit ? `⚽ Cliquer pour enregistrer un${unit==="ligne"?"e ligne":" forfait"}` : '🔒 Lecture seule — ce ne sont pas tes points'}</div>
          <div className="balls-grid">
            {balls.map((_, i) => {
              const filled = i < player.goals
              const isNew = i === lastFilled
              return (
                <button key={i}
                  className={`goal-ball ${filled ? 'filled' : 'empty'}`}
                  onClick={e => handleBallClick(i, e)}
                  disabled={!canEdit}
                  title={!canEdit ? 'Lecture seule' : filled ? 'Cliquer pour annuler' : 'Enregistrer'}
                  style={isNew ? { animation:'fill-ball .4s cubic-bezier(.34,1.56,.64,1)' } : {}}
                >⚽</button>
              )
            })}
            {canEdit && <button className="add-ball-btn" onClick={() => onAddSlot(player.id)} title="Ajouter un emplacement">+</button>}
          </div>
        </div>

        {/* Hat-trick progress */}
        {!ht && (
          <div style={{ marginTop:6 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.75rem', color:'rgba(240,244,255,.5)', marginBottom:4 }}>
              <span>Progression vers le Hat-Trick 👑</span>
              <span>{player.goals}/{s.minForTier3}</span>
            </div>
            <div style={{ height:7, background:'rgba(255,255,255,.08)', borderRadius:4, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${Math.min(100,(player.goals/s.minForTier3)*100)}%`, background:'linear-gradient(90deg,#ffd700,#ffb300)', borderRadius:4, transition:'width .4s cubic-bezier(.34,1.56,.64,1)' }} />
            </div>
          </div>
        )}

        {/* Current rate */}
        <div style={{ marginTop:12, padding:'8px 12px', background:'rgba(255,255,255,.04)', borderRadius:8, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.78rem', color:'rgba(240,244,255,.5)', lineHeight:1.6 }}>
          💡 Taux actuel :{' '}
          <strong style={{ color:'var(--gold)' }}>
            {isTop ? `${s.topScorerRate}€/${unit} (meilleur buteur !)` :
             totalGoals > s.tier2Threshold ? (player.goals >= s.minForTier3 ? `${s.tier3Rate}€/${unit}` : `${s.tier2Rate}€/${unit} (besoin de ${s.minForTier3}+ ${unit}s)`) :
             totalGoals > s.tier1Threshold ? `${s.tier2Rate}€/${unit}` :
             `${s.tier1Rate}€/${unit}`}
          </strong>
        </div>
      </div>
    </div>
  )
}

// Helper for inline style
function clamp(v) { return v }
