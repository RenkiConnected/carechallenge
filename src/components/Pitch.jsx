import { useRef, useState, useCallback } from 'react'
import PlayerModal from './PlayerModal'

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function FootballPitchSVG() {
  return (
    <svg
      className="pitch-svg"
      viewBox="0 0 800 520"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="grassGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e7a1e" />
          <stop offset="100%" stopColor="#166316" />
        </linearGradient>
        <pattern id="grassStripes" patternUnits="userSpaceOnUse" width="80" height="520">
          <rect width="80" height="520" fill="#1e7a1e" />
          <rect width="40" height="520" fill="#228b22" />
        </pattern>
        <filter id="lineglow">
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Grass base */}
      <rect width="800" height="520" fill="url(#grassStripes)" />

      {/* Grass overlay gradient */}
      <rect width="800" height="520" fill="url(#grassGrad)" opacity="0.3" />

      {/* Outer boundary */}
      <rect x="40" y="30" width="720" height="460" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" />

      {/* Halfway line */}
      <line x1="400" y1="30" x2="400" y2="490" stroke="rgba(255,255,255,0.85)" strokeWidth="2" />

      {/* Centre circle */}
      <circle cx="400" cy="260" r="73" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" />
      <circle cx="400" cy="260" r="5" fill="rgba(255,255,255,0.85)" />

      {/* LEFT PENALTY AREA */}
      <rect x="40" y="145" width="132" height="230" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" />
      {/* Left goal area */}
      <rect x="40" y="195" width="55" height="130" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" />
      {/* Left goal */}
      <rect x="16" y="215" width="24" height="90" fill="rgba(0,0,0,0.25)" stroke="rgba(255,255,255,0.85)" strokeWidth="2" />
      {/* Left penalty spot */}
      <circle cx="128" cy="260" r="4" fill="rgba(255,255,255,0.85)" />
      {/* Left penalty arc */}
      <path d="M172 205 A73 73 0 0 1 172 315" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" />

      {/* RIGHT PENALTY AREA */}
      <rect x="628" y="145" width="132" height="230" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" />
      {/* Right goal area */}
      <rect x="705" y="195" width="55" height="130" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" />
      {/* Right goal */}
      <rect x="760" y="215" width="24" height="90" fill="rgba(0,0,0,0.25)" stroke="rgba(255,255,255,0.85)" strokeWidth="2" />
      {/* Right penalty spot */}
      <circle cx="672" cy="260" r="4" fill="rgba(255,255,255,0.85)" />
      {/* Right penalty arc */}
      <path d="M628 205 A73 73 0 0 0 628 315" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" />

      {/* Corner arcs */}
      <path d="M40 50 A20 20 0 0 1 60 30" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" />
      <path d="M740 30 A20 20 0 0 1 760 50" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" />
      <path d="M40 470 A20 20 0 0 0 60 490" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" />
      <path d="M740 490 A20 20 0 0 0 760 470" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" />

      {/* Corner flags */}
      <line x1="40" y1="30" x2="40" y2="8" stroke="rgba(255,68,68,0.8)" strokeWidth="1.5" />
      <polygon points="40,8 52,14 40,20" fill="rgba(255,68,68,0.8)" />
      <line x1="760" y1="30" x2="760" y2="8" stroke="rgba(255,68,68,0.8)" strokeWidth="1.5" />
      <polygon points="760,8 772,14 760,20" fill="rgba(255,68,68,0.8)" />
      <line x1="40" y1="490" x2="40" y2="512" stroke="rgba(255,68,68,0.8)" strokeWidth="1.5" />
      <polygon points="40,512 52,506 40,500" fill="rgba(255,68,68,0.8)" />
      <line x1="760" y1="490" x2="760" y2="512" stroke="rgba(255,68,68,0.8)" strokeWidth="1.5" />
      <polygon points="760,512 772,506 760,500" fill="rgba(255,68,68,0.8)" />

      {/* Animated grass wave overlay */}
      <rect width="800" height="520" fill="rgba(255,255,255,0)" />
    </svg>
  )
}

function PlayerAvatarOnPitch({ player, isSelected, onPointerDown, onClick }) {
  const initials = getInitials(player.name)
  const hasHatTrick = player.goals >= 3

  return (
    <div
      className={`player-avatar ${isSelected ? 'selected' : ''}`}
      style={{ left: `${player.x}%`, top: `${player.y}%` }}
      onPointerDown={(e) => onPointerDown(e, player)}
      onClick={(e) => { e.stopPropagation(); onClick(player.id) }}
    >
      <div className="player-circle" style={{ background: player.color }}>
        {hasHatTrick && (
          <span className="player-crown-badge" style={{ zIndex: 20 }}>👑</span>
        )}
        {initials}
        {player.goals > 0 && (
          <span className="player-goal-badge">{player.goals}</span>
        )}
      </div>
      <div className="player-name-tag">{player.name}</div>
    </div>
  )
}

export default function Pitch({
  players, coaches, selectedId, onSelect,
  onUpdatePerson, onAddGoal, onRemoveGoal, onAddSlot,
  allPeople, totalGoals,
}) {
  const pitchRef = useRef(null)
  const dragState = useRef({ active: false, id: null, startX: 0, startY: 0, originX: 0, originY: 0, moved: false })
  const [isDragging, setIsDragging] = useState(false)

  const handlePointerDown = useCallback((e, player) => {
    e.preventDefault()
    e.stopPropagation()

    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const pitchRect = pitchRef.current.getBoundingClientRect()

    dragState.current = {
      active: true,
      id: player.id,
      isCoach: player.isCoach,
      startX: clientX,
      startY: clientY,
      originX: player.x,
      originY: player.y,
      pitchW: pitchRect.width,
      pitchH: pitchRect.height,
      moved: false,
    }

    setIsDragging(false)

    const handleMove = (ev) => {
      if (!dragState.current.active) return
      const cx = ev.touches ? ev.touches[0].clientX : ev.clientX
      const cy = ev.touches ? ev.touches[0].clientY : ev.clientY
      const dx = cx - dragState.current.startX
      const dy = cy - dragState.current.startY
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        dragState.current.moved = true
        setIsDragging(true)
      }
      if (dragState.current.moved) {
        const newX = Math.max(3, Math.min(97, dragState.current.originX + (dx / dragState.current.pitchW) * 100))
        const newY = Math.max(3, Math.min(97, dragState.current.originY + (dy / dragState.current.pitchH) * 100))
        onUpdatePerson(dragState.current.id, { x: newX, y: newY })
      }
    }

    const handleUp = () => {
      if (!dragState.current.moved) {
        // It was a click
        onSelect(dragState.current.id === selectedId ? null : dragState.current.id)
      }
      dragState.current.active = false
      setIsDragging(false)
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
          <div style={{ height: 24 }} />
          {coaches.map(coach => {
            const initials = getInitials(coach.name)
            const hasHatTrick = coach.goals >= 3
            const isSelected = selectedId === coach.id
            return (
              <div
                key={coach.id}
                className={`coach-avatar ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelect(isSelected ? null : coach.id)}
              >
                <div className="avatar-circle" style={{ background: coach.color }}>
                  {hasHatTrick && <span className="avatar-crown">👑</span>}
                  {initials}
                  {coach.goals > 0 && (
                    <span className="avatar-goals">{coach.goals}</span>
                  )}
                </div>
                <div className="avatar-name">{coach.name}</div>
                <div className="avatar-role">{coach.role}</div>
              </div>
            )
          })}
        </div>

        {/* Football pitch */}
        <div
          className="pitch-container"
          ref={pitchRef}
          onClick={() => onSelect(null)}
        >
          <FootballPitchSVG />

          {players.map(player => (
            <PlayerAvatarOnPitch
              key={player.id}
              player={player}
              isSelected={selectedId === player.id}
              onPointerDown={handlePointerDown}
              onClick={() => {}}
            />
          ))}
        </div>
      </div>

      {/* Player voting modal */}
      {selectedPerson && (
        <PlayerModal
          player={selectedPerson}
          allPeople={allPeople}
          totalGoals={totalGoals}
          onAddGoal={onAddGoal}
          onRemoveGoal={onRemoveGoal}
          onAddSlot={onAddSlot}
          onUpdatePerson={onUpdatePerson}
          onClose={() => onSelect(null)}
        />
      )}
    </div>
  )
}
