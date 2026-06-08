import { useState } from 'react'
import {
  getPlayerEarnings, getPlayerTotalEarnings, getPronoEarnings, buildCombinedRanking,
  isTopScorer, hasHatTrick, getCurrentTier, DEFAULT_SETTINGS, PRONO_BONUS
} from '../utils/bonus'

function getInitials(name) { return name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) }
const MEDALS = ['🥇','🥈','🥉']

// ── Ligne joueur — vue combinée ──────────────────────────────────────────────
function CombinedRow({ entry, rank, expanded, onToggle }) {
  const hasPrize = entry.totalEarnings > 0
  const ht = entry.totalGoals >= 3 || entry.totalPronoWins > 0

  return (
    <div className={`lb-row ${rank===1?'rank-1':rank===2?'rank-2':rank===3?'rank-3':''}`}
      style={{ animationDelay:`${rank*.04}s`, flexDirection:'column', gap:0, padding:0, overflow:'hidden' }}
    >
      {/* Main row */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 14px', cursor:entry.moduleDetails.length>0?'pointer':'default' }}
        onClick={onToggle}
      >
        <div className="rank-num">{rank<=3 ? MEDALS[rank-1] : rank}</div>
        <div className="lb-avatar" style={{ background:entry.color, position:'relative' }}>
          {entry.totalGoals>=3 && <span style={{ position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)', fontSize:'.8rem' }}>👑</span>}
          {getInitials(entry.name)}
        </div>
        <div className="lb-info">
          <div className="lb-name">{entry.name}</div>
          <div className="lb-badges">
            {entry.isCoach && <span className="badge-pill" style={{ background:'rgba(255,215,0,.15)', color:'var(--gold)', border:'1px solid rgba(255,215,0,.3)' }}>{entry.role}</span>}
            {entry.totalGoals>=3 && <span className="badge-pill badge-hatrick">👑 Hat-Trick</span>}
            {entry.totalPronoWins > 0 && <span className="badge-pill" style={{ background:'rgba(255,152,0,.15)', color:'#ff9800', border:'1px solid rgba(255,152,0,.3)' }}>🎯 {entry.totalPronoWins} prono{entry.totalPronoWins>1?'s':''}</span>}
            {entry.moduleDetails.length > 0 && <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.62rem', color:'rgba(240,244,255,.35)' }}>{expanded ? '▲' : '▼'} détail</span>}
          </div>
        </div>

        {/* Goals + prono totals */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1, flexShrink:0 }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'1.6rem', lineHeight:1 }}>{entry.totalGoals}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.6rem', letterSpacing:1, color:'var(--text-dim)', textTransform:'uppercase' }}>buts</div>
        </div>

        {/* Earnings breakdown */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', flexShrink:0, minWidth:70 }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'1.4rem', lineHeight:1, color:hasPrize?'var(--gold)':'rgba(240,244,255,.25)' }}>
            {entry.totalEarnings.toFixed(2)}€
          </div>
          {entry.pronoEarningsTotal > 0 && (
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.65rem', color:'#ff9800' }}>
              dont +{entry.pronoEarningsTotal.toFixed(2)}€ 🎯
            </div>
          )}
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.58rem', color:'var(--text-dim)', letterSpacing:1, textTransform:'uppercase' }}>total</div>
        </div>
      </div>

      {/* Expandable breakdown */}
      {expanded && entry.moduleDetails.length > 0 && (
        <div style={{ borderTop:'1px solid rgba(255,255,255,.06)', padding:'8px 14px 10px', background:'rgba(0,0,0,.2)' }}>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {entry.moduleDetails.map((d, i) => (
              <div key={i} style={{ background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:6, padding:'5px 10px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.72rem' }}>
                {d.type === 'forfait' ? (
                  <span>
                    <span style={{ color:'var(--text-dim)' }}>{d.name}:</span>{' '}
                    <span style={{ color:'var(--text)', fontWeight:700 }}>{d.goals} buts</span>{' '}
                    <span style={{ color:'var(--gold)' }}>→ {d.earnings.toFixed(2)}€</span>
                  </span>
                ) : (
                  <span>
                    <span style={{ color:'var(--text-dim)' }}>{d.name}:</span>{' '}
                    <span style={{ color:'#ff9800', fontWeight:700 }}>🎯 {d.wins}/{d.pronos} validé</span>{' '}
                    <span style={{ color:'#2ecc71' }}>→ +{d.earnings.toFixed(2)}€</span>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Vue module individuel (forfaits) ─────────────────────────────────────────
function ForfaitModuleView({ mod, coaches, validatedById = {}, isCanonical = false }) {
  const vpFor = (id) => isCanonical ? (validatedById[id]||0) : 0
  const allPeople = [...(mod.players||[]), ...coaches]
  const totalGoals = allPeople.reduce((s,p) => s+(p.goals||0), 0)
  const s = { ...DEFAULT_SETTINGS, ...mod.settings }
  const sorted = [...allPeople].sort((a,b) => (b.goals||0)-(a.goals||0) || a.name.localeCompare(b.name))
  const totalEarnings = sorted.reduce((sum,p) => sum+getPlayerTotalEarnings(p,allPeople,totalGoals,s,vpFor(p.id)), 0)
  const currentTier = getCurrentTier(totalGoals, s)

  return (
    <div className="lb-module-block">
      <div className="lb-module-header">
        <span>⚽ {mod.name}</span>
        <span className="lb-module-meta">{totalGoals} forfaits · Palier {currentTier} · {s.tier1Threshold&&totalGoals>=s.tier2Threshold?s.tier3Rate:totalGoals>=s.tier1Threshold?s.tier2Rate:s.tier1Rate}€/forfait</span>
      </div>
      {/* Tier progress */}
      <div style={{ display:'flex', gap:2, height:18, background:'rgba(0,0,0,.3)', marginBottom:2 }}>
        {[
          { w:`${(s.tier1Threshold/(s.tier2Threshold+15))*100}%`, pct:Math.min(100,(totalGoals/s.tier1Threshold)*100), label:`→${s.tier1Threshold}·${s.tier1Rate}€`, c:'linear-gradient(90deg,#2563eb,#3b82f6)' },
          { w:`${((s.tier2Threshold-s.tier1Threshold)/(s.tier2Threshold+15))*100}%`, pct:Math.min(100,Math.max(0,((totalGoals-s.tier1Threshold)/(s.tier2Threshold-s.tier1Threshold))*100)), label:`→${s.tier2Threshold}·${s.tier2Rate}€`, c:'linear-gradient(90deg,#0891b2,#00e5cc)' },
          { flex:1, pct:Math.min(100,Math.max(0,((totalGoals-s.tier2Threshold)/15)*100)), label:`+·${s.tier3Rate}€`, c:'linear-gradient(90deg,#d97706,#ffd700)' },
        ].map((seg,i) => (
          <div key={i} style={{ position:'relative', background:'rgba(255,255,255,.05)', overflow:'hidden', width:seg.w, flex:seg.flex, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ position:'absolute', left:0, top:0, height:'100%', width:`${seg.pct}%`, background:seg.c, transition:'width .5s' }} />
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.58rem', fontWeight:700, color:'rgba(255,255,255,.8)', position:'relative', zIndex:1 }}>{seg.label}</span>
          </div>
        ))}
      </div>

      {sorted.map((player, i) => {
        const earnings = getPlayerTotalEarnings(player, allPeople, totalGoals, s, vpFor(player.id))
        const isTop = isTopScorer(player, allPeople, s)
        const ht = hasHatTrick(player)
        const rank = i + 1
        return (
          <div key={player.id} className={`lb-row ${rank===1?'rank-1':rank===2?'rank-2':rank===3?'rank-3':''}`} style={{ animationDelay:`${i*.04}s` }}>
            <div className="rank-num">{rank<=3?MEDALS[rank-1]:rank}</div>
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
              </div>
            </div>
            <div className="lb-goals"><div className="lb-goals-num">{player.goals||0}</div><div className="lb-goals-label">buts</div></div>
            <div className="lb-earnings">
              <div className="lb-earn-num" style={{ color:isTop?'#ff6b35':earnings>0?'var(--gold)':'rgba(240,244,255,.2)' }}>{earnings.toFixed(2)}€</div>
              <div className="lb-earn-label">prime</div>
            </div>
          </div>
        )
      })}

      <div className="lb-total-bar" style={{ marginTop:8 }}>
        <div>
          <div className="lb-total-label">Total {mod.name}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.7rem', color:'rgba(240,244,255,.4)', marginTop:1 }}>{totalGoals} forfaits · {sorted.length} participants</div>
        </div>
        <div className="lb-total-num">{totalEarnings.toFixed(2)}€</div>
      </div>
    </div>
  )
}

// ── Vue module pronostic ──────────────────────────────────────────────────────
function PronoModuleView({ mod, coaches }) {
  const allPeople = [...(mod.players||[]), ...coaches]
  const sorted = [...allPeople].sort((a,b) => (b.validatedPronos||0)-(a.validatedPronos||0))
  const totalEarnings = sorted.reduce((s,p) => s+getPronoEarnings(p), 0)
  return (
    <div className="lb-module-block">
      <div className="lb-module-header" style={{ background:'rgba(255,152,0,.08)', borderColor:'rgba(255,152,0,.25)' }}>
        <span>🎯 {mod.name}</span>
        <span className="lb-module-meta">{sorted.reduce((s,p)=>s+(p.validatedPronos||0),0)} validés · {PRONO_BONUS}€/pronostic</span>
      </div>
      {sorted.map((player, i) => {
        const wins = player.validatedPronos || 0
        const earnings = getPronoEarnings(player)
        const rank = i + 1
        const hasScore = player.franceScore !== '' && player.franceScore !== undefined
        return (
          <div key={player.id} className={`lb-row ${rank===1&&wins>0?'rank-1':''}`} style={{ animationDelay:`${i*.04}s` }}>
            <div className="rank-num">{rank<=3?MEDALS[rank-1]:rank}</div>
            <div className="lb-avatar" style={{ background:player.color }}>
              {getInitials(player.name)}
            </div>
            <div className="lb-info">
              <div className="lb-name">{player.name}</div>
              <div className="lb-badges">
                {player.isCoach && <span className="badge-pill" style={{ background:'rgba(255,215,0,.15)', color:'var(--gold)', border:'1px solid rgba(255,215,0,.3)' }}>{player.role}</span>}
                {hasScore && <span className="badge-pill" style={{ background:'rgba(255,255,255,.06)', color:'rgba(240,244,255,.6)', fontSize:'.62rem' }}>🇫🇷{player.franceScore}—{player.irelandScore}🇮🇪</span>}
                {wins > 0 && <span className="badge-pill" style={{ background:'rgba(46,204,113,.15)', color:'#2ecc71', border:'1px solid rgba(46,204,113,.3)' }}>✓ {wins} juste{wins>1?'s':''}</span>}
              </div>
            </div>
            <div className="lb-goals"><div className="lb-goals-num" style={{ color:'#ff9800' }}>{player.pronos||0}</div><div className="lb-goals-label">pronos</div></div>
            <div className="lb-earnings">
              <div className="lb-earn-num" style={{ color:earnings>0?'#ff9800':'rgba(240,244,255,.2)' }}>{earnings.toFixed(2)}€</div>
              <div className="lb-earn-label">bonus</div>
            </div>
          </div>
        )
      })}
      <div className="lb-total-bar" style={{ marginTop:8 }}>
        <div>
          <div className="lb-total-label">Bonus Pronostics</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.7rem', color:'rgba(240,244,255,.4)', marginTop:1 }}>{mod.name}</div>
        </div>
        <div className="lb-total-num" style={{ color:'#ff9800' }}>{totalEarnings.toFixed(2)}€</div>
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function Leaderboard({ modules, coaches, activeModId }) {
  const [view, setView] = useState('combined')
  const [expandedId, setExpandedId] = useState(null)

  const validatedById = {}
  modules.forEach(m => { if (m.type==='pronostic') (m.players||[]).forEach(p => { validatedById[p.id]=(validatedById[p.id]||0)+(p.validatedPronos||0) }) })
  coaches.forEach(c => { if (c.validatedPronos) validatedById[c.id]=(validatedById[c.id]||0)+(c.validatedPronos||0) })
  const canonId = (modules.find(m => (m.type||'forfaits')==='forfaits')||modules[0])?.id
  const combined = buildCombinedRanking(modules, coaches)
  const grandTotal = combined.reduce((s, p) => s + p.totalEarnings, 0)
  const totalForfaits = combined.reduce((s, p) => s + p.totalGoals, 0)
  const totalPronoWins = combined.reduce((s, p) => s + p.totalPronoWins, 0)

  return (
    <div className="leaderboard">
      <div className="lb-header">
        <h2>CLASSEMENT</h2>
        <p>World Cup Challenge 2026 · Toutes parties confondues</p>
      </div>

      {/* View toggle */}
      <div className="lb-view-toggle" style={{ overflowX:'auto' }}>
        <button className={`lvt-btn ${view==='combined'?'active':''}`} onClick={() => setView('combined')}>
          📊 Combiné TOTAL
        </button>
        {modules.map(m => (
          <button key={m.id} className={`lvt-btn ${view===m.id?'active':''}`} onClick={() => setView(m.id)} style={{ flexShrink:0 }}>
            {m.type==='pronostic'?'🎯':'⚽'} {m.name}
          </button>
        ))}
      </div>

      {view === 'combined' && (
        <>
          {/* Combined summary */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
            <div style={{ background:'rgba(255,255,255,.05)', border:'1px solid var(--border)', borderRadius:8, padding:'10px', textAlign:'center' }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'1.8rem', color:'var(--gold)', lineHeight:1 }}>{totalForfaits}</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.65rem', color:'var(--text-dim)', letterSpacing:1, textTransform:'uppercase', marginTop:2 }}>Total forfaits</div>
            </div>
            <div style={{ background:'rgba(255,152,0,.06)', border:'1px solid rgba(255,152,0,.2)', borderRadius:8, padding:'10px', textAlign:'center' }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'1.8rem', color:'#ff9800', lineHeight:1 }}>{totalPronoWins}</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.65rem', color:'var(--text-dim)', letterSpacing:1, textTransform:'uppercase', marginTop:2 }}>Pronos validés 🎯</div>
            </div>
            <div style={{ background:'rgba(46,204,113,.06)', border:'1px solid rgba(46,204,113,.2)', borderRadius:8, padding:'10px', textAlign:'center' }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'1.8rem', color:'#2ecc71', lineHeight:1 }}>{grandTotal.toFixed(0)}€</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.65rem', color:'var(--text-dim)', letterSpacing:1, textTransform:'uppercase', marginTop:2 }}>Primes totales</div>
            </div>
          </div>

          {/* Combined rows */}
          {combined.map((entry, i) => (
            <CombinedRow
              key={entry.id} entry={entry} rank={i+1}
              expanded={expandedId === entry.id}
              onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
            />
          ))}

          {/* Grand total */}
          <div className="lb-total-bar" style={{ marginTop:12, background:'linear-gradient(135deg,rgba(255,215,0,.12),rgba(255,165,0,.08))', borderColor:'rgba(255,215,0,.35)' }}>
            <div>
              <div className="lb-total-label">🏆 GRAND TOTAL — TOUTES PARTIES</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.72rem', color:'rgba(240,244,255,.4)', marginTop:2 }}>
                {modules.length} module{modules.length>1?'s':''} · {totalForfaits} forfaits · {totalPronoWins} pronostics validés
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div className="lb-total-num" style={{ fontSize:'2.2rem' }}>{grandTotal.toFixed(2)}€</div>
              {totalPronoWins > 0 && <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.7rem', color:'#ff9800' }}>dont {combined.reduce((s,p)=>s+p.pronoEarningsTotal,0).toFixed(2)}€ bonus pronostics</div>}
            </div>
          </div>
        </>
      )}

      {/* Per-module views */}
      {view !== 'combined' && (() => {
        const mod = modules.find(m => m.id === view)
        if (!mod) return null
        return mod.type === 'pronostic'
          ? <PronoModuleView mod={mod} coaches={coaches} />
          : <ForfaitModuleView mod={mod} coaches={coaches} validatedById={validatedById} isCanonical={mod.id===canonId} />
      })()}
    </div>
  )
}
