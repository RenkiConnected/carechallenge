// Tableau de la compétition — bracket à élimination directe (32 équipes), disposition miroir
// centrée façon Coupe du Monde, avec la coupe au centre. Drapeaux en images (flagcdn) pour une
// identification facile, avec repli sur le code pays si l'image ne charge pas.
import wc2026 from '../assets/wc2026.webp'

export const BRACKET_TEAMS = [
  // Côté gauche (haut → bas) — 16 équipes
  { id:'ger', name:'Allemagne',      iso:'de' }, { id:'par', name:'Paraguay',      iso:'py' },
  { id:'fra', name:'France',         iso:'fr' }, { id:'swe', name:'Suède',         iso:'se' },
  { id:'rsa', name:'Afrique du Sud', iso:'za' }, { id:'can', name:'Canada',        iso:'ca' },
  { id:'ned', name:'Pays-Bas',       iso:'nl' }, { id:'mar', name:'Maroc',         iso:'ma' },
  { id:'por', name:'Portugal',       iso:'pt' }, { id:'cro', name:'Croatie',       iso:'hr' },
  { id:'esp', name:'Espagne',        iso:'es' }, { id:'aut', name:'Autriche',      iso:'at' },
  { id:'usa', name:'États-Unis',     iso:'us' }, { id:'bih', name:'Bosnie',        iso:'ba' },
  { id:'bel', name:'Belgique',       iso:'be' }, { id:'sen', name:'Sénégal',       iso:'sn' },
  // Côté droit (haut → bas) — 16 équipes
  { id:'bra', name:'Brésil',         iso:'br' }, { id:'jpn', name:'Japon',         iso:'jp' },
  { id:'civ', name:"Côte d'Ivoire",  iso:'ci' }, { id:'nor', name:'Norvège',       iso:'no' },
  { id:'mex', name:'Mexique',        iso:'mx' }, { id:'ecu', name:'Équateur',      iso:'ec' },
  { id:'eng', name:'Angleterre',     iso:'gb-eng' }, { id:'cod', name:'RD Congo',  iso:'cd' },
  { id:'arg', name:'Argentine',      iso:'ar' }, { id:'cpv', name:'Cap-Vert',      iso:'cv' },
  { id:'aus', name:'Australie',      iso:'au' }, { id:'egy', name:'Égypte',        iso:'eg' },
  { id:'sui', name:'Suisse',         iso:'ch' }, { id:'alg', name:'Algérie',       iso:'dz' },
  { id:'col', name:'Colombie',       iso:'co' }, { id:'gha', name:'Ghana',         iso:'gh' },
]

const ROUND_NAMES = ['16ᵉ de finale', '8ᵉ de finale', 'Quarts', 'Demi-finales', 'Finale']
const TEAM_BY_ID = Object.fromEntries(BRACKET_TEAMS.map(t => [t.id, t]))
const codeOf = (t) => (t.iso || '').replace('gb-', '').slice(0, 2).toUpperCase()

export function buildRounds(winners = {}) {
  const rounds = []
  let matches = []
  for (let i = 0; i < BRACKET_TEAMS.length; i += 2) matches.push({ a: BRACKET_TEAMS[i], b: BRACKET_TEAMS[i + 1] })
  rounds.push(matches)
  let r = 0
  while (rounds[r].length > 1) {
    const next = []
    for (let i = 0; i < rounds[r].length; i += 2) {
      const wA = winners[`r${r}m${i}`] ? TEAM_BY_ID[winners[`r${r}m${i}`]] : null
      const wB = winners[`r${r}m${i + 1}`] ? TEAM_BY_ID[winners[`r${r}m${i + 1}`]] : null
      next.push({ a: wA, b: wB })
    }
    rounds.push(next)
    r++
  }
  return rounds
}

export function setWinner(winners, round, idx, teamId) {
  const w = { ...winners }
  if (w[`r${round}m${idx}`] === teamId) delete w[`r${round}m${idx}`] // re-clic = annuler
  else w[`r${round}m${idx}`] = teamId
  let r = round + 1, i = Math.floor(idx / 2)
  while (r < ROUND_NAMES.length) { delete w[`r${r}m${i}`]; i = Math.floor(i / 2); r++ }
  return w
}

function Flag({ team }) {
  if (!team) return <span className="bk-flag-ph">—</span>
  return (
    <span className="bk-flag">
      <img
        src={`https://flagcdn.com/w40/${team.iso}.png`}
        srcSet={`https://flagcdn.com/w80/${team.iso}.png 2x`}
        alt={team.name} loading="lazy"
        onError={e => { e.target.style.display = 'none'; const s = e.target.nextSibling; if (s) s.style.display = 'inline-flex' }}
      />
      <span className="bk-code" style={{ display: 'none' }}>{codeOf(team)}</span>
    </span>
  )
}

function TeamSlot({ team, isWinner, isLoser, canEdit, mirror, onPick }) {
  return (
    <button
      type="button"
      className={`bk-team${mirror ? ' bk-mirror' : ''}${isWinner ? ' bk-win' : ''}${isLoser ? ' bk-lose' : ''}${!team ? ' bk-empty' : ''}`}
      disabled={!canEdit || !team}
      onClick={() => team && onPick()}
      title={!team ? 'En attente du tour précédent' : canEdit ? 'Cocher le vainqueur' : ''}
    >
      <Flag team={team} />
      <span className="bk-name">{team ? team.name : '—'}</span>
      {isWinner && <span className="bk-check">✓</span>}
    </button>
  )
}

export default function Bracket({ winners = {}, canEdit = false, onPick }) {
  const rounds = buildRounds(winners)
  const finalRound = rounds.length - 1
  const champion = winners[`r${finalRound}m0`] ? TEAM_BY_ID[winners[`r${finalRound}m0`]] : null

  const Column = ({ r, matches, offset, side, title }) => (
    <div className="bk-col">
      <div className="bk-col-title">{title}</div>
      <div className="bk-col-matches">
        {matches.map((mt, j) => {
          const gIdx = offset + j
          const win = winners[`r${r}m${gIdx}`]
          const mirror = side === 'right'
          return (
            <div key={j} className={`bk-match bk-${side}`}>
              <TeamSlot team={mt.a} mirror={mirror} isWinner={win && mt.a && win === mt.a.id} isLoser={win && mt.a && win !== mt.a.id} canEdit={canEdit} onPick={() => onPick(r, gIdx, mt.a.id)} />
              <TeamSlot team={mt.b} mirror={mirror} isWinner={win && mt.b && win === mt.b.id} isLoser={win && mt.b && win !== mt.b.id} canEdit={canEdit} onPick={() => onPick(r, gIdx, mt.b.id)} />
            </div>
          )
        })}
      </div>
    </div>
  )

  const half = (r) => rounds[r].length / 2
  const leftCols = [0, 1, 2, 3]
  const rightCols = [3, 2, 1, 0]
  const fmt = rounds[finalRound][0]
  const fwin = winners[`r${finalRound}m0`]

  return (
    <div className="bracket-wrap">
      <div className="bracket-head">
        <div className="bracket-title">🏆 TABLEAU DE LA COMPÉTITION</div>
        <div className="bracket-sub">
          {canEdit ? 'Coche le vainqueur de chaque match : il avance jusqu’à la finale.' : 'Le vainqueur de chaque match est désigné par le manager.'}
          <br/>Fais défiler horizontalement et verticalement pour tout voir.
        </div>
      </div>

      {champion && (
        <div className="bracket-champion">
          <span className="bc-cup">🏆</span>
          <Flag team={champion} />
          <div>
            <div className="bc-label">CHAMPION</div>
            <div className="bc-name">{champion.name}</div>
          </div>
        </div>
      )}

      <div className="bracket-scroll">
        <div className="bracket-mirror">
          {leftCols.map(r => (
            <Column key={`L${r}`} r={r} matches={rounds[r].slice(0, half(r))} offset={0} side="left" title={ROUND_NAMES[r]} />
          ))}

          <div className="bk-center">
            <img className="bk-trophy" src={wc2026} alt="Coupe du Monde 2026" />
            <div className="bk-final-title">FINALE</div>
            <div className="bk-match bk-final">
              <TeamSlot team={fmt.a} isWinner={fwin && fmt.a && fwin === fmt.a.id} isLoser={fwin && fmt.a && fwin !== fmt.a.id} canEdit={canEdit} onPick={() => onPick(finalRound, 0, fmt.a.id)} />
              <TeamSlot team={fmt.b} isWinner={fwin && fmt.b && fwin === fmt.b.id} isLoser={fwin && fmt.b && fwin !== fmt.b.id} canEdit={canEdit} onPick={() => onPick(finalRound, 0, fmt.b.id)} />
            </div>
          </div>

          {rightCols.map(r => (
            <Column key={`R${r}`} r={r} matches={rounds[r].slice(half(r))} offset={half(r)} side="right" title={ROUND_NAMES[r]} />
          ))}
        </div>
      </div>
    </div>
  )
}
