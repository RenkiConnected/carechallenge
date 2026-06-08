import { getPlayerEarnings, isTopScorer, hasHatTrick, getCurrentTier, DEFAULT_SETTINGS } from '../utils/bonus'

function getInitials(name) { return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) }
const MEDALS = ['🥇','🥈','🥉']

export default function Leaderboard({ players, totalGoals, settings }) {
  const s = { ...DEFAULT_SETTINGS, ...settings }
  const sorted = [...players].sort((a, b) => b.goals !== a.goals ? b.goals - a.goals : a.name.localeCompare(b.name))
  const totalEarnings = sorted.reduce((sum, p) => sum + getPlayerEarnings(p, players, totalGoals, s), 0)
  const currentTier = getCurrentTier(totalGoals, s)

  return (
    <div className="leaderboard">
      <div className="lb-header">
        <h2>CLASSEMENT</h2>
        <p>Phase de Préparation · World Cup 2026</p>
      </div>

      {/* Tier pills */}
      <div className="lb-tier-banner">
        <div className={`lb-tier-pill t1 ${currentTier === 1 ? 'active' : ''}`}>
          <div className="tp-name">Palier 1</div>
          <div className="tp-rate">{s.tier1Rate}€</div>
          <div className="tp-range">0 → {s.tier1Threshold}</div>
        </div>
        <div className={`lb-tier-pill t2 ${currentTier === 2 ? 'active' : ''}`}>
          <div className="tp-name">Palier 2</div>
          <div className="tp-rate">{s.tier2Rate}€</div>
          <div className="tp-range">{s.tier1Threshold + 1} → {s.tier2Threshold}</div>
        </div>
        <div className={`lb-tier-pill t3 ${currentTier === 3 ? 'active' : ''}`}>
          <div className="tp-name">Palier 3</div>
          <div className="tp-rate">{s.tier3Rate}€</div>
          <div className="tp-range">{s.tier2Threshold + 1}+ · ≥3 perso.</div>
        </div>
        <div className="lb-tier-pill" style={{ borderColor:'rgba(255,107,53,.4)', background:'rgba(255,107,53,.08)', flex:1, minWidth:80 }}>
          <div className="tp-name">Top Buteur{!s.phaseEnded ? ' ⏳' : ' ✅'}</div>
          <div className="tp-rate" style={{ color:'#ff6b35' }}>{s.topScorerRate}€</div>
          <div className="tp-range">{s.phaseEnded ? 'Actif !' : 'Fin de phase'}</div>
        </div>
      </div>

      {/* Progress to next tier */}
      {currentTier < 3 && (
        <div style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:10, padding:'12px 14px', marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.8rem', color:'rgba(240,244,255,.6)', marginBottom:6 }}>
            <span>
              {currentTier === 1
                ? `🎯 Encore ${s.tier1Threshold - totalGoals} forfaits → ${s.tier2Rate}€/forfait`
                : `🎯 Encore ${s.tier2Threshold - totalGoals} forfaits → ${s.tier3Rate}€/forfait`}
            </span>
            <span style={{ color:'var(--gold)' }}>
              {Math.min(totalGoals, currentTier === 1 ? s.tier1Threshold : s.tier2Threshold)}/{currentTier === 1 ? s.tier1Threshold : s.tier2Threshold}
            </span>
          </div>
          <div style={{ height:8, background:'rgba(255,255,255,.06)', borderRadius:4, overflow:'hidden' }}>
            <div style={{
              height:'100%',
              width:`${Math.min(100, currentTier === 1 ? (totalGoals/s.tier1Threshold)*100 : ((totalGoals-s.tier1Threshold)/(s.tier2Threshold-s.tier1Threshold))*100)}%`,
              background: currentTier === 1 ? 'linear-gradient(90deg,#2563eb,#3b82f6)' : 'linear-gradient(90deg,#0891b2,#00e5cc)',
              borderRadius:4, transition:'width .6s ease',
            }} />
          </div>
        </div>
      )}

      {/* Player rows */}
      {sorted.map((player, i) => {
        const earnings = getPlayerEarnings(player, players, totalGoals, s)
        const isTop = isTopScorer(player, players, s)
        const ht = hasHatTrick(player)
        const rank = i + 1

        return (
          <div
            key={player.id}
            className={`lb-row ${rank===1?'rank-1':rank===2?'rank-2':rank===3?'rank-3':''} ${isTop?'top-scorer':''}`}
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="rank-num">{rank <= 3 ? MEDALS[rank-1] : rank}</div>
            <div className="lb-avatar" style={{ background: player.color, position:'relative' }}>
              {ht && <span style={{ position:'absolute', top:-11, left:'50%', transform:'translateX(-50%)', fontSize:'.85rem', filter:'drop-shadow(0 0 4px rgba(255,215,0,.8))' }}>👑</span>}
              {getInitials(player.name)}
            </div>
            <div className="lb-info">
              <div className="lb-name">{player.name}</div>
              <div className="lb-badges">
                {player.isCoach && <span className="badge-pill" style={{ background:'rgba(255,215,0,.15)', color:'var(--gold)', border:'1px solid rgba(255,215,0,.3)' }}>{player.role}</span>}
                {isTop && <span className="badge-pill badge-top">⭐ Top Buteur</span>}
                {ht && !isTop && <span className="badge-pill badge-hatrick">👑 Hat-Trick</span>}
                {!ht && player.goals > 0 && (
                  <span className="badge-pill" style={{ background:'rgba(255,255,255,.06)', color:'rgba(240,244,255,.5)', fontSize:'.62rem' }}>
                    {s.minForTier3 - player.goals > 0 ? `${s.minForTier3 - player.goals} restant(s) hat-trick` : ''}
                  </span>
                )}
              </div>
            </div>
            <div className="lb-goals">
              <div className="lb-goals-num">{player.goals}</div>
              <div className="lb-goals-label">buts</div>
            </div>
            <div className="lb-earnings">
              <div className="lb-earn-num" style={{ color: isTop ? '#ff6b35' : earnings > 0 ? 'var(--gold)' : 'rgba(240,244,255,.3)' }}>
                {earnings.toFixed(2)}€
              </div>
              <div className="lb-earn-label">prime</div>
            </div>
          </div>
        )
      })}

      <div className="lb-total-bar">
        <div>
          <div className="lb-total-label">Total à distribuer</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.72rem', color:'rgba(240,244,255,.4)', marginTop:2 }}>
            {totalGoals} forfaits · {players.length} participants
          </div>
        </div>
        <div className="lb-total-num">{totalEarnings.toFixed(2)}€</div>
      </div>
    </div>
  )
}
