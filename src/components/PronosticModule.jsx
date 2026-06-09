import { PRONO_BONUS } from '../utils/bonus'
import Fireworks from './Fireworks'

function getInitials(name) { return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) }
const hasScore = p => p.franceScore !== '' && p.franceScore != null && p.irelandScore !== '' && p.irelandScore != null

function PredictionPoll({ player, onUpdate }) {
  return (
    <div className="pred-score-box">
      <div className="pred-flags-row">
        <div className="pred-team"><span className="pred-flag">🇫🇷</span><span className="pred-team-name">FRA</span></div>
        <div className="pred-inputs">
          <input className="score-inp" type="number" min="0" max="20" value={player.franceScore ?? ''} placeholder="–"
            onChange={e => onUpdate(player.id, { franceScore: e.target.value === '' ? '' : Number(e.target.value) })} />
          <span className="score-colon">:</span>
          <input className="score-inp" type="number" min="0" max="20" value={player.irelandScore ?? ''} placeholder="–"
            onChange={e => onUpdate(player.id, { irelandScore: e.target.value === '' ? '' : Number(e.target.value) })} />
        </div>
        <div className="pred-team"><span className="pred-flag">🇮🇪</span><span className="pred-team-name">IRL</span></div>
      </div>
    </div>
  )
}

function PlayerPronoCard({ player, onUpdate, onAddBall, onRemoveBall }) {
  const won = player.pronoStatus === 'won'
  const lost = player.pronoStatus === 'lost'
  const lines = player.pronos || 0
  return (
    <div className={`prono-card ${won ? 'prono-card-won prono-winner-anim' : ''} ${lost ? 'prono-card-lost' : ''}`}>
      <div className="prono-card-avatar-row">
        <div className="prono-avatar-wrap">
          {won && <span className="prono-float-crown">👑</span>}
          <div className="prono-avatar" style={{ background: player.color }}>{getInitials(player.name)}</div>
          {won && <div className="prono-validated-badge">✓</div>}
        </div>
        <div className="prono-card-info">
          <div className="prono-card-name">{player.name}</div>
          {player.isCoach && <div className="prono-card-role">{player.role}</div>}
          {won && lines > 0 && <div className="prono-card-earnings">+{lines * PRONO_BONUS}€</div>}
        </div>
      </div>
      <PredictionPoll player={player} onUpdate={onUpdate} />

      {/* Lignes du jour : comptent en Préparation Mondiale ; 20€ chacune si bon pronostic */}
      <div className="prono-balls-section">
        <div className="prono-balls-label">Lignes du jour{won && lines > 0 ? ' · payées 20€ 🎉' : ''}</div>
        <div className="prono-balls-row">
          {Array.from({ length: lines }, (_, i) => (
            <span key={i} className={`prono-ball ${won ? 'prono-ball-won' : 'prono-ball-pending'}`}>⚽</span>
          ))}
          <button className="add-prono-ball" onClick={() => onAddBall(player.id)} title="Ajouter une ligne du jour (+1 forfait en Préparation Mondiale)">+</button>
          {lines > 0 && <button className="rem-prono-ball" onClick={() => onRemoveBall(player.id)} title="Retirer une ligne">−</button>}
        </div>
      </div>

      {won && <div className="prono-won-label">🎉 BON PRONOSTIC · {lines} ligne{lines>1?'s':''} × 20€ = <strong>+{lines * PRONO_BONUS}€</strong></div>}
      {lost && <div className="prono-lost-label">❌ Pronostic raté · lignes au tarif normal</div>}
      {!won && !lost && hasScore(player) && <div className="pred-locked">🔒 Pronostic enregistré</div>}
    </div>
  )
}

export default function PronosticModule({ module, players, coaches, dashAuth, onUpdatePerson, onSetResult, onValidateAll, onAddBall, onRemoveBall }) {
  const allPeople = [...players, ...coaches]
  const result = module?.result || {}
  const resultSet = result.france !== '' && result.france != null && result.ireland !== '' && result.ireland != null
  const validatedRound = module?.validatedRound || 0

  const voters = allPeople.filter(hasScore)
  const winners = allPeople.filter(p => p.pronoStatus === 'won')
  const showResultBlock = validatedRound > 0 && resultSet
  const nobodyWon = showResultBlock && winners.length === 0

  return (
    <div className="prono-module">
      {/* Feu d'artifice plein écran si au moins un bon pronostic */}
      <Fireworks active={winners.length > 0} fixed intense confetti />
      <div className="prono-module-header">
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:'2rem' }}>🎯</span>
          <div>
            <div className="pmt-title">BON PRONOSTIQUEUR</div>
            <div className="pmt-sub">Challenge dans le challenge</div>
          </div>
        </div>
        <div className="special-day-pill">⭐ PRONOSTIC JUSTE · {PRONO_BONUS}€</div>
      </div>

      <div className="match-card-big">
        <div className="match-card-overlay" />
        <div className="match-card-inner">
          <div className="match-card-label">📋 PRONOSTIC · FRANCE VS IRLANDE</div>
          <div className="match-teams-big">
            <div className="match-team-block france-side"><span className="match-big-flag">🇫🇷</span><span className="match-team-name">FRANCE</span></div>
            <div className="match-center-block"><div className="match-vs">VS</div><div className="match-competition">Coupe du Monde 2026</div></div>
            <div className="match-team-block ireland-side"><span className="match-big-flag">🇮🇪</span><span className="match-team-name">IRLANDE</span></div>
          </div>
          <div className="match-bonus-tag">Pronostic correct = <strong style={{ color:'#ffd700' }}>{PRONO_BONUS}€</strong> de bonus 🏆</div>
        </div>
      </div>

      {dashAuth ? (
        <div className="prono-result-box">
          <div className="prono-result-title">🏁 Résultat officiel du match</div>
          <div className="prono-result-row">
            <span className="pred-flag">🇫🇷</span>
            <input className="score-inp result-inp" type="number" min="0" max="20" placeholder="–"
              value={result.france ?? ''} onChange={e => onSetResult(module.id, 'france', e.target.value === '' ? '' : Number(e.target.value))} />
            <span className="score-colon">:</span>
            <input className="score-inp result-inp" type="number" min="0" max="20" placeholder="–"
              value={result.ireland ?? ''} onChange={e => onSetResult(module.id, 'ireland', e.target.value === '' ? '' : Number(e.target.value))} />
            <span className="pred-flag">🇮🇪</span>
          </div>
          <button className="prono-validate-all-btn" disabled={!resultSet} onClick={() => onValidateAll(module.id)}>
            ✓ Valider tous les pronostics
          </button>
          {!resultSet && <div className="prono-result-hint">Saisissez le score réel puis validez : tout se calcule d'un coup.</div>}
        </div>
      ) : (
        resultSet
          ? <div className="prono-result-public">🏁 Résultat : 🇫🇷 {result.france} — {result.ireland} 🇮🇪</div>
          : <div className="prono-result-public dim">⏳ En attente du résultat officiel…</div>
      )}

      {showResultBlock && winners.length > 0 && (
        <div className="prono-winner-banner">
          🎉 {winners.length === 1 ? winners[0].name : `${winners.length} GAGNANTS`} · BON PRONOSTIC ! +{PRONO_BONUS}€
        </div>
      )}
      {nobodyWon && <div className="prono-perdu-banner">PERDU — aucun bon pronostic</div>}

      <div className="prono-stats-bar">
        <div className="prono-stat-item"><div className="psi-num">{voters.length}/{allPeople.length}</div><div className="psi-label">Ont voté</div></div>
        <div className="prono-stat-item"><div className="psi-num" style={{ color:'#2ecc71' }}>{winners.length}</div><div className="psi-label">Gagnants 🎯</div></div>
        <div className="prono-stat-item"><div className="psi-num" style={{ color:'#ff9800' }}>{winners.length * PRONO_BONUS}€</div><div className="psi-label">Bonus distribué</div></div>
      </div>

      <div className="prono-grid">
        {allPeople.map(player => (
          <PlayerPronoCard key={player.id} player={player} onUpdate={onUpdatePerson} onAddBall={onAddBall} onRemoveBall={onRemoveBall} />
        ))}
      </div>

      {!dashAuth && (
        <div style={{ textAlign:'center', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.78rem', color:'rgba(240,244,255,.38)', marginTop:8, paddingBottom:20 }}>
          🔧 Le manager saisit le résultat et valide les pronostics
        </div>
      )}
    </div>
  )
}
