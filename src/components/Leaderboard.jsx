import { useState } from 'react'
import { getPlayerEarnings, isTopScorer, hasHatTrick, getCurrentTier, DEFAULT_SETTINGS } from '../utils/bonus'

function getInitials(name) { return name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) }
const MEDALS = ['🥇','🥈','🥉']

function ModuleLeaderboard({ mod, coaches }) {
  const allPeople = [...mod.players, ...coaches]
  const totalGoals = allPeople.reduce((s,p) => s+p.goals, 0)
  const s = { ...DEFAULT_SETTINGS, ...mod.settings }
  const sorted = [...allPeople].sort((a,b) => b.goals !== a.goals ? b.goals - a.goals : a.name.localeCompare(b.name))
  const totalEarnings = sorted.reduce((sum,p) => sum + getPlayerEarnings(p, allPeople, totalGoals, s), 0)
  const currentTier = getCurrentTier(totalGoals, s)

  return (
    <div className="lb-module-block">
      <div className="lb-module-header">
        <span>⚽ {mod.name}</span>
        <span className="lb-module-meta">{totalGoals} forfaits · Palier {currentTier}</span>
      </div>
      {sorted.map((player, i) => {
        const earnings = getPlayerEarnings(player, allPeople, totalGoals, s)
        const isTop = isTopScorer(player, allPeople, s)
        const ht = hasHatTrick(player)
        const rank = i + 1
        return (
          <div key={player.id}
            className={`lb-row ${rank===1?'rank-1':rank===2?'rank-2':rank===3?'rank-3':''}`}
            style={{ animationDelay:`${i*.05}s` }}
          >
            <div className="rank-num">{rank<=3 ? MEDALS[rank-1] : rank}</div>
            <div className="lb-avatar" style={{ background:player.color, position:'relative' }}>
              {ht && <span style={{ position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)', fontSize:'.8rem' }}>👑</span>}
              {getInitials(player.name)}
            </div>
            <div className="lb-info">
              <div className="lb-name">{player.name}</div>
              <div className="lb-badges">
                {player.isCoach && <span className="badge-pill" style={{ background:'rgba(255,215,0,.15)', color:'var(--gold)', border:'1px solid rgba(255,215,0,.3)' }}>{player.role}</span>}
                {isTop && <span className="badge-pill badge-top">⭐ Top</span>}
                {ht && !isTop && <span className="badge-pill badge-hatrick">👑 Hat-Trick</span>}
                {!ht && player.goals > 0 && <span className="badge-pill" style={{ background:'rgba(255,255,255,.06)', color:'rgba(240,244,255,.45)', fontSize:'.6rem' }}>{s.minForTier3 - player.goals > 0 ? `${s.minForTier3-player.goals} restant(s)` : ''}</span>}
              </div>
            </div>
            <div className="lb-goals">
              <div className="lb-goals-num">{player.goals}</div>
              <div className="lb-goals-label">buts</div>
            </div>
            <div className="lb-earnings">
              <div className="lb-earn-num" style={{ color:isTop?'#ff6b35':earnings>0?'var(--gold)':'rgba(240,244,255,.25)' }}>
                {earnings.toFixed(2)}€
              </div>
              <div className="lb-earn-label">prime</div>
            </div>
          </div>
        )
      })}
      <div className="lb-total-bar" style={{ marginTop:8 }}>
        <div>
          <div className="lb-total-label">Total {mod.name}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.7rem', color:'rgba(240,244,255,.4)', marginTop:1 }}>{totalGoals} forfaits</div>
        </div>
        <div className="lb-total-num">{totalEarnings.toFixed(2)}€</div>
      </div>
    </div>
  )
}

export default function Leaderboard({ modules, coaches, activeModId }) {
  const [view, setView] = useState('active') // 'active' | 'all'
  const activeMod = modules.find(m => m.id === activeModId) || modules[0]
  const shownModules = view === 'all' ? modules : [activeMod]

  const grandTotal = modules.reduce((s, mod) => {
    const allPeople = [...mod.players, ...coaches]
    const totalGoals = allPeople.reduce((a,p) => a+p.goals, 0)
    const ss = { ...DEFAULT_SETTINGS, ...mod.settings }
    return s + allPeople.reduce((a,p) => a + getPlayerEarnings(p, allPeople, totalGoals, ss), 0)
  }, 0)

  return (
    <div className="leaderboard">
      <div className="lb-header">
        <h2>CLASSEMENT</h2>
        <p>World Cup Challenge 2026</p>
      </div>

      {/* View toggle */}
      {modules.length > 1 && (
        <div className="lb-view-toggle">
          <button className={`lvt-btn ${view==='active'?'active':''}`} onClick={() => setView('active')}>
            ⚽ {activeMod?.name}
          </button>
          <button className={`lvt-btn ${view==='all'?'active':''}`} onClick={() => setView('all')}>
            📊 Toutes les parties
          </button>
        </div>
      )}

      {shownModules.map(mod => (
        <ModuleLeaderboard key={mod.id} mod={mod} coaches={coaches} />
      ))}

      {view === 'all' && modules.length > 1 && (
        <div className="lb-total-bar" style={{ marginTop:16, background:'linear-gradient(135deg,rgba(255,215,0,.12),rgba(255,165,0,.08))', borderColor:'rgba(255,215,0,.35)' }}>
          <div>
            <div className="lb-total-label">🏆 GRAND TOTAL — TOUTES PARTIES</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.72rem', color:'rgba(240,244,255,.4)', marginTop:2 }}>{modules.length} phases · {modules.reduce((s,m)=>[...m.players,...coaches].reduce((a,p)=>a+p.goals,s),0)} forfaits</div>
          </div>
          <div className="lb-total-num" style={{ fontSize:'2.2rem' }}>{grandTotal.toFixed(2)}€</div>
        </div>
      )}
    </div>
  )
}
