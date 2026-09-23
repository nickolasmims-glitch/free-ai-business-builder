function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function pick(seed,max){return hash(seed)%max}
function signal(seed){return 1+pick(seed,10)}
export function buildLotterySignals(){const d=new Date().toISOString().slice(0,10);const games=["Pick 3","Powerball","Mega Millions"];return Object.fromEntries(games.map(g=>[g,{date:d,signal:signal(d+g),basis:"Deterministic research heuristic; not a prediction and not a probability of winning.",blink:signal(d+g)>=8}]))}
