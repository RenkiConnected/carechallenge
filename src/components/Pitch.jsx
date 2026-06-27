import { useRef, useCallback, useState, useEffect } from 'react'
import PlayerModal from './PlayerModal'

function getInitials(name) { return name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) }

function PitchSVG() {
  return (
    <svg className="pitch-svg" viewBox="0 0 800 520" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="gs2" patternUnits="userSpaceOnUse" width="80" height="520">
          <rect width="80" height="520" fill="#1e7a1e"/>
          <rect width="40" height="520" fill="#228b22"/>
        </pattern>
      </defs>
      <rect width="800" height="520" fill="url(#gs2)"/>
      <rect width="800" height="520" fill="rgba(0,0,0,.12)"/>
      <rect x="40" y="30" width="720" height="460" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="2.5"/>
      <line x1="400" y1="30" x2="400" y2="490" stroke="rgba(255,255,255,.9)" strokeWidth="2"/>
      <circle cx="400" cy="260" r="73" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="2"/>
      <circle cx="400" cy="260" r="5" fill="rgba(255,255,255,.9)"/>
      <rect x="40" y="145" width="132" height="230" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="2"/>
      <rect x="40" y="195" width="55" height="130" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="2"/>
      <rect x="16" y="215" width="24" height="90" fill="rgba(0,0,0,.2)" stroke="rgba(255,255,255,.9)" strokeWidth="2"/>
      <circle cx="128" cy="260" r="4" fill="rgba(255,255,255,.9)"/>
      <path d="M172 205 A73 73 0 0 1 172 315" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="2"/>
      <rect x="628" y="145" width="132" height="230" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="2"/>
      <rect x="705" y="195" width="55" height="130" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="2"/>
      <rect x="760" y="215" width="24" height="90" fill="rgba(0,0,0,.2)" stroke="rgba(255,255,255,.9)" strokeWidth="2"/>
      <circle cx="672" cy="260" r="4" fill="rgba(255,255,255,.9)"/>
      <path d="M628 205 A73 73 0 0 0 628 315" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="2"/>
      <path d="M40 50 A20 20 0 0 1 60 30" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="2"/>
      <path d="M740 30 A20 20 0 0 1 760 50" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="2"/>
      <path d="M40 470 A20 20 0 0 0 60 490" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="2"/>
      <path d="M740 490 A20 20 0 0 0 760 470" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="2"/>
    </svg>
  )
}

// Terrain VERTICAL (mobile) — portrait 520×800
function PitchSVGVertical() {
  return (
    <svg className="pitch-svg" viewBox="0 0 520 800" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="gsv" patternUnits="userSpaceOnUse" width="520" height="80">
          <rect width="520" height="80" fill="#1e7a1e"/>
          <rect width="520" height="40" fill="#228b22"/>
        </pattern>
      </defs>
      <rect width="520" height="800" fill="url(#gsv)"/>
      <rect width="520" height="800" fill="rgba(0,0,0,.12)"/>
      <rect x="30" y="40" width="460" height="720" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="2.5"/>
      <line x1="30" y1="400" x2="490" y2="400" stroke="rgba(255,255,255,.9)" strokeWidth="2"/>
      <circle cx="260" cy="400" r="73" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="2"/>
      <circle cx="260" cy="400" r="5" fill="rgba(255,255,255,.9)"/>
      {/* But haut */}
      <rect x="145" y="40" width="230" height="132" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="2"/>
      <rect x="195" y="40" width="130" height="55" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="2"/>
      <rect x="215" y="16" width="90" height="24" fill="rgba(0,0,0,.2)" stroke="rgba(255,255,255,.9)" strokeWidth="2"/>
      <circle cx="260" cy="128" r="4" fill="rgba(255,255,255,.9)"/>
      <path d="M205 172 A73 73 0 0 0 315 172" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="2"/>
      {/* But bas */}
      <rect x="145" y="628" width="230" height="132" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="2"/>
      <rect x="195" y="705" width="130" height="55" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="2"/>
      <rect x="215" y="760" width="90" height="24" fill="rgba(0,0,0,.2)" stroke="rgba(255,255,255,.9)" strokeWidth="2"/>
      <circle cx="260" cy="672" r="4" fill="rgba(255,255,255,.9)"/>
      <path d="M205 628 A73 73 0 0 1 315 628" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="2"/>
    </svg>
  )
}

export default function Pitch({ players, coaches, selectedId, onSelect, onUpdatePerson, onAddGoal, onRemoveGoal, onAddSlot, allPeople, totalGoals, settings, validatedById = {}, validatedValueById = null, dashAuth = false, editableId }) {
  const pitchRef = useRef(null)
  const drag = useRef({ active:false, moved:false, id:null })

  // Terrain vertical sur mobile (portrait)
  const mqGet = () => (typeof window !== 'undefined' && window.matchMedia) ? window.matchMedia('(max-width:767px)') : null
  const [isMobile, setIsMobile] = useState(() => { const m = mqGet(); return m ? m.matches : false })
  useEffect(() => {
    const mq = mqGet()
    if (!mq) return
    const on = e => setIsMobile(e.matches)
    mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on)
    return () => { mq.removeEventListener ? mq.removeEventListener('change', on) : mq.removeListener(on) }
  }, [])

  // ── Drag handling ──────────────────────────────────────────────────────────
  const handlePointerDown = useCallback((e, player) => {
    if (!dashAuth) return // seuls les managers peuvent déplacer les joueurs (le clic reste actif)
    e.preventDefault()
    e.stopPropagation()
    const cx = e.touches ? e.touches[0].clientX : e.clientX
    const cy = e.touches ? e.touches[0].clientY : e.clientY
    const rect = pitchRef.current.getBoundingClientRect()

    drag.current = { active:true, moved:false, id:player.id, sx:cx, sy:cy, ox:player.x, oy:player.y, pw:rect.width, ph:rect.height, mobile:isMobile }

    const onMove = (ev) => {
      if (!drag.current.active) return
      const mx = ev.touches ? ev.touches[0].clientX : ev.clientX
      const my = ev.touches ? ev.touches[0].clientY : ev.clientY
      const dx = mx - drag.current.sx
      const dy = my - drag.current.sy
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        drag.current.moved = true
        if (drag.current.mobile) {
          // Vertical : horizontal écran → y stocké, vertical écran → x stocké
          onUpdatePerson(drag.current.id, {
            x: Math.max(3, Math.min(97, drag.current.ox + (dy/drag.current.ph)*100)),
            y: Math.max(3, Math.min(97, drag.current.oy + (dx/drag.current.pw)*100)),
          })
        } else {
          onUpdatePerson(drag.current.id, {
            x: Math.max(3, Math.min(97, drag.current.ox + (dx/drag.current.pw)*100)),
            y: Math.max(3, Math.min(97, drag.current.oy + (dy/drag.current.ph)*100)),
          })
        }
      }
    }
    const onUp = () => {
      drag.current.active = false
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
    window.addEventListener('pointermove', onMove, { passive:false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('touchmove', onMove, { passive:false })
    window.addEventListener('touchend', onUp)
  }, [onUpdatePerson, dashAuth])

  // ── Click (separate from drag) ─────────────────────────────────────────────
  const handlePlayerClick = useCallback((e, playerId) => {
    e.preventDefault()
    e.stopPropagation()
    if (!drag.current.moved) {
      onSelect(selectedId === playerId ? null : playerId)
    }
  }, [onSelect, selectedId])

  const selectedPerson = allPeople.find(p => p.id === selectedId)

  return (
    <div className="pitch-layout">
      <div className="pitch-wrapper">

        {/* ── Coaches sidebar (desktop: left, mobile: top strip) ── */}
        <div className="coaches-sidebar">
          <div className="coaches-sidebar-label">BANC</div>
          {coaches.map(coach => {
            const sel = selectedId === coach.id
            const ht  = coach.goals >= 3
            return (
              <div key={coach.id} className={`coach-avatar ${sel?'selected':''}`}
                onClick={e => { e.stopPropagation(); onSelect(sel ? null : coach.id) }}
              >
                <div className="avatar-circle" style={{ background:coach.color }}>
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

        {/* ── Pitch ── */}
        <div className="pitch-container" onClick={() => onSelect(null)}>
          {isMobile ? <PitchSVGVertical /> : <PitchSVG />}
          <div className="pitch-players" ref={pitchRef}>
          {players.map(player => {
            const sel = selectedId === player.id
            const ht  = player.goals >= 3
            const left = isMobile ? player.y : player.x
            const top  = isMobile ? player.x : player.y
            return (
              <div key={player.id}
                className={`player-avatar ${sel?'selected':''}`}
                style={{ left:`${left}%`, top:`${top}%`, cursor: dashAuth ? 'grab' : 'pointer' }}
                onPointerDown={e => handlePointerDown(e, player)}
                onClick={e => handlePlayerClick(e, player.id)}
              >
                <div className="player-circle" style={{ background:player.color }}>
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
      </div>

      {/* ── Voting modal ── */}
      {selectedPerson && (
        <PlayerModal
          player={selectedPerson} allPeople={allPeople}
          totalGoals={totalGoals} settings={settings}
          validatedCount={validatedById[selectedPerson.id] || 0}
          validatedValue={validatedValueById ? validatedValueById[selectedPerson.id] : null}
          canEdit={editableId === '*' || editableId === selectedPerson.id}
          onAddGoal={onAddGoal} onRemoveGoal={onRemoveGoal}
          onAddSlot={onAddSlot} onUpdatePerson={onUpdatePerson}
          onClose={() => onSelect(null)}
        />
      )}
    </div>
  )
}
