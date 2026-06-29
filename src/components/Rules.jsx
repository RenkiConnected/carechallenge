import { useMemo } from 'react'
import { DEFAULT_SETTINGS } from '../utils/bonus'

function getDaysUntil(targetDate) {
  const diff = new Date(targetDate) - new Date()
  return Math.max(0, Math.ceil(diff / (1000*60*60*24)))
}

export default function Rules({ totalGoals, currentTier, settings, moduleName }) {
  const s = { ...DEFAULT_SETTINGS, ...settings }
  const daysLeft = useMemo(() => getDaysUntil('2026-06-11'), [])

  // ── Règles ÉLIMINATION DIRECTE (bonus quotidien) ──
  if (s.dailyBonus) {
    const first3 = s.bonusFirst3 ?? 50
    const b2 = s.bonus2 ?? 30
    const n2 = s.bonus2Count ?? 4
    return (
      <div className="rules-page">
        <div className="rules-hero">
          <div className="phase-badge">⚔️ {moduleName || 'Élimination directe'}</div>
          <h2>LES RÈGLES DU JEU</h2>
          <div className="rules-tagline">"Chaque jour, une nouvelle course au triple !"</div>
        </div>

        <div className="countdown-bar" style={{ borderColor:'rgba(255,107,53,.4)', background:'rgba(255,107,53,.06)' }}>
          <span className="countdown-icon">🔄</span>
          <div>
            <div className="countdown-num" style={{ color:'#ff6b35' }}>COMPTEUR REMIS À ZÉRO CHAQUE JOUR À MINUIT</div>
            <div className="countdown-text">{s.bannerDates || 'DU 28 JUIN AU 09 JUILLET 2026'} · les gains, eux, se cumulent</div>
          </div>
        </div>

        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.8rem', fontWeight:700, letterSpacing:2, color:'rgba(240,244,255,.5)', textTransform:'uppercase', marginBottom:10 }}>💰 LE BONUS DU JOUR</div>
        <div className="tiers-grid">
          <div className="tier-card tc-top">
            <div className="tc-icon">🥇</div>
            <div className="tc-rate">{first3}€</div>
            <div className="tc-label">Triple gagnant</div>
            <div className="tc-desc">Le 1ᵉʳ joueur à atteindre 3 ballons dans la journée</div>
            <div className="tc-condition">1 seul gagnant par jour</div>
          </div>
          <div className="tier-card tc2">
            <div className="tc-icon">🥈</div>
            <div className="tc-rate">{b2}€</div>
            <div className="tc-label">Doublé</div>
            <div className="tc-desc">Les {n2} joueurs suivants à atteindre 2 ballons</div>
            <div className="tc-condition">⚠️ Seulement si un triple est réalisé</div>
          </div>
        </div>

        <div className="top-scorer-banner" style={{ background:'rgba(255,152,0,.08)', borderColor:'rgba(255,152,0,.3)' }}>
          <span className="tsb-icon">⚠️</span>
          <div className="tsb-content">
            <div className="tsb-title">PAS DE TRIPLE = PAS DE BONUS</div>
            <div className="tsb-desc">Si <strong style={{ color:'#fff' }}>personne</strong> n'atteint 3 ballons dans la journée, <strong style={{ color:'#ff6b35' }}>personne</strong> ne gagne de bonus ce jour-là — ni les 50€, ni les 30€. Les ballons seuls ne valent rien : tout passe par le bonus du jour.</div>
          </div>
        </div>

        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.8rem', fontWeight:700, letterSpacing:2, color:'rgba(240,244,255,.5)', textTransform:'uppercase', marginBottom:10 }}>📋 COMMENT ÇA MARCHE ?</div>
        <div className="rules-steps">
          {[
            { n:1, title:'Marquez vos ballons de la journée', desc:'Cliquez sur votre avatar puis sur un ballon ⚽. L\'ordre d\'arrivée compte : le 1ᵉʳ à 3 ballons rafle les ' + first3 + '€.' },
            { n:2, title:`Le 1ᵉʳ à 3 ballons gagne ${first3}€`, desc:`Dès qu'un joueur atteint 3 ballons (le triple), il remporte ${first3}€ pour la journée. Un seul gagnant du triple par jour.` },
            { n:3, title:`Les ${n2} suivants à 2 ballons gagnent ${b2}€`, desc:`Une fois le triple réalisé, les ${n2} premiers joueurs (hors gagnant du triple) à avoir au moins 2 ballons gagnent ${b2}€ chacun.` },
            { n:4, title:'Aucun triple = journée blanche', desc:'Si personne n\'atteint 3 ballons, aucun bonus n\'est distribué ce jour-là. Les anciennes primes par paliers (10€/12€/15€) ne s\'appliquent plus.' },
            { n:5, title:'Remise à zéro chaque jour à minuit', desc:'À minuit, le compteur de ballons repart à zéro pour une nouvelle journée. Les gains déjà acquis (50€/30€) sont conservés.' },
            { n:6, title:'Cumul dans le classement Élimination directe', desc:'Vos gains de chaque journée s\'additionnent jusqu\'au 9 juillet. Retrouvez le cumul dans l\'onglet Classement, section Élimination directe.' },
          ].map((step, i) => (
            <div key={step.n} className="rules-step" style={{ animationDelay:`${i * .08}s` }}>
              <div className="step-num">{step.n}</div>
              <div>
                <div className="step-title">{step.title}</div>
                <div className="step-desc">{step.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background:'linear-gradient(135deg,rgba(255,107,53,.10),rgba(255,165,0,.05))', border:'1px solid rgba(255,107,53,.25)', borderRadius:12, padding:16, marginBottom:24, textAlign:'center' }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'1.3rem', letterSpacing:2, color:'#ff6b35', marginBottom:6 }}>⚔️ QUE LE MEILLEUR GAGNE CHAQUE JOUR ! ⚔️</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.9rem', color:'rgba(240,244,255,.6)', lineHeight:1.6 }}>
            {s.bannerDates || 'DU 28 JUIN AU 09 JUILLET 2026'}<br/>
            Coupe du Monde · USA · Canada · Mexique
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rules-page">
      <div className="rules-hero">
        <div className="phase-badge">📅 Phase de Préparation</div>
        <h2>LES RÈGLES DU JEU</h2>
        <div className="rules-tagline">"Ensemble, on va chercher le bonus maximum !"</div>
      </div>

      {daysLeft > 0 ? (
        <div className="countdown-bar">
          <span className="countdown-icon">⏰</span>
          <div>
            <div className="countdown-num">{daysLeft} JOUR{daysLeft > 1 ? 'S' : ''}</div>
            <div className="countdown-text">avant le coup d'envoi de la compétition (11/06/2026)</div>
          </div>
        </div>
      ) : (
        <div className="countdown-bar" style={{ borderColor:'rgba(0,229,204,.4)', background:'rgba(0,229,204,.06)' }}>
          <span className="countdown-icon">🚀</span>
          <div>
            <div className="countdown-num" style={{ color:'var(--teal)' }}>LA COMPÉTITION A COMMENCÉ !</div>
            <div className="countdown-text">Continuez à marquer des forfaits !</div>
          </div>
        </div>
      )}

      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.8rem', fontWeight:700, letterSpacing:2, color:'rgba(240,244,255,.5)', textTransform:'uppercase', marginBottom:10 }}>💰 SYSTÈME DE PRIMES</div>

      <div className="tiers-grid">
        <div className={`tier-card tc1 ${currentTier === 1 ? 'active-tier' : ''}`}>
          <div className="tc-icon">🎽</div>
          <div className="tc-rate">{s.tier1Rate}€</div>
          <div className="tc-label">Palier Starter</div>
          <div className="tc-desc">De 0 à {s.tier1Threshold} forfaits cumulés par l'équipe</div>
          <div className="tc-condition">Base · Tous participants</div>
          {currentTier === 1 && <div style={{ marginTop:8, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.68rem', color:'var(--tier1)', fontWeight:700 }}>◀ NIVEAU ACTUEL</div>}
        </div>
        <div className={`tier-card tc2 ${currentTier === 2 ? 'active-tier' : ''}`}>
          <div className="tc-icon">🔥</div>
          <div className="tc-rate">{s.tier2Rate}€</div>
          <div className="tc-label">Palier Pro</div>
          <div className="tc-desc">Dès {s.tier1Threshold} forfaits cumulés — pour les suivants</div>
          <div className="tc-condition">Pour tout le monde</div>
          {currentTier === 2 && <div style={{ marginTop:8, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.68rem', color:'var(--teal)', fontWeight:700 }}>◀ NIVEAU ACTUEL</div>}
        </div>
        <div className={`tier-card tc3 ${currentTier === 3 ? 'active-tier' : ''}`}>
          <div className="tc-icon">💎</div>
          <div className="tc-rate">{s.tier3Rate}€</div>
          <div className="tc-label">Palier Elite</div>
          <div className="tc-desc">Dès {s.tier2Threshold} forfaits cumulés — pour les suivants</div>
          <div className="tc-condition">⚠️ Si individuel ≥ {s.minForTier3} forfaits</div>
          {currentTier === 3 && <div style={{ marginTop:8, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.68rem', color:'var(--gold)', fontWeight:700 }}>◀ NIVEAU ACTUEL</div>}
        </div>
        <div className="tier-card tc-top">
          <div className="tc-icon">👑</div>
          <div className="tc-rate">{s.topScorerRate}€</div>
          <div className="tc-label">Top Buteur</div>
          <div className="tc-desc">Le meilleur buteur de la phase de préparation</div>
          <div className="tc-condition">{s.topScorerRate}€ pour TOUS ses forfaits</div>
        </div>
      </div>

      <div className="top-scorer-banner">
        <span className="tsb-icon">⭐</span>
        <div className="tsb-content">
          <div className="tsb-title">PRIME MEILLEUR BUTEUR</div>
          <div className="tsb-desc">
            Le joueur avec le plus de forfaits à la fin de la phase voit <strong style={{ color:'#fff' }}>TOUS ses forfaits</strong> recalculés à <strong style={{ color:'#ff6b35' }}>{s.topScorerRate}€</strong> chacun. Déclenché en fin de phase par le manager.
          </div>
        </div>
        <div className="tsb-rate">{s.topScorerRate}€</div>
      </div>

      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.8rem', fontWeight:700, letterSpacing:2, color:'rgba(240,244,255,.5)', textTransform:'uppercase', marginBottom:10 }}>📋 COMMENT ÇA MARCHE ?</div>
      <div className="rules-steps">
        {[
          { n:1, title:'Faites le maximum de forfaits !', desc:'Chaque forfait réalisé est enregistré. Cliquez sur votre avatar puis sur un ballon ⚽ pour valider un nouveau forfait.' },
          { n:2, title:`L'équipe franchit les paliers ensemble`, desc:`À ${s.tier1Threshold} forfaits cumulés, tout le monde passe à ${s.tier2Rate}€. À ${s.tier2Threshold}, on monte à ${s.tier3Rate}€ pour ceux qui ont ≥${s.minForTier3} forfaits.` },
          { n:3, title:'Hat-Trick = Garantie bonus', desc:`${s.minForTier3} forfaits ou plus = 👑 Coup du Chapeau ! Vous êtes certifié contributeur d'équipe et garantissez votre accès au palier ${s.tier3Rate}€.` },
          { n:4, title:'Contribuez à l\'effort collectif', desc:'Le plus important dans une compétition collective, c\'est mettre sa pierre à l\'édifice. La condition des 3 forfaits min protège l\'équipe.' },
          { n:5, title:'Visez le titre de Top Buteur', desc:`En plus du bonus collectif, le meilleur buteur individuel décroche ${s.topScorerRate}€ pour l'ENSEMBLE de ses forfaits. Double victoire !` },
          { n:6, title:'La compétition continue après 3 buts !', desc:'Après le hat-trick, continuez ! Chaque forfait supplémentaire gonfle votre prime. Ajoutez des slots avec le bouton "+".' },
        ].map((step, i) => (
          <div key={step.n} className="rules-step" style={{ animationDelay:`${i * .08}s` }}>
            <div className="step-num">{step.n}</div>
            <div>
              <div className="step-title">{step.title}</div>
              <div className="step-desc">{step.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background:'linear-gradient(135deg,rgba(255,215,0,.08),rgba(255,165,0,.05))', border:'1px solid rgba(255,215,0,.25)', borderRadius:12, padding:16, marginBottom:24, textAlign:'center' }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'1.3rem', letterSpacing:2, color:'var(--gold)', marginBottom:6 }}>🏆 BONNE CHANCE À TOUS ! 🏆</div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.9rem', color:'rgba(240,244,255,.6)', lineHeight:1.6 }}>
          Phase de préparation jusqu'au <strong style={{ color:'#fff' }}>11 juin 2026</strong><br/>
          Coupe du Monde · USA · Canada · Mexique
        </div>
        <div style={{ display:'flex', justifyContent:'center', gap:16, marginTop:12 }}>
          {['🇺🇸','🇨🇦','🇲🇽'].map(f => <span key={f} style={{ fontSize:'1.8rem' }}>{f}</span>)}
        </div>
      </div>
    </div>
  )
}
