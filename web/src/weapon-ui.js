let weaponQuery='',weaponCategory='all',weaponSort='modified',weaponPage=0;
const weaponById=new Map((NR.weaponData?.weapons||[]).map(w=>[w.id,w]));
let currentArmoryResult=null;
function normalizeArmament(){
 state.armament=state.armament||{weaponId:4040000,affinity:'Standard',rarity:2,attackType:'standard'};
 state.weaponCompare=state.weaponCompare||[];
 if(!weaponById.has(state.armament.weaponId))state.armament.weaponId=weaponById.has(4040000)?4040000:NR.weaponData.weapons[0].id;
}
function selectedArmament(r){normalizeArmament();const w=weaponById.get(state.armament.weaponId),v=resolveWeaponVariant(w,state.armament.affinity,state.armament.rarity);return calculateArmament(NR,state,w,v,r);}
function percentFactor(v){return `${v>=1?'+':''}${Number(((v-1)*100).toFixed(2))}%`;}
function renderWeapons(r){
 if(!NR.weaponData||!$('#weapon-picker'))return;normalizeArmament();currentArmoryResult=r;
 const a=selectedArmament(r),w=a.weapon,variants=w.variants||[],affinities=[...new Set(variants.map(v=>v.affinity))];
 $('#weapon-picker').innerHTML=weaponThumbnail(w)+`<span id="weapon-picker-current">${E(w.name)}<small>${E(w.category)}</small></span><span class="weapon-picker-action">Change</span>`;
 const actualAffinity=a.variant?.affinity||'Standard';$('#weapon-affinity').innerHTML=affinities.length?affinities.map(x=>`<option${x===actualAffinity?' selected':''}>${E(x)}</option>`).join(''):'<option>Unavailable</option>';
 const rarities=[...new Set(variants.filter(v=>v.affinity===actualAffinity).map(v=>v.rarity))].sort();$('#weapon-rarity').innerHTML=rarities.length?rarities.map(x=>`<option value="${x}"${x===a.variant.rarity?' selected':''}>${RARITY_NAMES[x]}</option>`).join(''):'<option>Unavailable</option>';
 $('#weapon-attack').value=state.armament.attackType||'standard';
 if(a.variant){state.armament.affinity=a.variant.affinity;state.armament.rarity=a.variant.rarity;}
 if(!a.available){$('#attack-scenario-explanation').textContent='This weapon has no available calculation model.';$('#weapon-readout').innerHTML=`<p class="weapon-unavailable">${E(a.reason)}</p>`;$('#weapon-relic-detail').innerHTML='';renderArmory(r);return;}
 const delta=a.delta,model=a.weapon.currentParameters?'1.03.5 params':'1.02.2 source model';
 $('#weapon-readout').innerHTML=`<div class="weapon-model-tags"><span class="small-tag">${E(w.category)}</span><span class="small-tag">${E(model)}</span>${w.descriptiveName?'<span class="small-tag">Descriptive starter label</span>':''}${a.partial?'<span class="small-tag">Some effects outside model</span>':''}</div><div class="ar-summary"><div class="ar-stat"><small>Without relics</small><strong>${a.baseline.total}</strong><span>${r.character.name} · LV.${state.level}</span></div><div class="ar-stat featured"><small>Build attack rating</small><strong>${a.modified.total}</strong><span>${delta>0?'+':''}${delta} AR from mapped relics</span></div><div class="ar-stat"><small>Adjusted potential*</small><strong>${Math.trunc(a.potential)}</strong><span>Damage factors included</span></div></div><table class="ar-channel-table"><thead><tr><th>Channel</th><th>No relics</th><th>Build AR</th><th>Damage factor</th><th>Potential*</th></tr></thead><tbody>${AXES.map((axis,i)=>`<tr><td>${title(axis)}</td><td>${a.baseline.channels[i]}</td><td class="${a.modified.channels[i]!==a.baseline.channels[i]?'gain':''}">${a.modified.channels[i]}</td><td>×${a.rules.factors[axis].toFixed(3)}</td><td>${a.adjusted[i].toFixed(1)}</td></tr>`).join('')}</tbody></table>${a.casting?`<p class="caster-note">Catalyst scaling model: ${a.casting.every(v=>v===a.casting[0])?a.casting[0]:a.casting.map((v,i)=>title(AXES[i])+' '+v).join(' · ')}. This is separate from strike AR and actual spell damage.</p>`:''}${/Bow|Crossbow|Ballista/.test(w.category)?'<p class="weapon-assumptions">Ranged rating is weapon-only; ammunition and projectile attack values are not included.</p>':''}<p class="weapon-assumptions">Total AR is rounded down after adding the unrounded channels, so displayed channels may not add up exactly. Two-handing does not automatically add Strength.</p>`;
 const scenarioIds=[...new Set(r.ledger.filter(row=>row.id&&!['inactive','invalid','duplicate'].includes(row.status)).map(row=>row.id))];
 const scenarioEffects=scenarioIds.map(id=>({effect:emap.get(id),rule:NR.weaponRules?.effects?.[id]})).filter(x=>x.effect&&x.rule?.attackTypes?.length&&x.rule.appliesToWeapon!==false&&(!x.rule.weaponCategories?.length||x.rule.weaponCategories.includes(w.category))&&!x.rule.excludeWeaponCategories?.includes(w.category));
 $('#attack-scenario-explanation').textContent=scenarioEffects.length?`Attack scenario changes which attack-specific relic bonuses apply: ${scenarioEffects.map(x=>x.effect.name+' ('+x.rule.attackTypes.join(', ')+')').join('; ')}. Weapon AR itself stays the same. Actual hit damage is not calculated.`:'No supported relic bonus changes with this attack scenario. AR stays the same; hit damage is not calculated.';
 renderWeaponRules(a);renderArmory(r);
}
function renderWeaponRules(a){
 const sourceRows=currentArmoryResult.ledger.filter(row=>row.id&&!['inactive','invalid','duplicate'].includes(row.status));
 const ids=[...new Set(sourceRows.map(row=>row.id))],rules=NR.weaponRules?.effects||{};
 const controls=ids.filter(id=>rules[id]&&(rules[id].requiresCondition||rules[id].requiresCount));
 const controlsHTML=controls.map(id=>{const rule=rules[id],e=emap.get(id);return `<div class="weapon-relic-row"><label>${rule.requiresCount?`<input type="number" class="count-input" min="0" max="${rule.maxCount||10}" data-count="${id}" value="${state.counts[id]||0}">`:`<input type="checkbox" data-condition="${id}" ${state.conditions[id]?'checked':''}>`}<span>${E(e?.name||id)}</span></label><small>${E(rule.conditionLabel||'Apply only while active in your run.')}</small></div>`;}).join('');
 const applied=a.rules.applied.map(row=>`<div class="weapon-relic-row"><span>${E(row.name)}</span><small>${Object.entries(row.damageMultipliers).map(([key,v])=>`${title(key)} ${percentFactor(v**row.count)}`).join(' · ')}${Object.keys(row.scalingAdjustments).length?'Scaling coefficients adjusted':''}</small></div>`).join('');
 const omissions=[...a.rules.inactive,...a.rules.unknown].map(row=>`<div class="weapon-relic-row inactive"><span>${E(row.name)}</span><small>${E(row.reason)}</small></div>`).join('');
 const passive=state.character==='raider'?`<div class="weapon-relic-row"><label><input type="checkbox" id="raider-resolve" ${state.conditions.raiderFightersResolve?'checked':''}><span>Fighter’s Resolve: low-health damage buff active</span></label><small>Community estimate: +50% damage for 10 seconds after HP falls to 25% or less. Enable only during that window. <a href="https://eldenring.wiki.gg/wiki/Raider" target="_blank" rel="noopener">Source ↗</a></small></div>`:'';
 $('#weapon-relic-detail').innerHTML=(controlsHTML||passive?'<div class="picker-section">Run conditions</div>'+passive+controlsHTML:'')+`<details class="weapon-relic-details" ${a.rules.applied.length?'open':''}><summary>${a.rules.applied.length} active damage bonuses · ${a.rules.inactive.length+a.rules.unknown.length} inactive or unsupported</summary>${applied||'<p class="micro-note">No mapped damage modifiers apply to this weapon and attack scenario.</p>'}${omissions}</details>`;
}
function renderArmory(r=currentArmoryResult){
 if(!r||!NR.weaponData)return;
 const categories=[...new Set(NR.weaponData.weapons.map(w=>w.category))].sort();
 if($('#weapon-category').options.length<2)$('#weapon-category').innerHTML='<option value="all">All weapon classes</option>'+categories.map(c=>`<option>${E(c)}</option>`).join('');
 $('#armory-context').textContent=`${r.character.name} · Level ${state.level} · ${state.armament.affinity} · ${RARITY_NAMES[state.armament.rarity]}`;
 $('#weapon-source-notes').textContent=`${NR.weaponData.weapons.length} catalogued armaments with ${NR.weaponData.weapons.reduce((s,w)=>s+w.variants.length,0).toLocaleString()} parameter-backed affinity/rarity variants. ${NR.weaponData.currentDataNote||'Weapon baseline: regulation 1.02.2, 17 September 2025. Missing newer parameters are labelled.'}`;
 $('#weapon-data-boundary').textContent=NR.weaponData.currentDataNote||'Weapon parameters use a versioned community snapshot. Relic damage rules use the 1.03.5 parameter snapshot. Native rarities and affinities are preserved; a weapon uses its nearest supported variant when the requested option does not exist.';
 let all=NR.weaponData.weapons.filter(w=>(weaponCategory==='all'||w.category===weaponCategory)&&`${w.name} ${w.category}`.toLowerCase().includes(weaponQuery.toLowerCase())).map(w=>calculateArmament(NR,state,w,resolveWeaponVariant(w,state.armament.affinity,state.armament.rarity),r));
 all.sort((a,b)=>weaponSort==='name'?a.weapon.name.localeCompare(b.weapon.name):((b.available?(weaponSort==='delta'?b.delta:weaponSort==='potential'?b.potential:b.modified.total):-Infinity)-(a.available?(weaponSort==='delta'?a.delta:weaponSort==='potential'?a.potential:a.modified.total):-Infinity))||a.weapon.name.localeCompare(b.weapon.name));
 const pages=Math.max(1,Math.ceil(all.length/25));weaponPage=Math.max(0,Math.min(weaponPage,pages-1));let page=all.slice(weaponPage*25,(weaponPage+1)*25);
 $('#weapon-count').textContent=`${all.length} / ${NR.weaponData.weapons.length}`;
 $('#weapon-table-body').innerHTML=page.map(a=>`<tr class="${state.armament.weaponId===a.weapon.id?'is-selected':''}"><td><input type="checkbox" data-compare-weapon="${a.weapon.id}" aria-label="Compare ${E(a.weapon.name)}" ${state.weaponCompare.includes(a.weapon.id)?'checked':''}></td><td><button class="weapon-name" data-select-weapon="${a.weapon.id}">${weaponThumbnail(a.weapon)}<span>${E(a.weapon.name)}<small>${E(a.weapon.category)}</small></span></button></td><td>${a.available?`${E(a.variant.affinity)}<br>${RARITY_NAMES[a.variant.rarity]}`:'No model'}</td><td>${a.available?a.baseline.total:'—'}</td><td class="build-ar">${a.available?a.modified.total:'—'}</td><td class="${a.delta>0?'positive':''}">${a.available?(a.delta>0?'+':'')+a.delta:'—'}</td><td>${a.available?Math.trunc(a.potential):'—'}</td></tr>`).join('')||'<tr><td colspan="7">No weapons match these filters.</td></tr>';
 $('#armory-page-label').textContent=`Page ${weaponPage+1} of ${pages} · ${all.length} matches`;
 $('#weapon-prev').disabled=weaponPage===0;$('#weapon-next').disabled=weaponPage>=pages-1;renderWeaponComparison(r);
}
function renderWeaponComparison(r){
 const items=state.weaponCompare.map(id=>weaponById.get(id)).filter(Boolean).map(w=>calculateArmament(NR,state,w,resolveWeaponVariant(w,state.armament.affinity,state.armament.rarity),r));
 if(!items.length){$('#weapon-comparison').innerHTML='<p class="micro-note">Select up to four weapons to compare with this build.</p>';return;}
 const rows=[['No-relic AR',a=>a.available?a.baseline.total:'—'],['Build AR',a=>a.available?a.modified.total:'—'],['AR change',a=>a.available?(a.delta>0?'+':'')+a.delta:'—'],...AXES.map((axis,i)=>[title(axis)+' AR',a=>a.available?a.modified.channels[i]:'—']),['Adjusted potential*',a=>a.available?Math.trunc(a.potential):'—']];
 $('#weapon-comparison').innerHTML=`<div class="armament-comparison"><div class="compare-title"><span>${items.length} armaments · same build</span><button class="quiet" id="clear-weapon-compare">Clear selection</button></div><table class="compare-table"><thead><tr><th>Metric</th>${items.map(a=>`<th><button class="text-link" data-select-weapon="${a.weapon.id}">${E(a.weapon.name)}</button><br><small>${a.available?RARITY_NAMES[a.variant.rarity]+' · '+E(a.variant.affinity):'Parameters unavailable'}</small></th>`).join('')}</tr></thead><tbody>${rows.map(([label,fn])=>`<tr><td>${E(label)}</td>${items.map(a=>`<td>${fn(a)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function chooseWeapon(id){if(!weaponById.has(Number(id)))return;update(()=>{normalizeArmament();state.armament.weaponId=Number(id);const w=weaponById.get(Number(id)),v=resolveWeaponVariant(w,state.armament.affinity,state.armament.rarity);if(v){state.armament.affinity=v.affinity;state.armament.rarity=v.rarity;}},'Weapon selected. Ratings use your current build.');$('#weapon-focus').scrollIntoView({behavior:'smooth',block:'start'});}

const sortedWeapons = [...weaponById.values()].sort((a, b) => a.name.localeCompare(b.name));
const picker = $('#weapon-dialog');
const pickerSearch = $('#weapon-picker-search');
const pickerClass = $('#weapon-picker-class');
const pickerResults = $('#weapon-picker-results');

function weaponThumbnail(weapon) {
 const cell = WEAPON_ICONS[weapon.id];
 if (cell === undefined) {
  const label = weapon.id === 110000 ? 'Unarmed' : 'No image';
  return `<span class="weapon-thumb weapon-thumb-empty" aria-hidden="true">${label}</span>`;
 }
 return `<span class="weapon-thumb weapon-thumb-art" aria-hidden="true" style="--icon-x:${cell % 24};--icon-y:${Math.floor(cell / 24)}"></span>`;
}

function weaponSearchText(value) {
 return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function renderWeaponPicker() {
 const terms = weaponSearchText(pickerSearch.value).split(' ').filter(Boolean);
 const matches = sortedWeapons.filter(weapon => {
  const name = weaponSearchText(weapon.name + ' ' + weapon.category + ' ' + (WEAPON_SEARCH_ALIASES[weapon.id] || ''));
  return (!pickerClass.value || weapon.category === pickerClass.value) && terms.every(term => name.includes(term));
 });
 $('#weapon-picker-count').textContent = matches.length === 0 ? 'No weapons found' : `${matches.length} ${matches.length === 1 ? 'weapon' : 'weapons'}`;
 pickerResults.innerHTML = matches.map(weapon => {
  const selected = weapon.id === state.armament.weaponId;
  return `<li><button type="button" data-pick-weapon="${weapon.id}"${selected ? ' aria-current="true"' : ''}>${weaponThumbnail(weapon)}<span>${E(weapon.name)}<small>${E(weapon.category)}</small></span>${selected ? '<span class="weapon-picker-action">Selected</span>' : ''}</button></li>`;
 }).join('');
}

const WEAPON_SEARCH_ALIASES = {5750000: "Scholar's Thrusting Sword", 11750000: "Undertaker's Hammer"};
pickerClass.innerHTML = '<option value="">All weapon classes</option>' +
 [...new Set(sortedWeapons.map(weapon => weapon.category))].sort().map(category => `<option>${E(category)}</option>`).join('');
$('#weapon-picker').addEventListener('click', () => {
 pickerSearch.value = '';
 pickerClass.value = '';
 renderWeaponPicker();
 picker.showModal();
 pickerSearch.focus();
});
pickerSearch.addEventListener('input', renderWeaponPicker);
pickerClass.addEventListener('change', renderWeaponPicker);
pickerSearch.addEventListener('keydown', event => {
 if (event.key !== 'ArrowDown' && event.key !== 'Enter') return;
 const first = pickerResults.querySelector('button');
 if (!first) return;
 event.preventDefault();
 if (event.key === 'Enter') first.click();
 else first.focus();
});
pickerResults.addEventListener('keydown', event => {
 if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
 const row = event.target.closest('li');
 if (!row) return;
 event.preventDefault();
 if (event.key === 'ArrowDown') row.nextElementSibling?.querySelector('button')?.focus();
 else (row.previousElementSibling?.querySelector('button') || pickerSearch).focus();
});
pickerResults.addEventListener('click', event => {
 const choice = event.target.closest('[data-pick-weapon]');
 if (!choice) return;
 picker.close();
 if (Number(choice.dataset.pickWeapon) !== state.armament.weaponId) chooseWeapon(choice.dataset.pickWeapon);
 $('#weapon-picker').focus({preventScroll:true});
});
