import { useState, useCallback } from 'react'
import { getPlayerEarnings, getPlayerTotalEarnings, isTopScorer, hasHatTrick, DEFAULT_SETTINGS } from '../utils/bonus'
import { exportPdf } from '../utils/exportPdf'

const PASSWORD = 'Raphael2232'
const COLORS = ['#e74c3c','#3498db','#2ecc71','#e67e22','#9b59b6','#1abc9c','#e91e8c','#ff9800','#00bcd4','#ffd700','#ff6b35','#c0392b']

function getInitials(n) { return n.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) }

// ── Input local (commit on blur/Enter — évite les re-render lourds) ──────────
function LocalInput({ value, onCommit, className, placeholder }) {
  const [v, setV] = useState(value)
  // Sync si le parent change (ex: Firebase)
  const prev = useState(value)[0]
  if (v === prev && value !== prev) setV(value)

  return (
    <input
      className={className}
      value={v}
      placeholder={placeholder}
      onChange={e => setV(e.target.value)}
      onBlur={() => { const t = v.trim(); if (t && t !== value) onCommit(t) }}
      onKeyDown={e => { if (e.key==='Enter') e.currentTarget.blur() }}
    />
  )
}

// ── Couleur picker ────────────────────────────────────────────────────────────
function ColorPicker({ current, onChange }) {
  return (
    <div style={{ display:'flex', gap:4, flexWrap:'wrap', padding:'6px 0 4px' }}>
      {COLORS.map(c => (
        <button key={c} onClick={() => onChange(c)} style={{
          width:22, height:22, borderRadius:'50%', background:c, cursor:'pointer', outline:'none',
          border: current===c ? '2.5px solid #fff' : '2px solid transparent',
          transform: current===c ? 'scale(1.25)' : 'scale(1)', transition:'transform .15s',
        }} />
      ))}
    </div>
  )
}

// ── Ligne joueur ──────────────────────────────────────────────────────────────
function PlayerRow({ player, onUpdate, onAddGoal, onRemoveGoal, onRemove, allPeople, totalGoals, settings, validatedCount = 0 }) {
  const [showColor, setShowColor] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const earnings = getPlayerTotalEarnings(player, allPeople, totalGoals, settings, validatedCount)
  const isTop = isTopScorer(player, allPeople, settings)

  const handleAdd  = useCallback(() => onAddGoal(player.id), [onAddGoal, player.id])
  const handleRem  = useCallback(() => onRemoveGoal(player.id), [onRemoveGoal, player.id])
  const handleName = useCallback((name) => onUpdate(player.id, { name }), [onUpdate, player.id])
  const handleColor= useCallback((color) => onUpdate(player.id, { color }), [onUpdate, player.id])

  return (
    <div style={{ borderBottom:'1px solid rgba(255,255,255,.07)' }}>
      <div className="player-manage-row">
        {/* Avatar + color toggle */}
        <div className="pm-avatar" style={{ background:player.color, cursor:'pointer', flexShrink:0 }}
          onClick={() => setShowColor(s => !s)}>
          {getInitials(player.name)}
        </div>

        {/* Name — local input */}
        <LocalInput
          className="pm-name-input"
          value={player.name}
          onCommit={handleName}
          placeholder="Nom du joueur"
        />

        {player.isCoach && <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.68rem', color:'var(--gold)', fontWeight:700, flexShrink:0 }}>{player.role}</span>}

        {/* Goals stepper */}
        <div className="pm-goals" style={{ flexShrink:0 }}>
          <button className="pm-goal-btn" type="button" onClick={handleRem}>−</button>
          <span className="pm-goal-num">{player.goals || 0}</span>
          <button className="pm-goal-btn" type="button" onClick={handleAdd}>+</button>
        </div>

        {/* Earnings */}
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'1.05rem', color:isTop?'#ff6b35':earnings>0?'var(--gold)':'rgba(240,244,255,.25)', minWidth:54, textAlign:'right', flexShrink:0 }}>
          {earnings.toFixed(2)}€
        </div>

        {/* Delete (confirmation inline — no window.confirm) */}
        {!player.isCoach && (
          confirmDel ? (
            <div style={{ display:'flex', gap:4, flexShrink:0 }}>
              <button type="button" onClick={() => { onRemove(player.id); setConfirmDel(false) }}
                style={{ background:'rgba(255,68,68,.3)', border:'1px solid rgba(255,68,68,.5)', borderRadius:6, padding:'4px 8px', color:'#fff', cursor:'pointer', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.75rem', fontWeight:700 }}>
                ✓ Oui
              </button>
              <button type="button" onClick={() => setConfirmDel(false)}
                style={{ background:'rgba(255,255,255,.06)', border:'1px solid var(--border)', borderRadius:6, padding:'4px 8px', color:'var(--text-dim)', cursor:'pointer', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.75rem' }}>
                ✕
              </button>
            </div>
          ) : (
            <button type="button" className="pm-remove-btn" onClick={() => setConfirmDel(true)}>🗑</button>
          )
        )}
      </div>

      {/* Color picker (expandable) */}
      {showColor && (
        <div style={{ padding:'0 0 8px 46px' }}>
          <ColorPicker current={player.color} onChange={handleColor} />
        </div>
      )}
    </div>
  )
}

// ── Setting field ─────────────────────────────────────────────────────────────
function SettingField({ label, desc, value, onChange, unit='€', step=0.01, min=0 }) {
  return (
    <div className="setting-row">
      <div style={{ flex:1 }}>
        <div className="setting-label">{label}</div>
        {desc && <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.7rem', color:'var(--text-dim)' }}>{desc}</div>}
      </div>
      <input className="setting-input" type="number" min={min} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))} />
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
        <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} />
        <span className="toggle-slider" />
      </label>
    </div>
  )
}

// ── Module row ────────────────────────────────────────────────────────────────
function ModuleRow({ mod, isActive, onActivate, onRename, onRemove }) {
  const [confirmDel, setConfirmDel] = useState(false)

  return (
    <div style={{ borderBottom:'1px solid rgba(255,255,255,.07)' }}>
      <div className="player-manage-row" style={{ gap:8 }}>
        <div style={{ width:32, height:32, borderRadius:8, background:'rgba(255,215,0,.12)', border:'1px solid rgba(255,215,0,.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem', flexShrink:0 }}>
          {mod.type==='pronostic'?'🎯':'⚽'}
        </div>
        <LocalInput
          className="pm-name-input"
          value={mod.name}
          onCommit={(name) => onRename(mod.id, name)}
          placeholder="Nom de la partie"
        />
        <button type="button" onClick={() => onActivate(mod.id)}
          style={{ background:isActive?'rgba(255,215,0,.18)':'rgba(255,255,255,.06)', border:`1px solid ${isActive?'rgba(255,215,0,.5)':'var(--border)'}`, borderRadius:6, padding:'5px 10px', color:isActive?'var(--gold)':'var(--text-dim)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.75rem', cursor:'pointer', flexShrink:0, fontWeight:isActive?700:400 }}>
          {isActive ? '✓ Actif' : 'Activer'}
        </button>
        {confirmDel ? (
          <div style={{ display:'flex', gap:4, flexShrink:0 }}>
            <button type="button" onClick={() => { onRemove(mod.id); setConfirmDel(false) }}
              style={{ background:'rgba(255,68,68,.3)', border:'1px solid rgba(255,68,68,.5)', borderRadius:6, padding:'4px 8px', color:'#fff', cursor:'pointer', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.75rem', fontWeight:700 }}>
              ✓ Oui
            </button>
            <button type="button" onClick={() => setConfirmDel(false)}
              style={{ background:'rgba(255,255,255,.06)', border:'1px solid var(--border)', borderRadius:6, padding:'4px 8px', color:'var(--text-dim)', cursor:'pointer', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.75rem' }}>
              ✕
            </button>
          </div>
        ) : (
          <button type="button" className="pm-remove-btn" onClick={() => setConfirmDel(true)}>🗑</button>
        )}
      </div>
    </div>
  )
}

// ── Dashboard principal ───────────────────────────────────────────────────────
export default function Dashboard({
  modules, coaches, activeModId, onSetActiveMod,
  allPeople, totalGoals, settings,
  auth, onAuth,
  onAddPlayer, onRemovePlayer, onUpdatePerson,
  onAddGoal, onRemoveGoal,
  onResetScores, onResetPositions, onUpdateSettings,
  onAddModule, onAddPronoModule, onRenameModule, onRemoveModule,
  currentTier, tierRate, fbStatus,
  validatedById = {},
}) {
  const [pw, setPw]           = useState('')
  const [pwErr, setPwErr]     = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  const handleLogin = () => {
    if (pw === PASSWORD) { onAuth(true); setPwErr(false) }
    else { setPwErr(true); setTimeout(() => setPwErr(false), 1200) }
  }

  if (!auth) {
    return (
      <div className="dashboard-auth">
        <div className="auth-card">
          <div className="auth-icon">🔐</div>
          <div className="auth-title">ACCÈS MANAGER</div>
          <div className="auth-sub">Réservé aux encadrants</div>
          <input className={`auth-input ${pwErr?'error':''}`} type="password" placeholder="Mot de passe"
            value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()} autoComplete="current-password" />
          {pwErr && <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.82rem', color:'var(--red)', marginBottom:8, letterSpacing:1 }}>✕ Mot de passe incorrect</div>}
          <button type="button" className="auth-btn" onClick={handleLogin}>ENTRER ⚡</button>
        </div>
      </div>
    )
  }

  const s = { ...DEFAULT_SETTINGS, ...settings }
  const isCanonActive = activeModId === (modules.find(m => (m.type||'forfaits')==='forfaits')||modules[0])?.id
  const vpFor = (id) => isCanonActive ? (validatedById[id]||0) : 0
  const totalEarnings = allPeople.reduce((sum,p) => sum+getPlayerTotalEarnings(p,allPeople,totalGoals,s,vpFor(p.id)), 0)
  const htCount = allPeople.filter(p=>hasHatTrick(p)).length
  const topPlayer = [...allPeople].sort((a,b)=>(b.goals||0)-(a.goals||0))[0]
  const activeMod = modules.find(m => m.id === activeModId) || modules[0]
  const modPlayers = activeMod?.players || []
  const isPronoMod = activeMod?.type === 'pronostic'

  return (
    <div className="dashboard">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, gap:8, flexWrap:'wrap' }}>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'1.6rem', letterSpacing:2 }}>🔧 TABLEAU DE BORD</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.75rem', color:'rgba(240,244,255,.5)', display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ color:fbStatus==='ok'?'#2ecc71':fbStatus==='offline'?'#e67e22':'#ffd700' }}>●</span>
            {fbStatus==='ok'?'Firebase · sync live':fbStatus==='offline'?'Mode local (localStorage)':'Connexion Firebase...'}
          </div>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button type="button" className="btn-primary"
            style={{ background:'linear-gradient(135deg,#8b0000,#c0392b)', color:'#fff' }}
            onClick={() => { setPdfLoading(true); setTimeout(() => { exportPdf(modules, coaches); setPdfLoading(false) }, 50) }}
            disabled={pdfLoading}>
            {pdfLoading ? '⏳' : '📄'} Export PDF
          </button>
          <button type="button" onClick={() => onAuth(false)}
            style={{ background:'rgba(255,255,255,.06)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', color:'rgba(240,244,255,.6)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.8rem', cursor:'pointer' }}>
            🔒 Quitter
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="dash-section">
        <div className="dash-section-title">Aperçu — {activeMod?.name}</div>
        <div className="dash-stats-grid">
          <div className="dash-stat-card"><div className="dsc-num">{totalGoals}</div><div className="dsc-label">Forfaits</div></div>
          <div className="dash-stat-card"><div className="dsc-num" style={{ color:'var(--teal)', fontSize:'1.4rem' }}>{totalEarnings.toFixed(2)}€</div><div className="dsc-label">Primes</div></div>
          <div className="dash-stat-card"><div className="dsc-num" style={{ color:tierRate===s.tier3Rate?'var(--gold)':tierRate===s.tier2Rate?'var(--teal)':'var(--tier1)' }}>{tierRate}€</div><div className="dsc-label">Taux actuel</div></div>
          <div className="dash-stat-card"><div className="dsc-num" style={{ color:'#ff6b35' }}>{htCount}</div><div className="dsc-label">Hat-Tricks 👑</div></div>
        </div>
        {topPlayer && (topPlayer.goals||0) > 0 && (
          <div style={{ marginTop:10, background:'rgba(255,107,53,.08)', border:'1px solid rgba(255,107,53,.2)', borderRadius:8, padding:'9px 12px', display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:'1.2rem' }}>⭐</span>
            <div style={{ flex:1, fontFamily:"'Barlow Condensed',sans-serif" }}>
              <div style={{ fontWeight:700, fontSize:'.9rem', color:'#ff6b35' }}>TOP BUTEUR — {topPlayer.name}</div>
              <div style={{ fontSize:'.78rem', color:'rgba(240,244,255,.6)' }}>{topPlayer.goals} forfait{topPlayer.goals>1?'s':''} · {s.phaseEnded?`Prime ${getPlayerEarnings(topPlayer,allPeople,totalGoals,s).toFixed(2)}€`:'Prime 20€ déclenchée en fin de phase'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Module management */}
      <div className="dash-section">
        <div className="dash-section-title">Gestion des Parties</div>
        {modules.map(m => (
          <ModuleRow key={m.id} mod={m} isActive={m.id===activeModId}
            onActivate={onSetActiveMod} onRename={onRenameModule} onRemove={onRemoveModule} />
        ))}
        <div className="btn-row">
          <button type="button" className="btn-primary" onClick={onAddModule}>+ Partie</button>
          <button type="button" className="btn-primary" style={{ background:'linear-gradient(135deg,#7a4a00,#ff9800)', color:'#fff' }} onClick={onAddPronoModule}>+ Pronostic</button>
        </div>
      </div>

      {/* Settings */}
      {!isPronoMod && (
        <div className="dash-section">
          <div className="dash-section-title">Paramètres des primes — {activeMod?.name}</div>
          <SettingField label="Taux Palier 1 (base)" desc="Prime par forfait jusqu'au seuil" value={s.tier1Rate} onChange={v=>onUpdateSettings({tier1Rate:v})} unit="€/forfait" />
          <SettingField label="Taux Palier 2" value={s.tier2Rate} onChange={v=>onUpdateSettings({tier2Rate:v})} unit="€/forfait" />
          <SettingField label="Taux Palier 3" desc="Si individuel ≥ 3 après seuil 2" value={s.tier3Rate} onChange={v=>onUpdateSettings({tier3Rate:v})} unit="€/forfait" />
          <SettingField label="Prime Top Buteur" value={s.topScorerRate} onChange={v=>onUpdateSettings({topScorerRate:v})} unit="€/forfait" />
          <div style={{ height:1, background:'rgba(255,255,255,.07)', margin:'8px 0' }} />
          <SettingField label="Seuil palier 1→2" value={s.tier1Threshold} onChange={v=>onUpdateSettings({tier1Threshold:v})} unit="forfaits" step={1} min={1} />
          <SettingField label="Seuil palier 2→3" value={s.tier2Threshold} onChange={v=>onUpdateSettings({tier2Threshold:v})} unit="forfaits" step={1} min={1} />
          <div style={{ height:1, background:'rgba(255,255,255,.07)', margin:'8px 0' }} />
          <Toggle label="🏁 Phase terminée → Active bonus Top Buteur"
            desc={s.phaseEnded?'✅ Prime 20€ appliquée au meilleur buteur unique':'⏳ Désactivé — à déclencher en fin de phase'}
            checked={!!s.phaseEnded} onChange={v=>onUpdateSettings({phaseEnded:v})} />
        </div>
      )}

      {/* Players */}
      <div className="dash-section">
        <div className="dash-section-title">
          Joueurs
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:400, fontSize:'.7rem', color:'var(--text-dim)', marginLeft:6 }}>(partagés sur tout le site · avatar = couleur)</span>
        </div>
        {coaches.map(c => (
          <PlayerRow key={c.id} player={c} onUpdate={onUpdatePerson} onAddGoal={onAddGoal} onRemoveGoal={onRemoveGoal} onRemove={()=>{}} allPeople={allPeople} totalGoals={totalGoals} settings={s} validatedCount={vpFor(c.id)} />
        ))}
        {modPlayers.map(p => (
          <PlayerRow key={p.id} player={p} onUpdate={onUpdatePerson} onAddGoal={onAddGoal} onRemoveGoal={onRemoveGoal} onRemove={onRemovePlayer} allPeople={allPeople} totalGoals={totalGoals} settings={s} validatedCount={vpFor(p.id)} />
        ))}
        <div className="btn-row">
          <button type="button" className="btn-primary" onClick={onAddPlayer}>+ Ajouter un joueur</button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="dash-section" style={{ borderColor:'rgba(255,68,68,.2)' }}>
        <div className="dash-section-title" style={{ color:'rgba(255,68,68,.7)' }}>Zone danger — {activeMod?.name}</div>
        <div className="btn-row">
          <button type="button" className="btn-danger" onClick={onResetScores}>🔄 Reset scores</button>
          <button type="button" className="btn-danger" onClick={onResetPositions}>📍 Reset positions</button>
        </div>
      </div>

      {fbStatus === 'offline' && (
        <div style={{ background:'rgba(255,165,0,.06)', border:'1px solid rgba(255,165,0,.25)', borderRadius:10, padding:14, marginBottom:24 }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:'.85rem', color:'#ff9500', marginBottom:6 }}>🔥 Firebase non connecté — données locales uniquement</div>
          <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:'.78rem', color:'rgba(240,244,255,.6)', lineHeight:1.7 }}>
            Ajoutez les variables d'environnement dans Vercel :<br />
            Project Settings → Environment Variables → ajouter VITE_FIREBASE_*<br />
            Puis redéployer depuis le dashboard Vercel.
          </div>
        </div>
      )}
    </div>
  )
}
