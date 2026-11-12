import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeState,calculate,vesselsFor,canFit} from '../src/engine.mjs';
import {optimizeWeapon} from '../src/optimizer.mjs';
const D=JSON.parse(fs.readFileSync(new URL('../src/data.json',import.meta.url)));
test('optimizer ranks valid owned builds and never reuses a relic',async()=>{
 const s=makeState(), e=D.effects.find(x=>x.name==='Strength +3'&&x.standardRandom);
 const relics=['red','blue','yellow','green'].map((color,i)=>({name:color,color,type:'standard',effects:[e.id],ownedId:String(i)}));
 const results=await optimizeWeapon(D,s,relics,'ar');
 assert.ok(results.length);assert.ok(results[0].score>=results.at(-1).score);
 for(const r of results){const vessel=vesselsFor(D,s.character)[r.state.vessel];const equipped=r.state.slots.filter(Boolean);assert.equal(new Set(equipped.map(x=>x.ownedId)).size,equipped.length);r.state.slots.forEach((x,i)=>{if(x)assert.ok(canFit(x,vessel.slots[i],i>=3));});assert.ok(!calculate(D,r.state).ledger.some(x=>x.status==='invalid'));}
 assert.ok(results[0].arm.modified.total>=results[0].arm.baseline.total);
});
