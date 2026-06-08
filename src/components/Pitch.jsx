import { useRef, useState, useCallback } from 'react'
import PlayerModal from './PlayerModal'

function getInitials(name) { return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) }

function FootballPitchSVG() {
  return (
    <svg className="pitch-svg" viewBox="0 0 800 520" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="grassStripes" patternUnits="userSpaceOnUse" width="80" height="520">
          <rect width="80" height="520" fill="#1e7a1e"/>
          <rect width="40" height="520" fill="#228b22"/>
        </pattern>
      </defs>
      <rect width="800" height="520" fill="url(#grassStripes)"/>
      <rect width="800" height="520" fill="rgba(0,0,0,0.15)"/>
      {/* Boundary */}
      <rect x="40" y="30" width="720" height="460" fill="none" stroke="rgba(255,255,255,.88)" strokeWidth="2.5"/>
      {/* Halfway */}
      <line x1="400" y1="30" x2="400" y2="490" stroke="rgba(255,255,255,.88)" strokeWidth="2"/>
      {/* Centre circle & spot */}
      <circle cx="400" cy="260" r="73" fill="none" stroke="rgba(255,255,255,.88)" strokeWidth="2"/>
      <circle cx="400" cy="260" r="5" fill="rgba(255,255,255,.88)"/>
      {/* Left penalty area */}
      <rect x="40" y="145" width="132" height="230" fill="none" stroke="rgba(255,255,255,.88)" strokeWidth="2"/>
      <rect x="40" y="195" width="55" height="130" fill="none" stroke="rgba(255,255,255,.88)" strokeWidth="2"/>
      <rect x="16" y="215" width="24" height="90" fill="rgba(0,0,0,.2)" stroke="rgba(255,255,255,.88)" strokeWidth="2"/>
      <circle cx="128" cy="260" r="4" fill="rgba(255,255,255,.88)"/>
      <path d="M172 205 A73 73 0 0 1 172 315" fill="none" stroke="rgba(255,255,255,.88)" strokeWidth="2"/>
      {/* Right penalty area */}
      <rect x="628" y="145" width="132" height="230" fill="none" stroke="rgba(255,255,255,.88)" strokeWidth="2"/>
      <rect x="705" y="195" width="55" height="130" fill="none" stroke="rgba(255,255,255,.88)" strokeWidth="2"/>
      <rect x="760" y="215" width="24" height="90" fill="rgba(0,0,0,.2)" stroke="rgba(255,255,255,.88)" strokeWidth="2"/>
      <circle cx="672" cy="260" r="4" fill="rgba(255,255,255,.88)"/>
      <path d="M628 205 A73 73 0 0 0 628 315" fill="none" stroke="rgba(255,255,255,.88)" strokeWidth="2"/>
      {/* Corner arcs */}
      <path d="M40 50 A20 20 0 0 1 60 30" fill="none" stroke="rgba(255,255,255,.88)" strokeWidth="2"/>
      <path d="M740 30 A20 20 0 0 1 760 50" fill="none" stroke="rgba(255,255,255,.88)" strokeWidth="2"/>
      <path d="M40 470 A20 20 0 0 0 60 490" fill="none" stroke="rgba(255,255,255,.88)" strokeWidth="2"/>
      <path d="M740 490 A20 20 0 0 0 760 470" fill="none" stroke="rgba(255,255,255,.88)" strokeWidth="2"/>
      {/* Corner flags */}
      {[[40,30],[760,30],[40,490],[760,490]].map(([x,y],i) => (
        <g key={i}>
          <line x1={x} y1={y} x2={x} y2={y+(i<2?-22:22)} stroke="rgba(255,68,68,.85)" strokeWidth="1.5"/>
          <polygon points={`${x},${y+(i<2?-22:22)} ${x+12},${y+(i<2?-16:28)} ${x},${y+(i<2?-10:34)}`} fill="rgba(255,68,68,.85)"/>
        </g>
      ))}
    </svg>
  )
}

export default function Pitch({ players, coaches, selectedId, onSelect, onUpdatePerson, onAddGoal, onRemoveGoal, onAddSlot, allPeople, totalGoals, settings }) {
  const pitchRef = useRef(null)
  const dragState = useRef({ active: false, moved: false })
  const [, forceRender] = useState(0)

  const handlePointerDown = useCallback((e, player) => {
    e.preventDefault(); e.stopPropagation()
    const cx = e.touches ? e.touches[0].clientX : e.clientX
    const cy = e.touches ? e.touches[0].clientY : e.clientY
    const rect = pitchRef.current.getBoundingClientRect()

    dragState.current = { active: true, id: player.id, startX: cx, startY: cy, originX: player.x, originY: player.y, pitchW: rect.width, pitchH: rect.height, moved: false }

    const handleMove = (ev) => {
      if (!dragState.current.active) return
      const mcx = ev.touches ? ev.touches[0].clientX : ev.clientX
      const mcy = ev.touches ? ev.touches[0].clientY : ev.clientY
      const dx = mcx - dragState.current.startX
      const dy = mcy - dragState.current.startY
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        dragState.current.moved = true
        const nx = Math.max(3, Math.min(97, dragState.current.originX + (dx / dragState.current.pitchW) * 100))
        const ny = Math.max(3, Math.min(97, dragState.current.originY + (dy / dragState.current.pitchH) * 100))
        onUpdatePerson(dragState.current.id, { x: nx, y: ny })
      }
    }
    const handleUp = () => {
      if (!dragState.current.moved) onSelect(dragState.current.id === selectedId ? null : dragState.current.id)
      dragState.current.active = false
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleUp)
    }
    window.addEventListener('pointermove', handleMove, { passive: false })
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleUp)
  }, [onUpdatePerson, onSelect, selectedId])

  const selectedPerson = allPeople.find(p => p.id === selectedId)

  return (
    <div className="pitch-layout">
      <div className="pitch-wrapper">
        {/* Coaches sidebar */}
        <div className="coaches-sidebar">
          <div style={{ height:16 }}/>
          {coaches.map(coach => {
            const sel = selectedId === coach.id
            const ht = coach.goals >= 3
            return (
              <div key={coach.id} className={`coach-avatar ${sel ? 'selected' : ''}`} onClick={() => onSelect(sel ? null : coach.id)}>
                <div className="avatar-circle" style={{ background: coach.color }}>
                  {ht && <span className="avatar-crown">👑</span>}
                  {getInitials(coach.name)}
                  {coach.goals > 0 && <span className="avatar-goals">{coach.goals}</span>}
                </div>
                <div className="avatar-name">{coach.name}</div>
                <div className="avatar-role">{coach.role}</div>
              </div>
            )
          })}
        </div>

        {/* Pitch */}
        <div className="pitch-container" ref={pitchRef} onClick={() => onSelect(null)}>
          <FootballPitchSVG />
          {players.map(player => {
            const sel = selectedId === player.id
            const ht = player.goals >= 3
            return (
              <div key={player.id} className={`player-avatar ${sel ? 'selected' : ''}`}
                style={{ left: `${player.x}%`, top: `${player.y}%` }}
                onPointerDown={e => handlePointerDown(e, player)}
              >
                <div className="player-circle" style={{ background: player.color }}>
                  {ht && <span className="player-crown-badge">👑</span>}
                  {getInitials(player.name)}
                  {player.goals > 0 && <span className="player-goal-badge">{player.goals}</span>}
                </div>
                <div className="player-name-tag">{player.name}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Player voting modal */}
      {selectedPerson && (
        <PlayerModal
          player={selectedPerson} allPeople={allPeople}
          totalGoals={totalGoals} settings={settings}
          onAddGoal={onAddGoal} onRemoveGoal={onRemoveGoal}
          onAddSlot={onAddSlot} onUpdatePerson={onUpdatePerson}
          onClose={() => onSelect(null)}
        />
      )}
    </div>
  )
}
