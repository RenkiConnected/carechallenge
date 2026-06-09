import { useEffect, useRef } from 'react'

// Feu d'artifice doux, constant et NON intrusif (overlay pointer-events:none).
// Couleurs accordées au thème (or, vert, orange, bleu).
const COLORS = ['#ffd700', '#2ecc71', '#ff9800', '#00e5cc', '#e74c3c', '#ffffff']

export default function Fireworks({ active, fixed = false, intense = false, confetti: confettiOn = false }) {
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
      // si la taille n'est pas encore connue (mise en page flex pas finalisée), on réessaie
      if (!w || !h) { requestAnimationFrame(resize); return }
      W = w; H = h
      canvas.width = W * dpr; canvas.height = H * dpr
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    requestAnimationFrame(resize) // re-mesure après le 1er layout
    const ro = new ResizeObserver(resize)
    if (!fixed && canvas.parentElement) ro.observe(canvas.parentElement)
    window.addEventListener('resize', resize)

    const particles = []
    const confetti = []
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Confetti : petits rectangles colorés qui tombent en se balançant
    const spawnConfetti = (n) => {
      for (let i = 0; i < n; i++) {
        confetti.push({
          x: Math.random() * W, y: -10 - Math.random() * 40,
          vx: (Math.random() - 0.5) * 1.2, vy: 1 + Math.random() * 1.8,
          w: 5 + Math.random() * 5, h: 8 + Math.random() * 6,
          rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.2,
          color: COLORS[(Math.random() * COLORS.length) | 0], sway: Math.random() * Math.PI * 2,
        })
      }
    }

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
      // confetti continu (discret) si activé
      if (confettiOn && !reduce && confetti.length < 140) spawnConfetti(2)

      ctx.clearRect(0, 0, W, H)
      // confetti
      for (let i = confetti.length - 1; i >= 0; i--) {
        const k = confetti[i]
        k.sway += 0.05; k.x += k.vx + Math.sin(k.sway) * 0.6; k.y += k.vy; k.rot += k.vr
        if (k.y > H + 20) { confetti.splice(i, 1); continue }
        ctx.save()
        ctx.translate(k.x, k.y); ctx.rotate(k.rot)
        ctx.globalAlpha = 0.85; ctx.fillStyle = k.color
        ctx.fillRect(-k.w / 2, -k.h / 2, k.w, k.h)
        ctx.restore()
      }
      ctx.globalAlpha = 1
      // gerbes
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

    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); window.removeEventListener('resize', resize) }
  }, [active, fixed, intense, confettiOn])

  if (!active) return null
  return <canvas ref={canvasRef} className={`fireworks-canvas${fixed ? ' fireworks-fixed' : ''}`} aria-hidden="true" />
}
