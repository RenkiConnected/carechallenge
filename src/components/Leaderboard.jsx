import { getPlayerEarnings, isTopScorer, hasHatTrick, getCurrentTier } from '../utils/bonus'

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function Leaderboard({ players, totalGoals }) {
  const sorted = [...players].sort((a, b) => {
    if (b.goals !== a.goals) return b.goals - a.goals
    return a.name.localeCompare(b.name)
  })

  const totalEarnings = sorted.reduce((s, p) => s + getPlayerEarnings(p, players, totalGoals), 0)
  const currentTier = getCurrentTier(totalGoals)

  const rowStyle = (i) => ({ animationDelay: `${i * 0.05}s` })

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
          <div className="tp-rate">10€</div>
          <div className="tp-range">0 → 40 forfaits</div>
        </div>
        <div className={`lb-tier-pill t2 ${currentTier === 2 ? 'active' : ''}`}>
          <div className="tp-name">Palier 2</div>
          <div className="tp-rate">12€</div>
          <div className="tp-range">41 → 50 forfaits</div>
        </div>
        <div className={`lb-tier-pill t3 ${currentTier === 3 ? 'active' : ''}`}>
          <div className="tp-name">Palier 3</div>
          <div className="tp-rate">15€</div>
          <div className="tp-range">51+ · si ≥3 perso.</div>
        </div>
        <div className="lb-tier-pill" style={{
          borderColor: 'rgba(255,107,53,0.4)',
          background: 'rgba(255,107,53,0.08)',
          flex: 1,
          minWidth: 80,
        }}>
          <div className="tp-name">Top Buteur</div>
          <div className="tp-rate" style={{ color: '#ff6b35' }}>20€</div>
          <div className="tp-range">Tous les forfaits</div>
        </div>
      </div>

      {/* Progress toward next tier */}
      {currentTier < 3 && (
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          padding: '12px 14px',
          marginBottom: 16,
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '0.75rem',
            color: 'rgba(240,244,255,0.6)',
            marginBottom: 8,
          }}>
            <span>
              {currentTier === 1
                ? `🎯 Encore ${40 - totalGoals} forfaits pour passer à 12€`
                : `🎯 Encore ${50 - totalGoals} forfaits pour passer à 15€`}
            </span>
            <span style={{ color: 'var(--gold)' }}>
              {totalGoals}/{currentTier === 1 ? 40 : 50}
            </span>
          </div>
          <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, currentTier === 1 ? (totalGoals/40)*100 : ((totalGoals-40)/10)*100)}%`,
              background: currentTier === 1
                ? 'linear-gradient(90deg, #2563eb, #3b82f6)'
                : 'linear-gradient(90deg, #0891b2, #00e5cc)',
              borderRadius: 4,
              transition: 'width 0.6s ease',
            }} />
          </div>
        </div>
      )}

      {/* Player rows */}
      {sorted.map((player, i) => {
        const earnings = getPlayerEarnings(player, players, totalGoals)
        const isTop = isTopScorer(player, players)
        const ht = hasHatTrick(player)
        const rank = i + 1

        return (
          <div
            key={player.id}
            className={`lb-row ${rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : ''} ${isTop ? 'top-scorer' : ''}`}
            style={rowStyle(i)}
          >
            {/* Rank */}
            <div className="rank-num">
              {rank <= 3 ? MEDALS[rank - 1] : rank}
            </div>

            {/* Avatar */}
            <div className="lb-avatar" style={{ background: player.color, position: 'relative' }}>
              {ht && (
                <span style={{
                  position: 'absolute', top: -10, left: '50%',
                  transform: 'translateX(-50%)', fontSize: '0.8rem',
                  filter: 'drop-shadow(0 0 4px rgba(255,215,0,0.8))',
                }}>👑</span>
              )}
              {getInitials(player.name)}
            </div>

            {/* Info */}
            <div className="lb-info">
              <div className="lb-name">{player.name}</div>
              <div className="lb-badges">
                {player.isCoach && (
                  <span className="badge-pill" style={{ background: 'rgba(255,215,0,0.15)', color: 'var(--gold)', border: '1px solid rgba(255,215,0,0.3)' }}>
                    {player.role}
                  </span>
                )}
                {isTop && <span className="badge-pill badge-top">⭐ Top Buteur</span>}
                {ht && !isTop && <span className="badge-pill badge-hatrick">👑 Hat-Trick</span>}
                {!ht && player.goals > 0 && (
                  <span className="badge-pill" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(240,244,255,0.5)', fontSize: '0.58rem' }}>
                    {3 - player.goals} restant{3 - player.goals > 1 ? 's' : ''} pour bonus
                  </span>
                )}
                {currentTier >= 2 && <span className="badge-pill badge-tier2">Palier {currentTier}</span>}
              </div>
            </div>

            {/* Goals */}
            <div className="lb-goals">
              <div className="lb-goals-num">{player.goals}</div>
              <div className="lb-goals-label">buts</div>
            </div>

            {/* Earnings */}
            <div className="lb-earnings">
              <div className="lb-earn-num" style={{ color: isTop ? '#ff6b35' : earnings > 0 ? 'var(--gold)' : 'rgba(240,244,255,0.3)' }}>
                {earnings}€
              </div>
              <div className="lb-earn-label">prime</div>
            </div>
          </div>
        )
      })}

      {/* Total */}
      <div className="lb-total-bar">
        <div>
          <div className="lb-total-label">Total à distribuer</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.7rem', color: 'rgba(240,244,255,0.4)', marginTop: 2 }}>
            {totalGoals} forfaits · {players.length} participants
          </div>
        </div>
        <div className="lb-total-num">{totalEarnings}€</div>
      </div>
    </div>
  )
}
