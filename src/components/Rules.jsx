import { useMemo } from 'react'

function getDaysUntil(targetDate) {
  const now = new Date()
  const target = new Date(targetDate)
  const diff = target - now
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export default function Rules({ totalGoals, currentTier }) {
  const daysLeft = useMemo(() => getDaysUntil('2026-06-11'), [])

  return (
    <div className="rules-page">
      {/* Hero */}
      <div className="rules-hero">
        <div className="phase-badge">📅 Phase de Préparation</div>
        <h2>LES RÈGLES DU JEU</h2>
        <div className="rules-tagline">
          "Ensemble, on va chercher le bonus maximum !"
        </div>
      </div>

      {/* Countdown */}
      {daysLeft > 0 ? (
        <div className="countdown-bar">
          <span className="countdown-icon">⏰</span>
          <div>
            <div className="countdown-num">{daysLeft} JOUR{daysLeft > 1 ? 'S' : ''}</div>
            <div className="countdown-text">avant le coup d'envoi de la compétition (11/06/2026)</div>
          </div>
        </div>
      ) : (
        <div className="countdown-bar" style={{ borderColor: 'rgba(0,229,204,0.4)', background: 'rgba(0,229,204,0.06)' }}>
          <span className="countdown-icon">🚀</span>
          <div>
            <div className="countdown-num" style={{ color: 'var(--teal)' }}>LA COMPÉTITION A COMMENCÉ !</div>
            <div className="countdown-text">Continuez à marquer des forfaits !</div>
          </div>
        </div>
      )}

      {/* Tier cards */}
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem', fontWeight: 700, letterSpacing: 2, color: 'rgba(240,244,255,0.5)', textTransform: 'uppercase', marginBottom: 10 }}>
        💰 SYSTÈME DE PRIMES
      </div>
      <div className="tiers-grid">
        <div className={`tier-card tc1 ${currentTier === 1 ? 'active-tier' : ''}`}>
          <div className="tc-icon">🎽</div>
          <div className="tc-rate">10€</div>
          <div className="tc-label">Palier Starter</div>
          <div className="tc-desc">De 0 à 40 forfaits cumulés par l'équipe</div>
          <div className="tc-condition">Base · Tous participants</div>
          {currentTier === 1 && (
            <div style={{ marginTop: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.65rem', color: 'var(--tier1)', fontWeight: 700, letterSpacing: 1 }}>
              ◀ NIVEAU ACTUEL
            </div>
          )}
        </div>

        <div className={`tier-card tc2 ${currentTier === 2 ? 'active-tier' : ''}`}>
          <div className="tc-icon">🔥</div>
          <div className="tc-rate">12€</div>
          <div className="tc-label">Palier Pro</div>
          <div className="tc-desc">Dès 40 forfaits cumulés — tous les suivants</div>
          <div className="tc-condition">Pour tout le monde</div>
          {currentTier === 2 && (
            <div style={{ marginTop: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.65rem', color: 'var(--teal)', fontWeight: 700, letterSpacing: 1 }}>
              ◀ NIVEAU ACTUEL
            </div>
          )}
        </div>

        <div className={`tier-card tc3 ${currentTier === 3 ? 'active-tier' : ''}`}>
          <div className="tc-icon">💎</div>
          <div className="tc-rate">15€</div>
          <div className="tc-label">Palier Elite</div>
          <div className="tc-desc">Dès 50 forfaits cumulés — tous les suivants</div>
          <div className="tc-condition">⚠️ Si compteur individuel ≥ 3</div>
          {currentTier === 3 && (
            <div style={{ marginTop: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.65rem', color: 'var(--gold)', fontWeight: 700, letterSpacing: 1 }}>
              ◀ NIVEAU ACTUEL
            </div>
          )}
        </div>

        <div className="tier-card tc-top">
          <div className="tc-icon">👑</div>
          <div className="tc-rate">20€</div>
          <div className="tc-label">Top Buteur</div>
          <div className="tc-desc">Le meilleur buteur de la phase de préparation</div>
          <div className="tc-condition">20€ pour TOUS ses forfaits</div>
        </div>
      </div>

      {/* Top scorer special */}
      <div className="top-scorer-banner">
        <span className="tsb-icon">⭐</span>
        <div className="tsb-content">
          <div className="tsb-title">PRIME MEILLEUR BUTEUR</div>
          <div className="tsb-desc">
            Le joueur avec le plus de forfaits à la fin de la phase de préparation voit
            <strong style={{ color: '#fff' }}> TOUS ses forfaits </strong>
            recalculés à <strong style={{ color: '#ff6b35' }}>20€</strong> chacun.
            Une victoire individuelle qui récompense l'excellence !
          </div>
        </div>
        <div className="tsb-rate">20€</div>
      </div>

      {/* Step by step rules */}
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem', fontWeight: 700, letterSpacing: 2, color: 'rgba(240,244,255,0.5)', textTransform: 'uppercase', marginBottom: 10 }}>
        📋 COMMENT ÇA MARCHE ?
      </div>
      <div className="rules-steps">
        {[
          {
            n: 1,
            title: 'Faites le maximum de forfaits !',
            desc: 'Chaque forfait réalisé est enregistré dans l\'application. Cliquez sur votre ballon pour valider un nouveau forfait.',
          },
          {
            n: 2,
            title: 'L\'équipe franchit les paliers ensemble',
            desc: 'À 40 forfaits cumulés par l\'équipe, tout le monde passe à 12€. À 50, on monte à 15€ pour ceux qui ont ≥3 forfaits.',
          },
          {
            n: 3,
            title: 'Hat-Trick = Garantie bonus',
            desc: '3 forfaits ou plus = 👑 Coup du Chapeau ! Vous êtes certifié contributeur d\'équipe et garantissez votre accès au palier 15€.',
          },
          {
            n: 4,
            title: 'Contribuez à l\'effort collectif',
            desc: '"Le plus important dans une compétition collective, c\'est mettre sa pierre à l\'édifice." — La condition des 3 forfaits min pour le palier 15€.',
          },
          {
            n: 5,
            title: 'Visez le titre de Top Buteur',
            desc: 'En plus du bonus collectif, le meilleur buteur individuel décroche 20€ pour l\'ENSEMBLE de ses forfaits. Double victoire !',
          },
          {
            n: 6,
            title: 'La compétition ne s\'arrête pas à 3 buts !',
            desc: 'Après le hat-trick, continuez ! Chaque forfait supplémentaire gonfle votre prime. Ajoutez des slots avec le bouton "+".',
          },
        ].map((step, i) => (
          <div key={step.n} className="rules-step" style={{ animationDelay: `${i * 0.08}s` }}>
            <div className="step-num">{step.n}</div>
            <div className="step-content">
              <div className="step-title">{step.title}</div>
              <div className="step-desc">{step.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary bar */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(255,215,0,0.08), rgba(255,165,0,0.05))',
        border: '1px solid rgba(255,215,0,0.25)',
        borderRadius: 12,
        padding: '16px',
        marginBottom: 24,
        textAlign: 'center',
      }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: 2, color: 'var(--gold)', marginBottom: 6 }}>
          🏆 BONNE CHANCE À TOUS ! 🏆
        </div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.85rem', color: 'rgba(240,244,255,0.6)', lineHeight: 1.5 }}>
          Phase de préparation jusqu'au <strong style={{ color: '#fff' }}>11 juin 2026</strong><br />
          Coupe du Monde · USA · Canada · Mexique
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12 }}>
          {['🇺🇸', '🇨🇦', '🇲🇽'].map(flag => (
            <span key={flag} style={{ fontSize: '1.8rem' }}>{flag}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
