import { useState } from 'react'

function getInitials(name) { return (name||'?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) }

export default function Login({ players, coaches, onPick, onManager }) {
  const [mgr, setMgr] = useState(false)
  const [pw, setPw] = useState('')
  const [err, setErr] = useState(false)
  const people = [...(players || []), ...(coaches || [])]

  const tryManager = () => { if (onManager(pw)) { setPw(''); setErr(false) } else setErr(true) }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">⚽</div>
        <h1 className="login-title">CARE CHALLENGES</h1>
        {!mgr ? (
          <>
            <p className="login-sub">Connecte-toi pour modifier <strong>tes</strong> points</p>
            <div className="login-grid">
              {people.map(p => (
                <button key={p.id} className="login-player" onClick={() => onPick(p)}>
                  <span className="login-avatar" style={{ background: p.color || '#888' }}>{getInitials(p.name)}</span>
                  <span className="login-name">{p.name}</span>
                  {p.isCoach && <span className="login-role">{p.role}</span>}
                </button>
              ))}
            </div>
            <button className="login-manager-link" onClick={() => { setMgr(true); setErr(false) }}>🔧 Espace Manager</button>
          </>
        ) : (
          <div className="login-manager">
            <p className="login-sub">Accès Manager (gestion complète)</p>
            <input className={`login-pw ${err ? 'error' : ''}`} type="password" placeholder="Mot de passe manager"
              value={pw} autoFocus
              onChange={e => { setPw(e.target.value); setErr(false) }}
              onKeyDown={e => e.key === 'Enter' && tryManager()} />
            {err && <div className="login-err">Mot de passe incorrect</div>}
            <div className="login-mgr-actions">
              <button className="login-back" onClick={() => { setMgr(false); setPw(''); setErr(false) }}>← Retour</button>
              <button className="login-go" onClick={tryManager}>Entrer →</button>
            </div>
          </div>
        )}
        <div className="login-foot">🔒 Chacun ne modifie que ses propres points · le Manager gère tout</div>
      </div>
    </div>
  )
}
