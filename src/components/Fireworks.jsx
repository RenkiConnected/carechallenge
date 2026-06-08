import { useEffect, useRef } from 'react'

// Feu d'artifice doux, constant et NON intrusif (overlay pointer-events:none).
// Couleurs accordées au thème (or, vert, orange, bleu).
const COLORS = ['#ffd700', '#2ecc71', '#ff9800', '#00e5cc', '#e74c3c', '#ffffff']

export default function Fireworks({ active, fixed = false, intense = false }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(0)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 3) // haute résolution (retina)

    const resize = () => {
      let w, h
      if (fixed) { w = window.innerWidth; h = window.innerHeight }
      else { const r = canvas.parentElement.getBoundingClientRect(); w = r.width; h = r.height }
      W = w; H = h
      canvas.width = W * dpr; canvas.height = H * dpr
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    if (!fixed && canvas.parentElement) ro.observe(canvas.parentElement)
    if (fixed) window.addEventListener('resize', resize)

    const particles = []
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Lance une fusée qui explose en gerbe
    const launch = () => {
      const x = W * (0.12 + Math.random() * 0.76)
      const y = H * (0.12 + Math.random() * 0.4)
      const color = COLORS[(Math.random() * COLORS.length) | 0]
      const count = 26 + ((Math.random() * 16) | 0)
      for (let i = 0; i < count; i++) {
        const ang = (Math.PI * 2 * i) / count + Math.random() * 0.3
        const speed = 1.1 + Math.random() * 2.4
        particles.push({
          x, y,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          life: 1, decay: 0.012 + Math.random() * 0.012,
          color, size: 1.4 + Math.random() * 1.6,
        })
      }
    }

    let last = performance.now()
    let acc = 0
    const interval = reduce ? 2600 : (intense ? 750 : 1300) // gerbes plus fréquentes en mode fête

    const tick = (now) => {
      const dt = now - last; last = now; acc += dt
      if (acc >= interval) { acc = 0; launch(); if (!reduce && (intense || Math.random() < 0.4)) launch(); if (intense && !reduce) launch() }

      // léger fondu (traînées) sans assombrir le fond de la page
      ctx.clearRect(0, 0, W, H)
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.vy += 0.02            // gravité douce
        p.vx *= 0.992
        p.x += p.vx; p.y += p.vy
        p.life -= p.decay
        if (p.life <= 0) { particles.splice(i, 1); continue }
        ctx.globalAlpha = Math.max(0, p.life) * 0.85
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.shadowBlur = 8; ctx.shadowColor = p.color
        ctx.fill()
      }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); if (fixed) window.removeEventListener('resize', resize) }
  }, [active, fixed, intense])

  if (!active) return null
  return <canvas ref={canvasRef} className={`fireworks-canvas${fixed ? ' fireworks-fixed' : ''}`} aria-hidden="true" />
}
