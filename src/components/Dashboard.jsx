import { useState } from 'react'
import { getPlayerEarnings, isTopScorer, hasHatTrick, DEFAULT_SETTINGS } from '../utils/bonus'

const PASSWORD = 'Raphael2232'

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function ColorPicker({ current, onChange }) {
  const colors = ['#e74c3c','#3498db','#2ecc71','#e67e22','#9b59b6','#1abc9c','#e91e8c','#ff9800','#00bcd4','#ffd700','#ff6b35','#c0392b']
  return (
    <div style={{ display:'flex', gap:4, flexWrap:'wrap', padding:'6px 0 4px' }}>
      {colors.map(c => (
        <button key={c} onClick={() => onChange(c)} style={{
          width:22, height:22, borderRadius:'50%', background:c,
          border: current === c ? '2.5px solid #fff' : '2px solid transparent',
          cursor:'pointer', transition:'transform .15s',
          transform: current === c ? 'scale(1.25)' : 'scale(1)', outline:'none',
        }} />
      ))}
    </div>
  )
}

function PlayerRow({ player, onUpdate, onRemoveGoal, onAddGoal, onRemove, allPeople, totalGoals, settings }) {
  const [expanded, setExpanded] = useState(false)
  const earnings = getPlayerEarnings(player, allPeople, totalGoals, settings)
  const isTop = isTopScorer(player, allPeople, settings)

  return (
    <div style={{ borderBottom:'1px solid rgba(255,255,255,.07)' }}>
      <div className="player-manage-row">
        <div className="pm-avatar" style={{ background: player.color, cursor:'pointer' }} onClick={() => setExpanded(!expanded)}>
          {getInitials(player.name)}
        </div>
        <input className="pm-name-input" value={player.name} onChange={e => onUpdate(player.id, { name: e.target.value })} placeholder="Nom" />
        {player.isCoach && (
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.68rem', color:'var(--gold)', fontWeight:700, flexShrink:0 }}>
            {player.role}
          </span>
        )}
        <div className="pm-goals">
          <button className="pm-goal-btn" onClick={() => onRemoveGoal(player.id)}>−</button>
          <span className="pm-goal-num">{player.goals}</span>
          <button className="pm-goal-btn" onClick={() => onAddGoal(player.id)}>+</button>
        </div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'1.05rem', color: isTop ? '#ff6b35' : earnings > 0 ? 'var(--gold)' : 'rgba(240,244,255,.3)', minWidth:46, textAlign:'right', flexShrink:0 }}>
          {earnings}€
        </div>
        {!player.isCoach && (
          <button className="pm-remove-btn" onClick={() => { if (window.confirm(`Supprimer ${player.name} ?`)) onRemove(player.id) }}>🗑</button>
        )}
      </div>
      {expanded && (
        <div style={{ padding:'0 0 8px 48px' }}>
          <ColorPicker current={player.color} onChange={color => onUpdate(player.id, { color })} />
        </div>
      )}
    </div>
  )
}

function SettingField({ label, desc, value, onChange, unit = '€', min = 0, max = 100, step = 0.01 }) {
  return (
    <div className="setting-row">
      <div>
        <div className="setting-label">{label}</div>
        {desc && <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.7rem', color:'var(--text-dim)' }}>{desc}</div>}
      </div>
      <input
        className="setting-input"
        type="number"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
      />
      <span className="setting-unit">{unit}</span>
    </div>
  )
}

function Toggle({ label, desc, checked, onChange }) {
  return (
    <div className="toggle-row">
      <div>
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

export default function Dashboard({
  players, coaches, allPeople, totalGoals,
  settings, onUpdateSettings,
  auth, onAuth,
  onAddPlayer, onRemovePlayer,
  onUpdatePerson, onAddGoal, onRemoveGoal,
  onResetScores, onResetPositions,
  currentTier, tierRate, fbStatus,
}) {
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState(false)

  const handleLogin = () => {
    if (pwInput === PASSWORD) { onAuth(true); setPwError(false) }
    else { setPwError(true); setTimeout(() => setPwError(false), 1000) }
  }

  if (!auth) {
    return (
      <div className="dashboard-auth">
        <div className="auth-card">
          <div className="auth-icon">🔐</div>
          <div className="auth-title">ACCÈS MANAGER</div>
          <div className="auth-sub">Réservé aux encadrants</div>
          <input
            className={`auth-input ${pwError ? 'error' : ''}`}
            type="password" placeholder="Mot de passe"
            value={pwInput}
            onChange={e => setPwInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          {pwError && <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.82rem', color:'var(--red)', marginBottom:8, letterSpacing:1 }}>✕ Mot de passe incorrect</div>}
          <button className="auth-btn" onClick={handleLogin}>ENTRER ⚡</button>
        </div>
      </div>
    )
  }

  const totalEarnings = allPeople.reduce((s, p) => s + getPlayerEarnings(p, allPeople, totalGoals, settings), 0)
  const playersWithHatTrick = allPeople.filter(p => hasHatTrick(p)).length
  const topPlayer = [...allPeople].sort((a, b) => b.goals - a.goals)[0]
  const s = { ...DEFAULT_SETTINGS, ...settings }

  return (
    <div className="dashboard">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'1.6rem', letterSpacing:2, color:'var(--text)' }}>🔧 TABLEAU DE BORD</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.78rem', color:'rgba(240,244,255,.5)', letterSpacing:1, textTransform:'uppercase', display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ color: fbStatus === 'ok' ? '#2ecc71' : fbStatus === 'offline' ? '#e67e22' : '#ffd700' }}>●</span>
            {fbStatus === 'ok' ? 'Firebase connecté · synchronisation live' : fbStatus === 'offline' ? 'Mode hors-ligne · localStorage' : 'Connexion en cours...'}
          </div>
        </div>
        <button onClick={() => onAuth(false)} style={{ background:'rgba(255,255,255,.06)', border:'1px solid var(--border)', borderRadius:8, padding:'7px 14px', color:'rgba(240,244,255,.6)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.8rem', cursor:'pointer', letterSpacing:1 }}>
          🔒 Quitter
        </button>
      </div>

      {/* Stats overview */}
      <div className="dash-section">
        <div className="dash-section-title">Aperçu en temps réel</div>
        <div className="dash-stats-grid">
          <div className="dash-stat-card">
            <div className="dsc-num">{totalGoals}</div>
            <div className="dsc-label">Total forfaits</div>
          </div>
          <div className="dash-stat-card">
            <div className="dsc-num" style={{ color:'var(--teal)' }}>{totalEarnings.toFixed(2)}€</div>
            <div className="dsc-label">Primes totales</div>
          </div>
          <div className="dash-stat-card">
            <div className="dsc-num" style={{ color: tierRate === s.tier3Rate ? 'var(--gold)' : tierRate === s.tier2Rate ? 'var(--teal)' : 'var(--tier1)' }}>
              {tierRate}€
            </div>
            <div className="dsc-label">Taux actuel</div>
          </div>
          <div className="dash-stat-card">
            <div className="dsc-num" style={{ color:'#ff6b35' }}>{playersWithHatTrick}</div>
            <div className="dsc-label">Hat-Tricks 👑</div>
          </div>
        </div>
        {topPlayer && topPlayer.goals > 0 && (
          <div style={{ marginTop:10, background:'rgba(255,107,53,.08)', border:'1px solid rgba(255,107,53,.2)', borderRadius:8, padding:'10px 12px', display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:'1.3rem' }}>⭐</span>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:'.88rem', color:'#ff6b35' }}>TOP BUTEUR ACTUEL</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'.82rem', color:'rgba(240,244,255,.7)' }}>
                {topPlayer.name} · {topPlayer.goals} forfait{topPlayer.goals > 1 ? 's' : ''}
                {s.phaseEnded ? ` · PRIME : ${getPlayerEarnings(topPlayer, allPeople, totalGoals, settings)}€` : ' · (prime top buteur active en fin de phase)'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── SETTINGS ─────────────────────────────────────────────────────────── */}
      <div className="dash-section">
        <div className="dash-section-title">Paramètres des primes</div>

        <SettingField
          label="Taux de base (Palier 1)"
          desc="Prime par forfait jusqu'au seuil 1"
          value={s.tier1Rate}
          onChange={v => onUpdateSettings({ tier1Rate: v })}
          unit="€/forfait"
        />
        <SettingField
          label="Taux Palier 2"
          desc="Prime par forfait après seuil 1"
          value={s.tier2Rate}
          onChange={v => onUpdateSettings({ tier2Rate: v })}
          unit="€/forfait"
        />
        <SettingField
          label="Taux Palier 3"
          desc="Prime si individuel ≥ 3 après seuil 2"
          value={s.tier3Rate}
          onChange={v => onUpdateSettings({ tier3Rate: v })}
          unit="€/forfait"
        />
        <SettingField
          label="Prime Top Buteur"
          desc="Recalcul ALL ses forfaits en fin de phase"
          value={s.topScorerRate}
          onChange={v => onUpdateSettings({ topScorerRate: v })}
          unit="€/forfait"
        />

        <div style={{ marginTop:10, height:1, background:'rgba(255,255,255,.07)' }} />

        <SettingField
          label="Seuil palier 1 → 2"
          desc="Nombre de forfaits cumulés pour déclencher le taux palier 2"
          value={s.tier1Threshold}
          onChange={v => onUpdateSettings({ tier1Threshold: v })}
          unit="forfaits"
          step={1} min={1} max={999}
        />
        <SettingField
          label="Seuil palier 2 → 3"
          desc="Nombre de forfaits cumulés pour déclencher le taux palier 3"
          value={s.tier2Threshold}
          onChange={v => onUpdateSettings({ tier2Threshold: v })}
          unit="forfaits"
          step={1} min={1} max={999}
        />

        <div style={{ marginTop:10, height:1, background:'rgba(255,255,255,.07)' }} />

        <Toggle
          label="🏁 Phase de préparation terminée"
          desc={s.phaseEnded
            ? "✅ Bonus top buteur ACTIF — prime à 20€ appliquée au meilleur buteur"
            : "⏳ Bonus top buteur inactif — sera déclenché en fin de phase"}
          checked={!!s.phaseEnded}
          onChange={v => onUpdateSettings({ phaseEnded: v })}
        />
      </div>

      {/* ─── PLAYERS ──────────────────────────────────────────────────────────── */}
      <div className="dash-section">
        <div className="dash-section-title">Gestion des joueurs <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:400, fontSize:'.75rem', color:'var(--text-dim)' }}>(cliquer avatar = choisir couleur)</span></div>
        {coaches.map(c => (
          <PlayerRow key={c.id} player={c} onUpdate={onUpdatePerson} onAddGoal={onAddGoal} onRemoveGoal={onRemoveGoal} onRemove={() => {}} allPeople={allPeople} totalGoals={totalGoals} settings={settings} />
        ))}
        {players.map(p => (
          <PlayerRow key={p.id} player={p} onUpdate={onUpdatePerson} onAddGoal={onAddGoal} onRemoveGoal={onRemoveGoal} onRemove={onRemovePlayer} allPeople={allPeople} totalGoals={totalGoals} settings={settings} />
        ))}
        <div className="btn-row">
          <button className="btn-primary" onClick={onAddPlayer}>+ Ajouter un joueur</button>
        </div>
      </div>

      {/* ─── DANGER ZONE ──────────────────────────────────────────────────────── */}
      <div className="dash-section" style={{ borderColor:'rgba(255,68,68,.2)' }}>
        <div className="dash-section-title" style={{ color:'rgba(255,68,68,.7)' }}>Zone danger</div>
        <div className="btn-row">
          <button className="btn-danger" onClick={() => { if (window.confirm('⚠️ Réinitialiser TOUS les scores ? Irréversible !')) onResetScores() }}>🔄 Reset scores</button>
          <button className="btn-danger" onClick={() => { if (window.confirm('Réinitialiser les positions ?')) onResetPositions() }}>📍 Reset positions</button>
        </div>
      </div>

      {/* ─── FIREBASE SETUP GUIDE ─────────────────────────────────────────────── */}
      {fbStatus === 'offline' && (
        <div style={{ background:'rgba(255,165,0,.06)', border:'1px solid rgba(255,165,0,.25)', borderRadius:10, padding:14, marginBottom:24 }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:'.85rem', color:'#ff9500', letterSpacing:1, marginBottom:8 }}>
            🔥 Configurer Firebase (persistance cloud)
          </div>
          <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:'.78rem', color:'rgba(240,244,255,.6)', lineHeight:1.7 }}>
            1. Copiez <code style={{ background:'rgba(255,255,255,.08)', padding:'1px 4px', borderRadius:3 }}>.env.example</code> → <code style={{ background:'rgba(255,255,255,.08)', padding:'1px 4px', borderRadius:3 }}>.env</code><br/>
            2. Remplissez vos credentials Firebase (Console → Project Settings → Config)<br/>
            3. Dans Firestore : créez une collection <code style={{ background:'rgba(255,255,255,.08)', padding:'1px 4px', borderRadius:3 }}>challenge</code><br/>
            4. Règles Firestore : <code style={{ background:'rgba(255,255,255,.08)', padding:'1px 4px', borderRadius:3 }}>allow read, write: if true;</code><br/>
            5. Rebuild et redéployez
          </div>
        </div>
      )}
    </div>
  )
}
