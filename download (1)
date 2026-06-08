import { getPlayerEarnings, isTopScorer, hasHatTrick, DEFAULT_SETTINGS } from './bonus'

function fmt(n) { return Number(n).toFixed(2) + '€' }
function fmtDate() {
  return new Date().toLocaleDateString('fr-FR', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
}
function ordinal(n) {
  if (n === 1) return '1ère Partie'
  return `${n}ème Partie`
}

export function exportPdf(modules, coaches) {
  const allModulesData = modules.map(mod => {
    const allPeople = [...mod.players, ...coaches]
    const totalGoals = allPeople.reduce((s, p) => s + p.goals, 0)
    const s = { ...DEFAULT_SETTINGS, ...mod.settings }
    const sorted = [...allPeople].sort((a, b) => b.goals - a.goals)
    return { mod, allPeople, totalGoals, s, sorted }
  })

  const globalPlayers = {}
  modules.forEach(mod => {
    const allPeople = [...mod.players, ...coaches]
    allPeople.forEach(p => {
      const key = p.name
      if (!globalPlayers[key]) globalPlayers[key] = { name: p.name, color: p.color, isCoach: p.isCoach, role: p.role, totalGoals: 0, totalEarnings: 0 }
      globalPlayers[key].totalGoals += p.goals
    })
  })

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Care Challenges — Rapport ${new Date().toLocaleDateString('fr-FR')}</title>
  <style>
    @page { margin: 1.5cm; size: A4; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: white; font-size: 13px; }
    
    .page-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid #0a1628; }
    .page-header h1 { font-size: 28px; color: #0a1628; letter-spacing: 2px; font-family: Arial Black, sans-serif; }
    .page-header .subtitle { font-size: 13px; color: #666; margin-top: 2px; }
    .page-header .date-badge { margin-left: auto; background: #0a1628; color: #ffd700; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 700; white-space: nowrap; }

    .module-section { margin-bottom: 28px; page-break-inside: avoid; }
    .module-title { display: flex; align-items: center; gap: 10px; background: linear-gradient(135deg, #0a1628, #0f2a50); color: white; padding: 10px 16px; border-radius: 8px 8px 0 0; }
    .module-title h2 { font-size: 18px; letter-spacing: 1px; }
    .module-meta { font-size: 11px; opacity: 0.7; margin-top: 2px; }

    .tier-bar { display: flex; gap: 2px; background: #eee; border-radius: 0; overflow: hidden; height: 28px; }
    .tier-seg { display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: white; position: relative; overflow: hidden; }
    .tier-seg.t1 { background: #2563eb; }
    .tier-seg.t2 { background: #0891b2; }
    .tier-seg.t3 { background: #d97706; }
    .tier-fill-text { font-size: 10px; opacity: 0.9; }

    table { width: 100%; border-collapse: collapse; background: white; }
    th { background: #1e3a5c; color: white; padding: 9px 12px; text-align: left; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
    td { padding: 8px 12px; border-bottom: 1px solid #e8edf2; font-size: 13px; vertical-align: middle; }
    tr:nth-child(even) td { background: #f7faff; }
    tr:hover td { background: #eef4ff; }
    
    .rank-cell { font-weight: 800; font-size: 15px; width: 40px; text-align: center; }
    .rank-1 { color: #c8a800; }
    .rank-2 { color: #7d7d7d; }
    .rank-3 { color: #8b5a2b; }
    
    .player-name { font-weight: 700; font-size: 14px; }
    .player-badge { display: inline-block; font-size: 10px; padding: 1px 6px; border-radius: 3px; margin-left: 6px; vertical-align: middle; }
    .badge-coach { background: rgba(255,215,0,0.2); color: #8b7200; border: 1px solid rgba(255,215,0,0.4); }
    .badge-hatrick { background: rgba(255,215,0,0.15); color: #8b7200; border: 1px solid rgba(255,215,0,0.3); }
    .badge-top { background: rgba(255,107,53,0.15); color: #c43900; border: 1px solid rgba(255,107,53,0.3); font-weight: 700; }
    
    .goals-cell { font-size: 18px; font-weight: 800; text-align: center; width: 70px; }
    .balls-cell { letter-spacing: 2px; font-size: 14px; width: 120px; }
    .ball-filled { color: #f5a623; }
    .ball-empty { color: #ccc; }
    
    .earn-cell { font-weight: 700; font-size: 16px; text-align: right; width: 100px; color: #0a7a0a; }
    .earn-top { color: #c43900; }
    
    .total-row td { background: #0a1628 !important; color: white; font-weight: 800; font-size: 14px; }
    .total-row .earn-cell { color: #ffd700 !important; }
    
    .global-section { margin-top: 24px; page-break-before: always; }
    .global-title { background: linear-gradient(135deg, #1a1a2e, #2d3561); color: white; padding: 12px 16px; border-radius: 8px 8px 0 0; }
    .global-title h2 { font-size: 20px; letter-spacing: 2px; }

    .summary-box { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
    .summary-card { background: #f0f4ff; border: 1px solid #d0dbee; border-radius: 8px; padding: 12px; text-align: center; }
    .summary-num { font-size: 28px; font-weight: 800; color: #0a1628; line-height: 1; }
    .summary-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-top: 3px; }
    .summary-card.gold .summary-num { color: #c8a800; }
    .summary-card.green .summary-num { color: #0a7a0a; }
    .summary-card.orange .summary-num { color: #c43900; }

    .rules-reminder { background: #f0f7ff; border: 1px solid #b8d4f0; border-radius: 8px; padding: 14px 16px; margin-top: 16px; }
    .rules-reminder h3 { color: #1e3a5c; font-size: 14px; margin-bottom: 8px; }
    .rules-reminder ul { padding-left: 18px; }
    .rules-reminder li { margin-bottom: 4px; font-size: 12px; color: #444; }
    .rules-reminder .highlight { color: #c43900; font-weight: 700; }

    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #ddd; text-align: center; font-size: 11px; color: #999; }
    
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>

<div class="page-header">
  <div>
    <div style="font-size:32px; margin-bottom:2px">🏆</div>
  </div>
  <div>
    <h1>CARE CHALLENGES</h1>
    <div class="subtitle">World Cup 2026 — Rapport de Points</div>
  </div>
  <div class="date-badge">📅 ${fmtDate()}</div>
</div>

${allModulesData.map(({ mod, allPeople, totalGoals, s, sorted }, idx) => {
  const totalEarnings = allPeople.reduce((sum, p) => sum + getPlayerEarnings(p, allPeople, totalGoals, s), 0)
  const t1 = s.tier1Threshold || 40
  const t2 = s.tier2Threshold || 50
  const w1 = Math.min(t1, totalGoals)
  const w2 = Math.max(0, Math.min(t2 - t1, totalGoals - t1))
  const w3 = Math.max(0, totalGoals - t2)

  return `
<div class="module-section">
  <div class="module-title">
    <div>
      <h2>⚽ ${mod.name}</h2>
      <div class="module-meta">${allPeople.filter(p => !p.isCoach).length} joueurs + ${coaches.length} entraîneurs · ${totalGoals} forfaits cumulés</div>
    </div>
    <div style="margin-left:auto; text-align:right">
      <div style="font-size:20px; font-weight:800; color:#ffd700">${s.tier1Threshold && totalGoals > s.tier2Threshold ? s.tier3Rate : totalGoals > s.tier1Threshold ? s.tier2Rate : s.tier1Rate}€/forfait</div>
      <div style="font-size:11px; opacity:0.7">taux actuel</div>
    </div>
  </div>
  
  <div class="tier-bar">
    <div class="tier-seg t1" style="width:${(t1/(t2+20))*100}%">
      <span class="tier-fill-text">${w1}/${t1} · ${s.tier1Rate}€</span>
    </div>
    <div class="tier-seg t2" style="width:${((t2-t1)/(t2+20))*100}%">
      <span class="tier-fill-text">${w2}/${t2-t1} · ${s.tier2Rate}€</span>
    </div>
    <div class="tier-seg t3" style="flex:1">
      <span class="tier-fill-text">${w3} · ${s.tier3Rate}€</span>
    </div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Rang</th>
        <th>Joueur</th>
        <th style="text-align:center">Forfaits</th>
        <th>Progression</th>
        <th style="text-align:right">Prime estimée</th>
      </tr>
    </thead>
    <tbody>
      ${sorted.map((player, i) => {
        const earnings = getPlayerEarnings(player, allPeople, totalGoals, s)
        const isTop = isTopScorer(player, allPeople, s)
        const ht = hasHatTrick(player)
        const rank = i + 1
        const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : ''
        const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank
        const balls = Array.from({ length: Math.max(3, player.goals) }, (_, j) => 
          j < player.goals ? '<span class="ball-filled">⚽</span>' : '<span class="ball-empty">⚽</span>'
        ).join('')
        return `
        <tr>
          <td class="rank-cell ${rankClass}">${rankEmoji}</td>
          <td class="player-name">
            ${player.name}
            ${player.isCoach ? `<span class="player-badge badge-coach">${player.role}</span>` : ''}
            ${isTop ? '<span class="player-badge badge-top">⭐ TOP BUTEUR</span>' : ''}
            ${ht && !isTop ? '<span class="player-badge badge-hatrick">👑 Hat-Trick</span>' : ''}
          </td>
          <td class="goals-cell">${player.goals}</td>
          <td class="balls-cell">${balls}</td>
          <td class="earn-cell ${isTop ? 'earn-top' : ''}">${fmt(earnings)}</td>
        </tr>`
      }).join('')}
      <tr class="total-row">
        <td colspan="2"><strong>TOTAL ÉQUIPE</strong></td>
        <td class="goals-cell">${totalGoals}</td>
        <td></td>
        <td class="earn-cell">${fmt(totalEarnings)}</td>
      </tr>
    </tbody>
  </table>
</div>`
}).join('')}

<div class="global-section">
  <div class="global-title">
    <h2>📊 SYNTHÈSE GLOBALE — TOUTES PARTIES</h2>
  </div>
  
  <div class="summary-box">
    <div class="summary-card">
      <div class="summary-num">${modules.reduce((s, m) => s + [...m.players, ...coaches].reduce((a, p) => a + p.goals, 0), 0)}</div>
      <div class="summary-label">Total forfaits</div>
    </div>
    <div class="summary-card gold">
      <div class="summary-num">${modules.length}</div>
      <div class="summary-label">Phases actives</div>
    </div>
    <div class="summary-card green">
      <div class="summary-num">${modules.reduce((s, m) => { const all = [...m.players, ...coaches]; const t = all.reduce((a,p)=>a+p.goals,0); return s + all.reduce((a,p)=>a+getPlayerEarnings(p,all,t,{...DEFAULT_SETTINGS,...m.settings}),0)},0).toFixed(2)}€</div>
      <div class="summary-label">Primes totales</div>
    </div>
    <div class="summary-card orange">
      <div class="summary-num">${[...new Set(modules.flatMap(m => [...m.players, ...coaches].filter(p=>p.goals>=3).map(p=>p.name)))].length}</div>
      <div class="summary-label">Hat-Tricks 👑</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Joueur</th>
        ${modules.map(m => `<th style="text-align:center">${m.name}</th>`).join('')}
        <th style="text-align:center">Total buts</th>
      </tr>
    </thead>
    <tbody>
      ${[...modules[0].players, ...coaches].map(basePlayer => {
        const totals = modules.map(mod => {
          const p = [...mod.players, ...coaches].find(x => x.name === basePlayer.name)
          return p ? p.goals : 0
        })
        const totalG = totals.reduce((a,b) => a+b, 0)
        return `
        <tr>
          <td class="player-name">${basePlayer.name}${basePlayer.isCoach ? ` <span class="player-badge badge-coach">${basePlayer.role}</span>` : ''}</td>
          ${totals.map(g => `<td style="text-align:center; font-weight:${g>0?'700':'400'}; color:${g>=3?'#c8a800':g>0?'#1a3a5c':'#ccc'}">${g || '—'}</td>`).join('')}
          <td style="text-align:center; font-weight:800; font-size:16px; color:${totalG>=3?'#c8a800':'#1a3a5c'}">${totalG} ${totalG >= 3 ? '👑' : ''}</td>
        </tr>`
      }).join('')}
    </tbody>
  </table>
</div>

<div class="rules-reminder">
  <h3>📋 Rappel des règles</h3>
  <ul>
    <li>Palier 1 : <span class="highlight">${(allModulesData[0]?.s.tier1Rate||9.99)}€/forfait</span> de 0 à ${allModulesData[0]?.s.tier1Threshold||40} forfaits cumulés</li>
    <li>Palier 2 : <span class="highlight">${allModulesData[0]?.s.tier2Rate||12}€/forfait</span> à partir de ${allModulesData[0]?.s.tier1Threshold||40} forfaits cumulés (pour tout le monde)</li>
    <li>Palier 3 : <span class="highlight">${allModulesData[0]?.s.tier3Rate||15}€/forfait</span> à partir de ${allModulesData[0]?.s.tier2Threshold||50} forfaits cumulés (si compteur individuel ≥ 3)</li>
    <li>Top Buteur : <span class="highlight">${allModulesData[0]?.s.topScorerRate||20}€ pour TOUS les forfaits</span> — déclenché en fin de phase par le manager</li>
    <li>👑 Hat-Trick = 3+ forfaits = garantie bonus palier 3</li>
  </ul>
</div>

<div class="footer">
  Généré par Care Challenges · ${fmtDate()} · Document confidentiel — usage interne uniquement
</div>

<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 500);
  }
</script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) { alert('Veuillez autoriser les popups pour générer le PDF'); return }
  win.document.write(html)
  win.document.close()
}
