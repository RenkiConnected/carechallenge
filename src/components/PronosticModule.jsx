import { PRONO_BONUS } from '../utils/bonus'
import Fireworks from './Fireworks'

function getInitials(name) { return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) }
const hasScore = p => p.franceScore !== '' && p.franceScore != null && p.irelandScore !== '' && p.irelandScore != null

// Équipes (génériques) : par défaut France–Irlande, sinon configurées dans settings.
function teamsOf(module) {
  const s = module?.settings || {}
  return {
    homeFlag: s.homeFlag || '🇫🇷', homeName: s.homeName || 'FRANCE', homeCode: s.homeCode || 'FRA',
    awayFlag: s.awayFlag || '🇮🇪', awayName: s.awayName || 'IRLANDE', awayCode: s.awayCode || 'IRL',
    label: s.matchLabel || `FRANCE VS ${(s.awayName || 'IRLANDE')}`,
  }
}

function PredictionPoll({ player, onUpdate, T, locked }) {
  return (
    <div className="pred-score-box">
      <div className="pred-flags-row">
        <div className="pred-team"><span className="pred-flag">{T.homeFlag}</span><span className="pred-team-name">{T.homeCode}</span></div>
        <div className="pred-inputs">
          <input className="score-inp" type="number" min="0" max="20" value={player.franceScore ?? ''} placeholder="–" disabled={locked}
            onChange={e => onUpdate(player.id, { franceScore: e.target.value === '' ? '' : Number(e.target.value) })} />
          <span className="score-colon">:</span>
          <input className="score-inp" type="number" min="0" max="20" value={player.irelandScore ?? ''} placeholder="–" disabled={locked}
            onChange={e => onUpdate(player.id, { irelandScore: e.target.value === '' ? '' : Number(e.target.value) })} />
        </div>
        <div className="pred-team"><span className="pred-flag">{T.awayFlag}</span><span className="pred-team-name">{T.awayCode}</span></div>
      </div>
    </div>
  )
}

function PlayerPronoCard({ player, onUpdate, onAddBall, onRemoveBall, T, predLocked, ballLocked, bonus = PRONO_BONUS }) {
  const won = player.pronoStatus === 'won'
  const lost = player.pronoStatus === 'lost'
  const lines = player.pronos || 0
  const cardLocked = predLocked && ballLocked
  return (
    <div className={`prono-card ${won ? 'prono-card-won prono-winner-anim' : ''} ${lost ? 'prono-card-lost' : ''} ${cardLocked ? 'prono-card-locked' : ''}`}>
      <div className="prono-card-avatar-row">
        <div className="prono-avatar-wrap">
          {won && <span className="prono-float-crown">👑</span>}
          <div className="prono-avatar" style={{ background: player.color }}>{getInitials(player.name)}</div>
          {won && <div className="prono-validated-badge">✓</div>}
        </div>
        <div className="prono-card-info">
          <div className="prono-card-name">{player.name}</div>
          {player.isCoach && <div className="prono-card-role">{player.role}</div>}
          {won && lines > 0 && <div className="prono-card-earnings">+{lines * bonus}€</div>}
        </div>
      </div>
      <PredictionPoll player={player} onUpdate={onUpdate} T={T} locked={predLocked} />

      <div className="prono-balls-section">
        <div className="prono-balls-label">Lignes du jour{won && lines > 0 ? ` · payées ${bonus}€ 🎉` : ''}</div>
        <div className="prono-balls-row">
          {Array.from({ length: lines }, (_, i) => (
            <span key={i} className={`prono-ball ${won ? 'prono-ball-won' : 'prono-ball-pending'}`}>⚽</span>
          ))}
          <button className="add-prono-ball" disabled={ballLocked} onClick={() => onAddBall(player.id)}
            title={ballLocked ? 'Ballons fermés' : 'Ajouter une ligne du jour'}>+</button>
          {lines > 0 && <button className="rem-prono-ball" disabled={ballLocked} onClick={() => onRemoveBall(player.id)} title="Retirer une ligne">−</button>}
        </div>
      </div>

      {won && <div className="prono-won-label">🎉 BON PRONOSTIC · {lines} ligne{lines>1?'s':''} × {bonus}€ = <strong>+{lines * bonus}€</strong></div>}
      {lost && <div className="prono-lost-label">❌ Pronostic raté · lignes au tarif normal</div>}
      {!won && !lost && hasScore(player) && <div className="pred-locked">🔒 Pronostic enregistré</div>}
    </div>
  )
}

function fmtDate(ts) {
  try { return new Date(ts).toLocaleString('fr-FR', { day:'numeric', month:'long', hour:'2-digit', minute:'2-digit' }) } catch { return '' }
}
function fmtDay(ts) {
  try { return new Date(ts).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' }) } catch { return '' }
}

export default function PronosticModule({ module, players, coaches, dashAuth, editableId, onUpdatePerson, onSetResult, onValidateAll, onAddBall, onRemoveBall }) {
  // Les coachs : si le module a son propre stockage (coachData), on l'utilise (pronostic
  // indépendant par match) ; sinon on garde les champs globaux (France–Irlande historique).
  const coachPeople = (module?.coachData !== undefined)
    ? coaches.map(c => ({ ...c, franceScore:'', irelandScore:'', pronos:0, validatedPronos:0, pronoStatus:'', ...(module.coachData[c.id] || {}) }))
    : coaches
  const allPeople = [...players, ...coachPeople]
  const result = module?.result || {}
  const resultSet = result.france !== '' && result.france != null && result.ireland !== '' && result.ireland != null
  const validatedRound = module?.validatedRound || 0
  const T = teamsOf(module)

  // Deux fenêtres : prédiction du score (window) et dépôt des ballons (ballWindow).
  // Si ballWindow est absent, les ballons suivent la même fenêtre que la prédiction.
  const win = module?.settings?.window
  const ballWin = module?.settings?.ballWindow || win
  const now = Date.now()
  const fromTs = win ? Date.parse(win.from) : null
  const toTs = win ? Date.parse(win.to) : null
  const beforeOpen = win && now < fromTs
  const closed = win && now > toTs
  const predLocked = !!(beforeOpen || closed)               // prédiction du score
  const bFromTs = ballWin ? Date.parse(ballWin.from) : null
  const bToTs = ballWin ? Date.parse(ballWin.to) : null
  const ballBefore = ballWin && now < bFromTs
  const ballClosed = ballWin && now > bToTs
  const ballLocked = !!(ballBefore || ballClosed)           // dépôt des ballons

  const voters = allPeople.filter(hasScore)
  const winners = allPeople.filter(p => p.pronoStatus === 'won')
  const bonus = module?.settings?.pronoBonus || PRONO_BONUS
  const knockout = !!module?.settings?.knockout
  const phaseLabel = module?.settings?.phaseLabel
  const showResultBlock = validatedRound > 0 && resultSet
  const nobodyWon = showResultBlock && winners.length === 0

  return (
    <div className={`prono-module${knockout ? ' prono-knockout' : ''}`}>
      <Fireworks active={winners.length > 0} fixed intense confetti />
      {knockout && phaseLabel && (
        <div className="knockout-banner">
          <span className="knockout-spark">⚔️</span>
          <span className="knockout-phase">{phaseLabel}</span>
          <span className="knockout-spark">⚔️</span>
        </div>
      )}
      <div className="prono-module-header">
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:'2rem' }}>{knockout ? '🏆' : '🎯'}</span>
          <div>
            <div className="pmt-title">{knockout ? 'VOTE — PHASE FINALE' : 'BON PRONOSTIQUEUR'}</div>
            <div className="pmt-sub">{knockout ? (phaseLabel || 'Élimination directe') : 'Challenge dans le challenge'}</div>
          </div>
        </div>
        <div className="special-day-pill">{knockout ? '🗳️ VOTE OUVERT' : `⭐ PRONOSTIC JUSTE · ${bonus}€`}</div>
      </div>

      <div className="match-card-big">
        <div className="match-card-overlay" />
        <div className="match-card-inner">
          <div className="match-card-label">📋 PRONOSTIC · {T.label}</div>
          <div className="match-teams-big">
            <div className="match-team-block france-side"><span className="match-big-flag">{T.homeFlag}</span><span className="match-team-name">{T.homeName}</span></div>
            <div className="match-center-block"><div className="match-vs">VS</div><div className="match-competition">Coupe du Monde 2026</div></div>
            <div className="match-team-block ireland-side"><span className="match-big-flag">{T.awayFlag}</span><span className="match-team-name">{T.awayName}</span></div>
          </div>
          <div className="match-bonus-tag">Pronostic correct = <strong style={{ color:"#ffd700" }}>{bonus}€</strong> de bonus 🏆</div>
        </div>
      </div>

      {win && (
        <div className="prono-window-banner-group">
          {beforeOpen
            ? <div className="prono-window-banner closed">🔒 Pronostics ouverts aux vendeurs le {fmtDate(fromTs)}</div>
            : closed
              ? <div className="prono-window-banner closed">🔒 Pronostics clôturés (fermés le {fmtDate(toTs)})</div>
              : <div className="prono-window-banner open">🟢 Pronostics ouverts — score à remplir jusqu'au {fmtDate(toTs)}</div>}
          {ballWin && module?.settings?.ballWindow && (
            ballBefore
              ? <div className="prono-window-banner closed">⚽ Ballons ouverts le {fmtDate(bFromTs)}</div>
              : ballClosed
                ? <div className="prono-window-banner closed">⚽ Ballons clôturés (fermés le {fmtDate(bToTs)})</div>
                : <div className="prono-window-banner open">⚽ Ballons ouverts — à déposer jusqu'au {fmtDate(bToTs)}</div>
          )}
        </div>
      )}

      {dashAuth ? (
        <div className="prono-result-box">
          <div className="prono-result-title">🏁 Résultat officiel du match</div>
          <div className="prono-result-row">
            <span className="pred-flag">{T.homeFlag}</span>
            <input className="score-inp result-inp" type="number" min="0" max="20" placeholder="–"
              value={result.france ?? ''} onChange={e => onSetResult(module.id, 'france', e.target.value === '' ? '' : Number(e.target.value))} />
            <span className="score-colon">:</span>
            <input className="score-inp result-inp" type="number" min="0" max="20" placeholder="–"
              value={result.ireland ?? ''} onChange={e => onSetResult(module.id, 'ireland', e.target.value === '' ? '' : Number(e.target.value))} />
            <span className="pred-flag">{T.awayFlag}</span>
          </div>
          <button className="prono-validate-all-btn" disabled={!resultSet} onClick={() => onValidateAll(module.id)}>
            ✓ Valider tous les pronostics
          </button>
          {!resultSet && <div className="prono-result-hint">Saisissez le score réel puis validez : tout se calcule d'un coup.</div>}
        </div>
      ) : (
        resultSet
          ? <div className="prono-result-public">🏁 Résultat : {T.homeFlag} {result.france} — {result.ireland} {T.awayFlag}</div>
          : <div className="prono-result-public dim">⏳ En attente du résultat officiel…</div>
      )}

      {showResultBlock && winners.length > 0 && (
        <div className="prono-winner-banner">
          🎉 {winners.length === 1 ? winners[0].name : `${winners.length} GAGNANTS`} · BON PRONOSTIC ! +{bonus}€
        </div>
      )}
      {nobodyWon && <div className="prono-perdu-banner">PERDU — aucun bon pronostic</div>}

      <div className="prono-stats-bar">
        <div className="prono-stat-item"><div className="psi-num">{voters.length}/{allPeople.length}</div><div className="psi-label">Ont voté</div></div>
        <div className="prono-stat-item"><div className="psi-num" style={{ color:'#2ecc71' }}>{winners.length}</div><div className="psi-label">Gagnants 🎯</div></div>
        <div className="prono-stat-item"><div className="psi-num" style={{ color:'#ff9800' }}>{winners.length * bonus}€</div><div className="psi-label">Bonus distribué</div></div>
      </div>

      <div className="prono-grid">
        {allPeople.map(player => {
          const mine = editableId === '*' || editableId === player.id
          return (
            <PlayerPronoCard key={player.id} player={player} onUpdate={onUpdatePerson} onAddBall={onAddBall} onRemoveBall={onRemoveBall} T={T}
              predLocked={(predLocked && !dashAuth) || !mine} ballLocked={(ballLocked && !dashAuth) || !mine} bonus={bonus} />
          )
        })}
      </div>

      {!dashAuth && (
        <div style={{ textAlign:'center', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.78rem', color:'rgba(240,244,255,.38)', marginTop:8, paddingBottom:20 }}>
          🔧 Le manager saisit le résultat et valide les pronostics
        </div>
      )}
    </div>
  )
}
