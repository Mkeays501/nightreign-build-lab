export const ATTRS=['vigor','mind','endurance','strength','dexterity','intelligence','faith','arcane'];
export const RES=['hp','fp','stamina'];
export const AXES=['physical','magic','fire','lightning','holy'];
export const COLORS=['any','red','blue','yellow','green'];
export const clamp=(n,a,b)=>Math.min(b,Math.max(a,Number(n)||a));
export function makeState(character='raider'){return{version:1,character,level:15,deep:false,vessel:0,slots:Array(6).fill(null),conditions:{},counts:{},name:'Untitled expedition',armament:{weaponId:4040000,affinity:'Standard',rarity:2,attackType:'standard'},weaponCompare:[]};}
export function vesselsFor(data,id){return data.vessels.find(c=>c.name.toLowerCase()===id)?.vessels||[];}
export function canFit(relic,color,deep){return !!relic&&((relic.type==='deep')===deep)&&(color===0||COLORS[color]===relic.color);}
export function validateRelic(relic,deep,emap){
 const errors=[];if(!relic)return errors;
 if(relic.fixedId)return errors;
 const ids=relic.effects||[],effects=ids.map(i=>emap.get(i)).filter(Boolean),positives=effects.filter(e=>!e.curse),curses=effects.filter(e=>e.curse);
 if(positives.length<1||positives.length>3)errors.push('Choose one to three effects.');
 if(curses.length>3)errors.push('At most three drawbacks fit on a Deep relic.');
 if(new Set(ids).size!==ids.length)errors.push('An effect cannot repeat on the same relic.');
 if(effects.length!==ids.length)errors.push('An effect ID is unavailable in this snapshot.');
 if(!deep&&curses.length)errors.push('Standard relics cannot have Deep drawbacks.');
 return [...new Set(errors)];
}
export function relicWarnings(relic,deep,emap){
 const warnings=[];if(!relic||relic.fixedId)return warnings;
 const effects=(relic.effects||[]).map(id=>emap.get(id)).filter(Boolean),positives=effects.filter(e=>!e.curse),curses=effects.filter(e=>e.curse);
 if(effects.some(e=>e.fixedOnly||(!e.curse&&!(deep?e.deepRandom:e.standardRandom))))warnings.push('This effect does not roll on this relic type.');
 const groups=effects.map(e=>e.compatibilityId).filter(g=>g&&g!=='0');
 if(new Set(groups).size!==groups.length)warnings.push('These effects share a same-relic exclusion group.');
 const need=positives.filter(e=>e.requiresCurse).length;
 if(need>curses.length)warnings.push(`${need} paired drawback${need===1?' is':'s are'} required.`);
 const cols=deep?(positives.length===3?['2000000','2000000','2200000']:Array(positives.length).fill('2000000')):(positives.length===3?['310','210','110']:positives.length===2?['210','110']:['110']);
 const permute=(a)=>a.length<2?[a]:a.flatMap((x,i)=>permute(a.filter((_,j)=>j!==i)).map(y=>[x,...y]));
 if(positives.length&&positives.length<=3&&!permute(positives).some(p=>p.every((e,i)=>Number(e.rollWeights?.[cols[i]])>0)))warnings.push('No valid roll-slot order exists for this combination.');
 return [...new Set(warnings)].map(message=>'Snapshot eligibility warning: '+message+' You can still equip a relic you own.');
}
export function remapSlots(slots,vessel){const out=Array(6).fill(null),removed=[];for(let i=0;i<6;i++){let r=slots[i];if(!r)continue;let start=i<3?0:3;let j=[start,start+1,start+2].find(j=>!out[j]&&canFit(r,vessel.slots[j],j>=3));if(j===undefined)removed.push(r);else out[j]=r;}return{slots:out,removed};}
export function calculate(data,state){
 const character=data.characters.find(c=>c.id===state.character)||data.characters[0],base=character.levels[clamp(state.level,1,15)-1];
 const vessel=vesselsFor(data,character.id)[state.vessel]||vesselsFor(data,character.id)[0];
 const emap=new Map(data.effects.map(e=>[e.id,e]));const flat={},multipliers={},damage={},taken={},extras={},warnings=[],ledger=[],seen=new Map(),unique=new Set(),ownedSeen=new Set();
 let unmodelled=0,conditionalOff=0,equipped=0;
 const add=(obj,k,n)=>obj[k]=(obj[k]||0)+n;
 const mul=(obj,k,n)=>obj[k]=(obj[k]??1)*n;
 for(let slot=0;slot<(state.deep?6:3);slot++){
  const relic=state.slots[slot];if(!relic)continue;equipped++;
  let errors=validateRelic(relic,slot>=3,emap);
  if(relic.ownedId){if(ownedSeen.has(relic.ownedId))errors.push('This owned relic is already equipped in another slot.');ownedSeen.add(relic.ownedId);}
  if(!canFit(relic,vessel.slots[slot],slot>=3))errors.push('Relic colour or expedition type does not match this slot.');
  if(relic.fixedId&&unique.has(relic.fixedId))errors.push('Unique relic is already equipped.');
  if(relic.fixedId)unique.add(relic.fixedId);
  if(errors.length){warnings.push({slot,message:errors.join(' ')});ledger.push({slot,status:'invalid',name:relic.name,message:errors.join(' '),modifiers:[]});continue;}
  for(const message of relicWarnings(relic,slot>=3,emap))warnings.push({slot,message});
  for(const id of relic.effects){
   const e=emap.get(id);if(!e){warnings.push({slot,message:`Unknown effect ${id}`});unmodelled++;continue;}
   const row={slot,id,name:e.name,modifiers:[],status:'active',message:''};
   if(e.character&&e.character!==character.name){row.status='inactive';row.message=`Only works for ${e.character}.`;ledger.push(row);continue;}
   const stackingKey=e.stackingKey||id;
   if(seen.has(stackingKey)&&e.stacks!==true){row.status='duplicate';row.message=e.stacks===false?'Does not stack with itself; counted once.':'Self-stacking is unconfirmed; second copy excluded.';warnings.push({slot,message:e.name+': '+row.message});ledger.push(row);continue;}
   seen.set(stackingKey,(seen.get(stackingKey)||0)+1);
   if(e.numericVerification?.status==='community-model'){row.message='Community numerical model; not fully corroborated by the parameter audit.';warnings.push({slot,message:e.name+': '+row.message});}
   const effectMods=e.modifiersAtLevel15&&state.level===15?e.modifiersAtLevel15:e.modifiers;
   if(!effectMods?.length){row.status='unmodelled';row.message=e.levelDependent?'Level-dependent attribute swap: totals do not include it.':'Utility or unverified numerical effect; excluded from totals.';unmodelled++;ledger.push(row);continue;}
   for(const m of effectMods){
    if(m.conditional&&!effectConditionActive(data,state,e)&&!m.countRequired){row.status='conditional';conditionalOff++;continue;}
    let value=m.value;
    if(m.countRequired){const n=clamp(state.counts[id]||0,0,m.maxCount||10);if(!n){row.status='conditional';conditionalOff++;continue;}if(m.countModel==='power')value=m.value**n;else{row.status='unmodelled';row.message='Count-dependent stacking formula is not validated.';unmodelled++;continue;}}
    if(m.kind==='damage')mul(damage,m.stat,value);
    else if(m.kind==='negation')mul(taken,m.stat,value);
    else if(ATTRS.includes(m.stat)||RES.includes(m.stat)){if(m.op==='add')add(flat,m.stat,value);else mul(multipliers,m.stat,value);}
    else if(m.op==='add')add(extras,m.stat,value);else mul(extras,m.stat,value);
    row.modifiers.push({...m,value});
   }
   ledger.push(row);
  }
 }
 const totals={};for(const key of ATTRS)totals[key]=clamp(Math.floor((base[key]+(flat[key]||0))*(multipliers[key]??1)),1,99);
 // Attribute effects map to resources once, using the capped attribute delta.
 for(const [key,attr,scale] of [['hp','vigor',20],['fp','mind',5],['stamina','endurance',2]]){
  totals[key]=Math.max(1,Math.floor((base[key]+(totals[attr]-base[attr])*scale+(flat[key]||0))*(multipliers[key]??1)+1e-7));
 }
 const attacks={},negation={};for(const axis of AXES){attacks[axis]=(damage.universal??1)*(damage[axis]??1);negation[axis]=1-(taken.universal??1)*(taken[axis]??1);}
 return{base,totals,attacks,negation,extras,ledger,warnings,unmodelled,conditionalOff,equipped,character,vessel};
}
export function sanitizeState(raw,data){
 if(!raw||typeof raw!=='object')throw Error('Invalid build file.');
 const s=makeState();if(!data.characters.some(c=>c.id===raw.character))throw Error('Nightfarer not found.');
 s.character=raw.character;s.name=String(raw.name||s.name).slice(0,70);s.level=clamp(Math.round(raw.level),1,15);s.deep=!!raw.deep;s.vessel=clamp(Math.round(raw.vessel||0),0,vesselsFor(data,s.character).length-1);
 const fixed=new Map(data.fixedRelics.map(r=>[r.id,r])),effects=new Set(data.effects.map(e=>e.id));
 s.slots=Array.from({length:6},(_,i)=>{const r=raw.slots?.[i];if(!r)return null;if(r.fixedId){const f=fixed.get(String(r.fixedId));return f?{name:f.name,color:f.color,type:'standard',fixedId:f.id,effects:[...f.effects],...(r.ownedId?{ownedId:String(r.ownedId).slice(0,100)}:{})}:null;}const ids=(r.effects||[]).map(String).filter(x=>/^\d{1,10}$/.test(x)).slice(0,6);return{name:String(r.name||'Custom relic').slice(0,80),color:COLORS.includes(r.color)&&r.color!=='any'?r.color:'red',type:i<3?'standard':'deep',effects:ids,...(r.ownedId?{ownedId:String(r.ownedId).slice(0,100)}:{})};});
 for(const [id,val] of Object.entries(raw.conditions||{}))if(effects.has(id)||id==='raiderFightersResolve')s.conditions[id]=val===true;
 for(const [id,val] of Object.entries(raw.counts||{}))if(effects.has(id))s.counts[id]=clamp(Math.round(val),0,10);
 const weapons=data.weaponData?.weapons||[];
 if(raw.armament&&typeof raw.armament==='object'){
  const id=Number(raw.armament.weaponId);if(weapons.some(w=>w.id===id))s.armament.weaponId=id;
  s.armament.affinity=['Standard','Fire','Lightning','Sacred','Magic','Cold','Poison','Blood'].includes(raw.armament.affinity)?raw.armament.affinity:'Standard';
  s.armament.rarity=clamp(Math.round(raw.armament.rarity),0,3);
  s.armament.attackType=['standard','charged','jump','critical','guardCounter','skill'].includes(raw.armament.attackType)?raw.armament.attackType:'standard';
 }
 s.weaponCompare=[...new Set((raw.weaponCompare||[]).map(Number).filter(id=>weapons.some(w=>w.id===id)))].slice(0,4);
 return s;
}

export function effectConditionActive(data,state,e){return !!state.conditions[e.id]||!!(e.stackingKey&&data.effects.some(other=>other.stackingKey===e.stackingKey&&state.conditions[other.id]));}
