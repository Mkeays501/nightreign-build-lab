import {vesselsFor,canFit,validateRelic,calculate} from './engine.mjs';
import {calculateArmament,resolveWeaponVariant} from './weapon-engine.mjs';

// Bounded beam search: promising partial builds are retained at each slot.
export async function optimizeWeapon(data,initial,candidates,goal='potential',onProgress=()=>{}){
 const weapon=data.weaponData.weapons.find(w=>w.id===initial.armament.weaponId);
 const variant=resolveWeaponVariant(weapon,initial.armament.affinity,initial.armament.rarity);
 if(!weapon||!variant)throw new Error('The selected weapon has no calculation model.');
 const emap=new Map(data.effects.map(e=>[e.id,e]));
 const pool=candidates.filter(r=>r&&r.effects?.length&&!validateRelic(r,r.type==='deep',emap).length);
 const vessels=vesselsFor(data,initial.character),limit=initial.deep?6:3,results=[];
 const evaluate=s=>{const result=calculate(data,s),arm=calculateArmament(data,s,weapon,variant,result);return {score:goal==='ar'?arm.modified.total:arm.potential,arm,result};};
 for(let vi=0;vi<vessels.length;vi++){
  const empty={...initial,vessel:vi,slots:Array(6).fill(null)};
  let beam=[{state:empty,...evaluate(empty)}];
  for(let slot=0;slot<limit;slot++){
   const fits=pool.filter(r=>canFit(r,vessels[vi].slots[slot],slot>=3));
   // Shortlist individually before exploring combinations; this is not exhaustive.
   const ranked=fits.map((r,index)=>{const slots=empty.slots.slice();slots[slot]=r;return {r,index,score:evaluate({...empty,slots}).score};}).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,16);
   const next=[];
   for(const item of beam){
    next.push(item);
    for(const {r,index} of ranked){
     if(item.state.slots.includes(r)||r.ownedId&&item.state.slots.some(x=>x?.ownedId===r.ownedId)||r.fixedId&&item.state.slots.some(x=>x?.fixedId===r.fixedId))continue;
     const slots=item.state.slots.slice();slots[slot]=r;const s={...item.state,slots};
     const evalResult=evaluate(s);if(evalResult.result.ledger.some(x=>x.status==='invalid'))continue;
     next.push({state:s,...evalResult});
    }
   }
   next.sort((a,b)=>b.score-a.score||a.state.slots.filter(Boolean).length-b.state.slots.filter(Boolean).length);
   beam=next.slice(0,8);
  }
  results.push(...beam);
  onProgress(vi+1,vessels.length);
  await new Promise(resolve=>setTimeout(resolve,0));
 }
 results.sort((a,b)=>b.score-a.score);
 const seen=new Set();return results.filter(r=>{const key=JSON.stringify([r.state.vessel,r.state.slots.map(x=>x?.ownedId||x?.fixedId||null)]);if(seen.has(key))return false;seen.add(key);return true;}).slice(0,5);
}
