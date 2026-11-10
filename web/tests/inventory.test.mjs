import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeCollection,buildFragment,readBuildFragment,readPcSave} from '../src/inventory.mjs';
import {makeState,sanitizeState,calculate} from '../src/engine.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../src/data.json',import.meta.url))),items=JSON.parse(fs.readFileSync(new URL('../src/save-items.json',import.meta.url)));
const sample={name:'My relic',color:'red',type:'standard',effects:['100000'],ownedId:'one'};
test('collection preserves exact effects, drawbacks, duplicates and stable ownership IDs',()=>{
 const rows=[sample,{...sample,ownedId:'two'},{name:'Deep',type:'deep',color:'blue',effects:['100000','9999999'],ownedId:'deep'}];
 assert.deepEqual(normalizeCollection(JSON.parse(JSON.stringify({relics:rows})),data),rows);
});
test('collection rejects malformed files atomically and rebuilds fixed relics from trusted data',()=>{
 for(const input of [{character:'raider'},[sample,{...sample,color:'purple'}],[{...sample,effects:['bad']}],Array(10001).fill(sample)])assert.throws(()=>normalizeCollection(input,data));
 const r=normalizeCollection([{fixedId:'2000',effects:['fake']}],data)[0];assert.deepEqual(r.effects,data.fixedRelics.find(r=>r.id==='2000').effects);assert.equal(r.color,'green');
});
test('build URL round-trips Unicode, full scenario, owned relic IDs and weapon selections',()=>{
 const s=makeState();s.name='Matt 🗡 é';s.slots[0]=sample;s.level=10;s.deep=true;s.counts={'100000':3};s.conditions={'100000':true};s.armament.attackType='jump';
 assert.deepEqual(readBuildFragment(buildFragment(s)),s);assert.equal(sanitizeState(s,data).slots[0].ownedId,'one');assert.equal(readBuildFragment('#armory'),null);assert.throws(()=>readBuildFragment('#b='+'a'.repeat(24001)));
});
test('unknown numeric effect IDs remain visible and prevent silently partial relic calculations',()=>{
 const s=makeState();s.slots[0]={...sample,effects:['9999999']};const clean=sanitizeState(s,data);assert.deepEqual(clean.slots[0].effects,['9999999']);assert.ok(calculate(data,clean).warnings.some(w=>w.message.includes('unavailable')));
});
// A small, generated BND4 fixture avoids distributing anyone's actual save data.
async function fixture(owned=true){
 const plain=Array.from({length:11},()=>new Uint8Array(2600));
 const name=new Uint8Array([84,0,101,0,115,0,116,0]);plain[0].set(name,1000);plain[10].set(name,49);plain[10].set([0x27,0,0,0x46,0x41,0x43,0x45],100);
 const v=new DataView(plain[0].buffer);v.setUint32(32,0xc0800001,true);v.setUint32(36,1000,true); // red random relic
 for(let j=0;j<4;j++){v.setInt32(48+j*4,j===0?100000:-1,true);v.setInt32(88+j*4,-1,true);}
 v.setUint32(112,0,true);v.setUint32(116,0xffffffff,true);plain[0].set([255,255,255,255],2000);if(owned)plain[0].set([1,0,128,192,1,0,0,0],2100);
 const key=await crypto.subtle.importKey('raw',new Uint8Array([0x18,0xf6,0x32,0x66,0x05,0xbd,0x17,0x8a,0x55,0x24,0x52,0x3a,0xc0,0xa0,0xc6,0x09]),'AES-CBC',false,['encrypt']);
 const encrypted=[];for(const p of plain){const b=new Uint8Array(p.length+4);b.set(p,4);const iv=new Uint8Array(16);const cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-CBC',iv},key,b));const entry=new Uint8Array(16+cipher.length);entry.set(cipher,16);encrypted.push(entry);}
 const buffer=new ArrayBuffer(64+32*11+encrypted.reduce((n,b)=>n+b.length,0)),raw=new Uint8Array(buffer),view=new DataView(buffer);raw.set([66,78,68,52]);view.setUint32(12,11,true);let offset=64+32*11;
 encrypted.forEach((entry,i)=>{const p=64+32*i;view.setUint32(p,0x40,true);view.setUint32(p+4,0xffffffff,true);view.setUint32(p+8,entry.length,true);view.setUint32(p+16,offset,true);raw.set(entry,offset);offset+=entry.length;});return buffer;
}
test('PC save importer decrypts locally, selects profiles, excludes sold records and never changes input',async()=>{
 const buffer=await fixture(),before=new Uint8Array(buffer).slice();const slots=await readPcSave(buffer,data,items);assert.equal(slots[0].name,'Test');assert.equal(slots[0].relics.length,1);assert.deepEqual(slots[0].relics[0].effects,['100000']);assert.deepEqual(new Uint8Array(buffer),before);
 assert.equal((await readPcSave(await fixture(false),data,items))[0].relics.length,0);
 // Reject an out-of-bounds entry rather than reading unrelated bytes.
 const malformed=buffer.slice(0);new DataView(malformed).setUint32(64+16,0x7fffffff,true);await assert.rejects(()=>readPcSave(malformed,data,items),/Invalid save entry/);
});
test('save importer rejects wrong containers, truncated files and impossible entry counts',async()=>{
 await assert.rejects(()=>readPcSave(new ArrayBuffer(5),data,items),/supported PC/);
 const b=await fixture();new DataView(b).setUint32(12,9999999,true);await assert.rejects(()=>readPcSave(b,data,items),/directory/);
});

test('the same owned relic cannot contribute from two equipped slots',()=>{const s=makeState();s.vessel=0;const colors=data.vessels.find(v=>v.name==='Raider').vessels[0].slots;s.slots[0]={...sample,color:['any','red','blue','yellow','green'][colors[0]]};s.slots[1]={...sample,color:['any','red','blue','yellow','green'][colors[1]]};assert.ok(calculate(data,s).warnings.some(w=>w.message.includes('owned relic is already equipped')));});
