import {effectConditionActive} from './engine.mjs';
export const WEAPON_ATTRIBUTES=['strength','dexterity','intelligence','faith','arcane'];
export const RARITY_NAMES=['Common','Uncommon','Rare','Legendary'];
export function resolveWeaponVariant(weapon,affinity='Standard',rarity=2){
 if(!weapon?.variants?.length)return null;
 let list=weapon.variants.filter(v=>v.affinity===affinity);if(!list.length)list=weapon.variants.filter(v=>v.affinity==='Standard');if(!list.length)list=weapon.variants;
 return list.find(v=>v.rarity===Number(rarity))||list.filter(v=>v.rarity>=Number(rarity)).sort((a,b)=>a.rarity-b.rarity)[0]||list.at(-1);
}
export function rawWeaponAR(weaponData,variant,attributes,scalingAdjustments={}){
 if(!variant)return null;
 const stats=WEAPON_ATTRIBUTES.map(k=>Math.max(1,Math.min(99,Math.trunc(Number(attributes[k])||1))));
 const components=variant.base.map((base,axis)=>{
  const curve=weaponData.curves[String(variant.curves[axis])];
  if(!curve)throw Error('Weapon scaling curve is unavailable.');
  const terms=stats.map((stat,j)=>{
   if(variant.enabled&&!variant.enabled[axis][j])return 0;
   const adjust=(scalingAdjustments[WEAPON_ATTRIBUTES[j]]||0)*(variant.influences?.[axis]?.[j]??1);
   return (variant.offsets?.[axis]?.[j]||0)+((variant.coefficients[axis][j]||0)+adjust)*(curve[stat-1]||0)/100;
  });
  const scaling=terms.some(t=>t<0)?Math.min(0,...terms):terms.reduce((sum,t)=>sum+t,0);
  return Math.max(0,base*(1+scaling));
 });
 return{raw:components,channels:components.map(v=>Math.trunc(v+1e-9)),total:Math.trunc(components.reduce((s,v)=>s+v,0)+1e-9)};
}
export function relicWeaponFactors(data,state,weapon,result){
 const factors={physical:1,magic:1,fire:1,lightning:1,holy:1},scaling={},applied=[],inactive=[],unknown=[];
 const effects=new Map(data.effects.map(e=>[e.id,e]));
 for(const row of result.ledger){
  if(!row.id||['invalid','duplicate','inactive'].includes(row.status))continue;
  const e=effects.get(row.id),rule=data.weaponRules?.effects?.[row.id];
  if(!rule){if(e?.modifiers?.some(m=>m.kind==='damage'))unknown.push({id:row.id,name:e.name,reason:'Weapon-specific applicability is not mapped.'});continue;}
  const hasDamage=Object.keys(rule.damageMultipliers||{}).length>0,hasScaling=Object.keys(rule.scalingAdjustments||{}).length>0;
  if(!hasDamage&&!hasScaling){if(e?.modifiers?.some(m=>m.kind==='damage')||(e?.levelDependent&&state.level!==15))unknown.push({id:row.id,name:e.name,reason:e.levelDependent?'Attribute swap is included only at verified levels.':'Temporary or scripted offense is outside the verified weapon model.'});continue;}
  if(rule.appliesToWeapon===false){inactive.push({name:e.name,reason:'Applies to '+(rule.spellSchools?.join(' / ')||rule.scope||'another attack system')+', not weapon strike AR.'});continue;}
  if(rule.weaponCategories?.length&&!rule.weaponCategories.includes(weapon.category)){inactive.push({name:e.name,reason:'Does not apply to '+weapon.category+'.'});continue;}
  if(rule.excludeWeaponCategories?.includes(weapon.category)){inactive.push({name:e.name,reason:'Does not apply to '+weapon.category+'.'});continue;}
  const attack=state.armament?.attackType||'standard';
  if(rule.attackTypes?.length&&!rule.attackTypes.includes(attack)){inactive.push({name:e.name,reason:'Requires '+rule.attackTypes.join(' / ')+' attacks.'});continue;}
  if(rule.requiresCondition&&!effectConditionActive(data,state,e)){inactive.push({name:e.name,reason:rule.conditionLabel||'Condition is off.'});continue;}
  let count=1;if(rule.requiresCount){count=Math.max(0,Math.min(rule.maxCount||10,Number(state.counts[row.id])||0));if(!count){inactive.push({name:e.name,reason:'Progress count is zero.'});continue;}}
  if(rule.unmodelled){unknown.push({id:row.id,name:e.name,reason:rule.unmodelled});continue;}
  for(const [axis,v] of Object.entries(rule.damageMultipliers||{}))if(axis in factors)factors[axis]*=v**count;
  for(const [attr,v] of Object.entries(rule.scalingAdjustments||{}))scaling[attr]=(scaling[attr]||0)+v;
  applied.push({id:row.id,name:e.name,damageMultipliers:rule.damageMultipliers||{},scalingAdjustments:rule.scalingAdjustments||{},count});
 }
 if(state.character==='raider'&&state.conditions?.raiderFightersResolve){
  for(const axis of Object.keys(factors))factors[axis]*=1.5;
  applied.push({id:'raiderFightersResolve',name:"Fighter's Resolve — low-health buff",damageMultipliers:Object.fromEntries(Object.keys(factors).map(axis=>[axis,1.5])),scalingAdjustments:{},count:1});
 }
 return{factors,scaling,applied,inactive,unknown};
}
export function calculateArmament(data,state,weapon,variant,result){
 if(!variant)return{available:false,weapon,reason:weapon.unavailableReason||'Weapon parameters are unavailable in this source snapshot.'};
 const rules=relicWeaponFactors(data,state,weapon,result);
 const baseline=rawWeaponAR(data.weaponData,variant,result.base),attributesOnly=rawWeaponAR(data.weaponData,variant,result.totals),modified=rawWeaponAR(data.weaponData,variant,result.totals,rules.scaling);
 const axes=['physical','magic','fire','lightning','holy'];
 const adjusted=modified.raw.map((v,i)=>v*rules.factors[axes[i]]),potential=adjusted.reduce((s,v)=>s+v,0);
 const casting=variant.casting?rawWeaponAR(data.weaponData,{...variant,base:[85,85,85,85,85]},result.totals,rules.scaling).channels:null;
 return{available:true,weapon,variant,baseline,attributesOnly,modified,delta:modified.total-baseline.total,rules,potential,adjusted,casting,partial:result.unmodelled>0||rules.unknown.length>0};
}
