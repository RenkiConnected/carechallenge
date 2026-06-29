// Tableau de la compétition — bracket à élimination directe (32 équipes).
// On coche le vainqueur de chaque match : il avance automatiquement au tour suivant, jusqu'à la finale.

export const BRACKET_TEAMS = [
  // Côté gauche (haut → bas)
  { id:'ger', name:'Allemagne',       flag:'🇩🇪' }, { id:'par', name:'Paraguay',       flag:'🇵🇾' },
  { id:'fra', name:'France',          flag:'🇫🇷' }, { id:'swe', name:'Suède',          flag:'🇸🇪' },
  { id:'rsa', name:'Afrique du Sud',  flag:'🇿🇦' }, { id:'can', name:'Canada',         flag:'🇨🇦' },
  { id:'ned', name:'Pays-Bas',        flag:'🇳🇱' }, { id:'mar', name:'Maroc',          flag:'🇲🇦' },
  { id:'por', name:'Portugal',        flag:'🇵🇹' }, { id:'cro', name:'Croatie',        flag:'🇭🇷' },
  { id:'esp', name:'Espagne',         flag:'🇪🇸' }, { id:'aut', name:'Autriche',       flag:'🇦🇹' },
  { id:'usa', name:'États-Unis',      flag:'🇺🇸' }, { id:'bih', name:'Bosnie',         flag:'🇧🇦' },
  { id:'bel', name:'Belgique',        flag:'🇧🇪' }, { id:'sen', name:'Sénégal',        flag:'🇸🇳' },
  // Côté droit (haut → bas)
  { id:'bra', name:'Brésil',          flag:'🇧🇷' }, { id:'jpn', name:'Japon',          flag:'🇯🇵' },
  { id:'civ', name:"Côte d'Ivoire",   flag:'🇨🇮' }, { id:'nor', name:'Norvège',        flag:'🇳🇴' },
  { id:'mex', name:'Mexique',         flag:'🇲🇽' }, { id:'ecu', name:'Équateur',       flag:'🇪🇨' },
  { id:'eng', name:'Angleterre',      flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿' }, { id:'cod', name:'RD Congo',       flag:'🇨🇩' },
  { id:'arg', name:'Argentine',       flag:'🇦🇷' }, { id:'cpv', name:'Cap-Vert',       flag:'🇨🇻' },
  { id:'aus', name:'Australie',       flag:'🇦🇺' }, { id:'egy', name:'Égypte',         flag:'🇪🇬' },
  { id:'sui', name:'Suisse',          flag:'🇨🇭' }, { id:'alg', name:'Algérie',        flag:'🇩🇿' },
  { id:'col', name:'Colombie',        flag:'🇨🇴' }, { id:'gha', name:'Ghana',          flag:'🇬🇭' },
]

const ROUND_NAMES = ['16ᵉ de finale', '8ᵉ de finale', 'Quarts de finale', 'Demi-finales', 'Finale']

const TEAM_BY_ID = Object.fromEntries(BRACKET_TEAMS.map(t => [t.id, t]))

// Construit tous les tours à partir des vainqueurs cochés.
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

// Quand on change un vainqueur, on efface les choix en aval (le chemin vers la finale) devenus invalides.
export function setWinner(winners, round, idx, teamId) {
  const w = { ...winners }
  if (w[`r${round}m${idx}`] === teamId) { delete w[`r${round}m${idx}`]; } // re-clic = annuler
  else w[`r${round}m${idx}`] = teamId
  let r = round + 1, i = Math.floor(idx / 2)
  while (r < ROUND_NAMES.length) { delete w[`r${r}m${i}`]; i = Math.floor(i / 2); r++ }
  return w
}

function TeamSlot({ team, isWinner, isLoser, canEdit, onPick }) {
  return (
    <button
      type="button"
      className={`bk-team${isWinner ? ' bk-win' : ''}${isLoser ? ' bk-lose' : ''}${!team ? ' bk-empty' : ''}`}
      disabled={!canEdit || !team}
      onClick={() => team && onPick()}
      title={!team ? 'En attente du tour précédent' : canEdit ? 'Cocher le vainqueur' : ''}
    >
      <span className="bk-flag">{team ? team.flag : '—'}</span>
      <span className="bk-name">{team ? team.name : '—'}</span>
      {isWinner && <span className="bk-check">✓</span>}
    </button>
  )
}

export default function Bracket({ winners = {}, canEdit = false, onPick }) {
  const rounds = buildRounds(winners)
  const champion = winners[`r${rounds.length - 1}m0`] ? TEAM_BY_ID[winners[`r${rounds.length - 1}m0`]] : null

  return (
    <div className="bracket-wrap">
      <div className="bracket-head">
        <div className="bracket-title">🏆 TABLEAU DE LA COMPÉTITION</div>
        <div className="bracket-sub">
          {canEdit ? 'Coche le vainqueur de chaque match : il avance au tour suivant, jusqu’à la finale.' : 'Le vainqueur de chaque match est désigné par le manager.'}
        </div>
      </div>

      {champion && (
        <div className="bracket-champion">
          <span className="bc-cup">🏆</span>
          <span className="bc-flag">{champion.flag}</span>
          <div>
            <div className="bc-label">CHAMPION</div>
            <div className="bc-name">{champion.name}</div>
          </div>
        </div>
      )}

      <div className="bracket-scroll">
        <div className="bracket-cols">
          {rounds.map((matches, r) => (
            <div key={r} className="bk-col">
              <div className="bk-col-title">{ROUND_NAMES[r]}</div>
              <div className="bk-col-matches">
                {matches.map((mt, i) => {
                  const win = winners[`r${r}m${i}`]
                  return (
                    <div key={i} className="bk-match">
                      <TeamSlot team={mt.a} isWinner={win && mt.a && win === mt.a.id} isLoser={win && mt.a && win !== mt.a.id} canEdit={canEdit} onPick={() => onPick(r, i, mt.a.id)} />
                      <TeamSlot team={mt.b} isWinner={win && mt.b && win === mt.b.id} isLoser={win && mt.b && win !== mt.b.id} canEdit={canEdit} onPick={() => onPick(r, i, mt.b.id)} />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
