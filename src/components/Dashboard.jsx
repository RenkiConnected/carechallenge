import { useState } from 'react'
import { getPlayerEarnings, isTopScorer, hasHatTrick, DEFAULT_SETTINGS } from '../utils/bonus'
import { exportPdf } from '../utils/exportPdf'

const PASSWORD = 'Raphael2232'
function getInitials(name) { return name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) }

const COLORS = ['#e74c3c','#3498db','#2ecc71','#e67e22','#9b59b6','#1abc9c','#e91e8c','#ff9800','#00bcd4','#ffd700','#ff6b35','#c0392b']

function ColorPicker({ current, onChange }) {
  return (
    <div style={{ display:'flex', gap:4, flexWrap:'wrap', padding:'5px 0 3px' }}>
      {COLORS.map(c => (
        <button key={c} onClick={() => onChange(c)} style={{ width:22, height:22, borderRadius:'50%', background:c, border:current===c?'2.5px solid #fff':'2px solid transparent', cursor:'pointer', outline:'none', transform:current===c?'scale(1.25)':'scale(1)', transition:'transform .15s' }} />
      ))}
    </div>
  )
}

function PlayerRow({ player, onUpdate, onAddGoal, onRemoveGoal, onRemove, allPeople, totalGoals, settings }) {
  const [exp, setExp] = useState(false)
  const earnings = getPlayerEarnings(player, allPeople, totalGoals, settings)
  const isTop = isTopScorer(player, allPeople, settings)
  return (
    <div style={{ borderBottom:'1px solid rgba(255,255,255,.07)' }}>
      <div className="player-manage-row">
        <div className="pm-avatar" style={{ background:player.color, cursor:'pointer' }} onClick={() => setExp(!exp)}>
          {getInitials(player.name)}
        </div>
        <input className="pm-name-input" value={player.name} onChange={e => onUpdate(player.id, { name:e.target.value })} placeholder="Nom" />
        {player.isCoach && <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.68rem', color:'var(--gold)', fontWeight:700, flexShrink:0 }}>{player.role}</span>}
        <div className="pm-goals">
          <button className="pm-goal-btn" onClick={() => onRemoveGoal(player.id)}>−</button>
          <span className="pm-goal-num">{player.goals}</span>
          <button className="pm-goal-btn" onClick={() => onAddGoal(player.id)}>+</button>
        </div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'1.05rem', color:isTop?'#ff6b35':earnings>0?'var(--gold)':'rgba(240,244,255,.25)', minWidth:50, textAlign:'right', flexShrink:0 }}>
          {earnings.toFixed(2)}€
        </div>
        {!player.isCoach && (
          <button className="pm-remove-btn" onClick={() => { if(window.confirm(`Supprimer ${player.name} ?`)) onRemove(player.id) }}>🗑</button>
        )}
      </div>
      {exp && <div style={{ padding:'0 0 8px 46px' }}><ColorPicker current={player.color} onChange={color => onUpdate(player.id, { color })} /></div>}
    </div>
  )
}

function SettingField({ label, desc, value, onChange, unit='€', min=0, max=9999, step=0.01 }) {
  return (
    <div className="setting-row">
      <div style={{ flex:1 }}>
        <div className="setting-label">{label}</div>
        {desc && <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.7rem', color:'var(--text-dim)' }}>{desc}</div>}
      </div>
      <input className="setting-input" type="number" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} />
      <span className="setting-unit">{unit}</span>
    </div>
  )
}

function Toggle({ label, desc, checked, onChange }) {
  return (
    <div className="toggle-row">
      <div style={{ flex:1 }}>
        <div className="toggle-label">{label}</div>
        {desc && <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.72rem', color:'var(--text-dim)', marginTop:2 }}>{desc}</div>}
      </div>
      <label className="toggle-switch">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span className="toggle-slider" />
      </label>
    </div>
  )
}

function ModuleRow({ mod, isActive, onActivate, onRename, onRemove }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(mod.name)
  return (
    <div className="player-manage-row" style={{ gap:8 }}>
      <div style={{ width:32, height:32, borderRadius:8, background:'rgba(255,215,0,.15)', border:'1px solid rgba(255,215,0,.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem', flexShrink:0 }}>⚽</div>
      {editing ? (
        <input className="pm-name-input" autoFocus value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={() => { onRename(mod.id, val||mod.name); setEditing(false) }}
          onKeyDown={e => { if(e.key==='Enter'){onRename(mod.id,val||mod.name);setEditing(false)} if(e.key==='Escape')setEditing(false) }}
        />
      ) : (
        <div className="pm-name-input" style={{ cursor:'pointer', display:'flex', alignItems:'center', gap:6, background:'transparent', border:'1px solid transparent', color:isActive?'var(--gold)':'var(--text)' }}
          onClick={() => setEditing(true)}
        >
          {mod.name} <span style={{ fontSize:'.7rem', opacity:.4 }}>✏️</span>
        </div>
      )}
      <button onClick={onActivate} style={{ background:isActive?'rgba(255,215,0,.2)':'rgba(255,255,255,.06)', border:`1px solid ${isActive?'rgba(255,215,0,.5)':'var(--border)'}`, borderRadius:6, padding:'5px 10px', color:isActive?'var(--gold)':'var(--text-dim)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.75rem', cursor:'pointer', flexShrink:0 }}>
        {isActive ? '✓ Actif' : 'Activer'}
      </button>
      <button className="pm-remove-btn" onClick={() => { if(window.confirm(`Supprimer "${mod.name}" ?`)) onRemove(mod.id) }}>🗑</button>
    </div>
  )
}

export default function Dashboard({
  modules, coaches, activeModId, onSetActiveMod,
  allPeople, totalGoals, settings,
  auth, onAuth,
  onAddPlayer, onRemovePlayer, onUpdatePerson, onAddGoal, onRemoveGoal,
  onResetScores, onResetPositions, onUpdateSettings,
  onAddModule, onRenameModule, onRemoveModule,
  currentTier, tierRate, fbStatus,
}) {
  const [pw, setPw] = useState('')
  const [pwErr, setPwErr] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  const handleLogin = () => {
    if (pw === PASSWORD) { onAuth(true); setPwErr(false) }
    else { setPwErr(true); setTimeout(() => setPwErr(false), 1000) }
  }

  if (!auth) {
    return (
      <div className="dashboard-auth">
        <div className="auth-card">
          <div className="auth-icon">🔐</div>
          <div className="auth-title">ACCÈS MANAGER</div>
          <div className="auth-sub">Réservé aux encadrants</div>
          <input className={`auth-input ${pwErr?'error':''}`} type="password" placeholder="Mot de passe"
            value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()} />
          {pwErr && <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.82rem', color:'var(--red)', marginBottom:8, letterSpacing:1 }}>✕ Mot de passe incorrect</div>}
          <button className="auth-btn" onClick={handleLogin}>ENTRER ⚡</button>
        </div>
      </div>
    )
  }

  const s = { ...DEFAULT_SETTINGS, ...settings }
  const totalEarnings = allPeople.reduce((sum,p) => sum+getPlayerEarnings(p,allPeople,totalGoals,s), 0)
  const htCount = allPeople.filter(p=>hasHatTrick(p)).length
  const topPlayer = [...allPeople].sort((a,b)=>b.goals-a.goals)[0]
  const activeMod = modules.find(m => m.id === activeModId) || modules[0]
  const modPlayers = activeMod?.players || []

  const handleExportPdf = () => {
    setPdfLoading(true)
    setTimeout(() => {
      exportPdf(modules, coaches)
      setPdfLoading(false)
    }, 100)
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, gap:8, flexWrap:'wrap' }}>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'1.6rem', letterSpacing:2 }}>🔧 TABLEAU DE BORD</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.75rem', color:'rgba(240,244,255,.5)', display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ color:fbStatus==='ok'?'#2ecc71':fbStatus==='offline'?'#e67e22':'#ffd700' }}>●</span>
            {fbStatus==='ok'?'Firebase connecté · live':fbStatus==='offline'?'Mode hors-ligne':'Connexion...'}
          </div>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button className="btn-primary" onClick={handleExportPdf} disabled={pdfLoading}
            style={{ background:'linear-gradient(135deg,#c0392b,#e74c3c)', color:'#fff', gap:6 }}>
            {pdfLoading ? '⏳ Génération...' : '📄 Exporter PDF'}
          </button>
          <button onClick={() => onAuth(false)} style={{ background:'rgba(255,255,255,.06)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', color:'rgba(240,244,255,.6)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.8rem', cursor:'pointer' }}>
            🔒 Quitter
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="dash-section">
        <div className="dash-section-title">Aperçu — {activeMod?.name}</div>
        <div className="dash-stats-grid">
          <div className="dash-stat-card"><div className="dsc-num">{totalGoals}</div><div className="dsc-label">Forfaits</div></div>
          <div className="dash-stat-card"><div className="dsc-num" style={{ color:'var(--teal)', fontSize:'1.5rem' }}>{totalEarnings.toFixed(2)}€</div><div className="dsc-label">Primes</div></div>
          <div className="dash-stat-card"><div className="dsc-num" style={{ color:tierRate===s.tier3Rate?'var(--gold)':tierRate===s.tier2Rate?'var(--teal)':'var(--tier1)' }}>{tierRate}€</div><div className="dsc-label">Taux actuel</div></div>
          <div className="dash-stat-card"><div className="dsc-num" style={{ color:'#ff6b35' }}>{htCount}</div><div className="dsc-label">Hat-Tricks 👑</div></div>
        </div>
        {topPlayer && topPlayer.goals > 0 && (
          <div style={{ marginTop:10, background:'rgba(255,107,53,.08)', border:'1px solid rgba(255,107,53,.2)', borderRadius:8, padding:'9px 12px', display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:'1.2rem' }}>⭐</span>
            <div style={{ flex:1, fontFamily:"'Barlow Condensed',sans-serif" }}>
              <div style={{ fontWeight:700, fontSize:'.88rem', color:'#ff6b35' }}>TOP BUTEUR — {topPlayer.name}</div>
              <div style={{ fontSize:'.78rem', color:'rgba(240,244,255,.6)' }}>
                {topPlayer.goals} forfait{topPlayer.goals>1?'s':''} · {s.phaseEnded ? `Prime: ${getPlayerEarnings(topPlayer,allPeople,totalGoals,s).toFixed(2)}€` : 'Prime 20€ activée en fin de phase'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modules management */}
      <div className="dash-section">
        <div className="dash-section-title">Gestion des Parties</div>
        {modules.map(m => (
          <ModuleRow key={m.id} mod={m} isActive={m.id===activeModId}
            onActivate={() => onSetActiveMod(m.id)} onRename={onRenameModule} onRemove={onRemoveModule} />
        ))}
        <div className="btn-row">
          <button className="btn-primary" onClick={onAddModule}>+ Ajouter une partie</button>
        </div>
      </div>

      {/* Settings */}
      <div className="dash-section">
        <div className="dash-section-title">Paramètres des primes — {activeMod?.name}</div>
        <SettingField label="Taux de base (Palier 1)" desc={`Prime par forfait jusqu'au seuil 1`} value={s.tier1Rate} onChange={v=>onUpdateSettings({tier1Rate:v})} unit="€/forfait" />
        <SettingField label="Taux Palier 2" value={s.tier2Rate} onChange={v=>onUpdateSettings({tier2Rate:v})} unit="€/forfait" />
        <SettingField label="Taux Palier 3" desc="Si individuel ≥ 3 après seuil 2" value={s.tier3Rate} onChange={v=>onUpdateSettings({tier3Rate:v})} unit="€/forfait" />
        <SettingField label="Prime Top Buteur" desc="Recalcul ALL ses forfaits (fin de phase)" value={s.topScorerRate} onChange={v=>onUpdateSettings({topScorerRate:v})} unit="€/forfait" />
        <div style={{ height:1, background:'rgba(255,255,255,.07)', margin:'8px 0' }} />
        <SettingField label="Seuil palier 1→2" value={s.tier1Threshold} onChange={v=>onUpdateSettings({tier1Threshold:v})} unit="forfaits" step={1} min={1} />
        <SettingField label="Seuil palier 2→3" value={s.tier2Threshold} onChange={v=>onUpdateSettings({tier2Threshold:v})} unit="forfaits" step={1} min={1} />
        <div style={{ height:1, background:'rgba(255,255,255,.07)', margin:'8px 0' }} />
        <Toggle label="🏁 Phase terminée → Active bonus Top Buteur"
          desc={s.phaseEnded ? '✅ Prime 20€ appliquée au meilleur buteur unique' : '⏳ Désactivé — déclencher en fin de phase'}
          checked={!!s.phaseEnded} onChange={v=>onUpdateSettings({phaseEnded:v})} />
      </div>

      {/* Players */}
      <div className="dash-section">
        <div className="dash-section-title">Joueurs — {activeMod?.name} <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:400, fontSize:'.72rem', color:'var(--text-dim)' }}>(avatar = choisir couleur)</span></div>
        {coaches.map(c => <PlayerRow key={c.id} player={c} onUpdate={onUpdatePerson} onAddGoal={onAddGoal} onRemoveGoal={onRemoveGoal} onRemove={()=>{}} allPeople={allPeople} totalGoals={totalGoals} settings={s} />)}
        {modPlayers.map(p => <PlayerRow key={p.id} player={p} onUpdate={onUpdatePerson} onAddGoal={onAddGoal} onRemoveGoal={onRemoveGoal} onRemove={onRemovePlayer} allPeople={allPeople} totalGoals={totalGoals} settings={s} />)}
        <div className="btn-row"><button className="btn-primary" onClick={onAddPlayer}>+ Ajouter un joueur</button></div>
      </div>

      {/* Danger zone */}
      <div className="dash-section" style={{ borderColor:'rgba(255,68,68,.2)' }}>
        <div className="dash-section-title" style={{ color:'rgba(255,68,68,.7)' }}>Zone danger — {activeMod?.name}</div>
        <div className="btn-row">
          <button className="btn-danger" onClick={() => { if(window.confirm('⚠️ Reset TOUS les scores de cette partie ?')) onResetScores() }}>🔄 Reset scores</button>
          <button className="btn-danger" onClick={() => { if(window.confirm('Reset les positions ?')) onResetPositions() }}>📍 Reset positions</button>
        </div>
      </div>

      {fbStatus==='offline' && (
        <div style={{ background:'rgba(255,165,0,.06)', border:'1px solid rgba(255,165,0,.25)', borderRadius:10, padding:14, marginBottom:24 }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:'.85rem', color:'#ff9500', letterSpacing:1, marginBottom:6 }}>🔥 Firebase non connecté</div>
          <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:'.78rem', color:'rgba(240,244,255,.6)', lineHeight:1.7 }}>
            Copiez <code style={{ background:'rgba(255,255,255,.08)', padding:'1px 4px', borderRadius:3 }}>.env.example</code> → <code style={{ background:'rgba(255,255,255,.08)', padding:'1px 4px', borderRadius:3 }}>.env</code> avec vos credentials Firebase.
          </div>
        </div>
      )}
    </div>
  )
}
