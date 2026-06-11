import { useEffect, useState, useRef } from 'react'
import Fireworks from './Fireworks'

// Cérémonie d'ouverture : 11 juin 2026 à 19h20 (heure locale).
export const OPENING_TS = new Date('2026-06-11T19:20:00').getTime()
// Le feu d'artifice de célébration dure 1h.
export const CELEB_END_TS = OPENING_TS + 60 * 60 * 1000
// Coup d'envoi du 1er match / phase de poules : 21h00.
export const GROUP_PHASE_TS = new Date('2026-06-11T21:00:00').getTime()

const pad = n => String(n).padStart(2, '0')

function Block({ n, l, pulse }) {
  return (
    <div className={`wc-block ${pulse ? 'wc-pulse' : ''}`}>
      <div className="wc-num">{n}</div>
      <div className="wc-lab">{l}</div>
    </div>
  )
}
const Sep = () => <div className="wc-sep">:</div>

export default function WorldCupCountdown({ dismissed, onDismiss, onExpand }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [])

  const celebrating = now >= OPENING_TS && now < CELEB_END_TS

  // Quand la célébration démarre (passage de 19h20), on ré-affiche l'écran UNE fois,
  // même si l'utilisateur était déjà entré dans le challenge.
  const wasCelebrating = useRef(false)
  useEffect(() => {
    if (celebrating && !wasCelebrating.current && onExpand) onExpand()
    wasCelebrating.current = celebrating
  }, [celebrating, onExpand])

  // Évènement totalement passé (après l'heure de célébration) → plus d'overlay.
  if (now >= CELEB_END_TS) return null

  const diff = Math.max(0, OPENING_TS - now)
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)

  // L'utilisateur est "entré" (a cliqué sur Entrer).
  if (dismissed) {
    // Pendant la célébration : on laisse l'appli totalement libre (le feu d'artifice
    // ambiant continue sur les pages forfaits). Sinon : petite pastille de décompte.
    if (celebrating) return null
    return (
      <button className="wc-mini" onClick={onExpand} title="Voir le compte à rebours">
        <span className="wc-mini-cup">🏆</span>
        <span className="wc-mini-time">{d > 0 ? `J-${d} · ` : ''}{pad(h)}:{pad(m)}:{pad(s)}</span>
      </button>
    )
  }

  return (
    <div className="wc-overlay">
      {celebrating && <Fireworks active fixed intense confetti />}
      <div className="wc-bg-glow" aria-hidden="true" />
      <div className="wc-inner">
        <div className="wc-logo-card">
          <img src="/wc2026-logo.png" alt="FIFA World Cup 2026" />
        </div>

        {celebrating ? (
          <>
            <div className="wc-kicker">Cérémonie d'ouverture</div>
            <h1 className="wc-title wc-live">C'EST PARTI&nbsp;!</h1>
            <div className="wc-sub">La Coupe du Monde 2026 est lancée 🎉🎆</div>
          </>
        ) : (
          <>
            <div className="wc-kicker">⚽ Coupe du Monde 2026</div>
            <div className="wc-eventline">Cérémonie d'ouverture</div>
            <div className="wc-clock">
              <Block n={d} l="Jours" />
              <Sep />
              <Block n={pad(h)} l="Heures" />
              <Sep />
              <Block n={pad(m)} l="Minutes" />
              <Sep />
              <Block n={pad(s)} l="Secondes" pulse />
            </div>
            <div className="wc-sub">11 JUIN 2026 · 19:20 · COUP D'ENVOI DE LA FÊTE</div>
          </>
        )}

        <button className="wc-enter" onClick={onDismiss}>Entrer dans le challenge →</button>
      </div>
    </div>
  )
}
