// PC save layout adapted from Metin Çelik's MIT-licensed nightreign-relic-browser.
// See THIRD_PARTY_NOTICES.txt. No save-writing operations are provided.
export function normalizeCollection(input,data){
 const rows=Array.isArray(input)?input:input?.relics;
 if(!Array.isArray(rows)||rows.length>10000)throw Error('Choose a relic collection JSON containing up to 10,000 relics.');
 const fixed=new Map(data.fixedRelics.map(r=>[r.id,r]));
 return rows.map((r,i)=>{
  if(!r||typeof r!=='object'||Array.isArray(r))throw Error(`Relic ${i+1} is invalid.`);
  const f=r.fixedId?fixed.get(String(r.fixedId)):null;
  if(r.fixedId&&!f)throw Error(`Relic ${i+1} has an unknown fixed relic ID.`);
  const color=f?.color||r.color,type=f?'standard':r.type;
  const effects=f?[...f.effects]:r.effects;
  if(!['red','blue','yellow','green'].includes(color)||!['standard','deep'].includes(type)||!Array.isArray(effects)||!effects.length||effects.length>6||effects.some(id=>!/^\d{1,10}$/.test(String(id))))throw Error(`Relic ${i+1} has invalid colour, type or effects.`);
  return {name:String(f?.name||r.name||'My relic').slice(0,80),color,type,effects:effects.map(String),...(f?{fixedId:f.id}:{}),ownedId:String(r.ownedId||`collection-${i}`).slice(0,100)};
 });
}
export function buildFragment(state){return '#b='+btoa(unescape(encodeURIComponent(JSON.stringify(state)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
export function readBuildFragment(hash){
 if(!hash.startsWith('#b='))return null;
 const encoded=hash.slice(3);if(encoded.length>24000)throw Error('Build link is too long.');
 return JSON.parse(decodeURIComponent(escape(atob(encoded.replace(/-/g,'+').replace(/_/g,'/')))));
}
export async function readPcSave(buffer,data,itemMap){
 if(buffer.byteLength>64*1024*1024)throw Error('Save files must be smaller than 64 MB.');
 const raw=new Uint8Array(buffer),view=new DataView(buffer),decoder=new TextDecoder('utf-16le');
 if(raw.length<64||String.fromCharCode(...raw.slice(0,4))!=='BND4')throw Error('Not a supported PC .sl2 or .co2 save. Console saves are not supported.');
 if(!globalThis.crypto?.subtle)throw Error('Save import needs HTTPS and a browser with Web Crypto support.');
 const count=view.getUint32(12,true);
 if(count<11||count>14||64+32*count>raw.length)throw Error('Unsupported save directory.');
 const key=await crypto.subtle.importKey('raw',new Uint8Array([0x18,0xf6,0x32,0x66,0x05,0xbd,0x17,0x8a,0x55,0x24,0x52,0x3a,0xc0,0xa0,0xc6,0x09]),'AES-CBC',false,['decrypt']);
 async function entry(i){
  const p=64+32*i,size=view.getUint32(p+8,true),offset=view.getUint32(p+16,true);
  if(view.getUint32(p,true)!==0x40||view.getUint32(p+4,true)!==0xffffffff||size<32||size%16||offset<64+32*count||offset+size>raw.length)throw Error(`Invalid save entry ${i+1}.`);
  try{return new Uint8Array(await crypto.subtle.decrypt({name:'AES-CBC',iv:raw.slice(offset,offset+16)},key,raw.slice(offset+16,offset+size))).slice(4);}catch{throw Error(`Could not decrypt save entry ${i+1}. The save may be damaged or unsupported.`);}
 }
 function find(bytes,pattern,start=0){outer:for(let i=Math.max(0,start);i<=bytes.length-pattern.length;i++){for(let j=0;j<pattern.length;j++)if(bytes[i+j]!==pattern[j])continue outer;return i;}return -1;}
 const names=await entry(10),slots=[];let cursor=0;
 const fixed=new Map(data.fixedRelics.map(r=>[r.id,r]));
 for(let s=0;s<10;s++){
  const marker=find(names,[0x27,0,0,0x46,0x41,0x43,0x45],cursor);if(marker<0)break;cursor=marker+7;
  const start=marker-51;if(start<0)throw Error('Invalid save profile names.');
  let end=start;while(end+1<marker&&(names[end]||names[end+1]))end+=2;
  const nameBytes=names.slice(start,end),name=decoder.decode(nameBytes);
  if(!name)throw Error('Could not read save profile name.');
  const bytes=await entry(s),v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),namePos=find(bytes,nameBytes);
  if(namePos<132)throw Error(`Could not locate the inventory for save slot ${s+1}.`);
  const lookup=find(bytes,[255,255,255,255],namePos+1000);if(lookup<0)throw Error(`Unsupported inventory layout in save slot ${s+1}.`);
  const limit=namePos-100,relics=[];let skipped=0;
  const sizeAt=p=>p+4<=limit&&[0x80,0x81,0x82,0x83,0x84,0x85].includes(bytes[p+2])?({128:80,144:16,192:80}[bytes[p+3]]||0):0;
  let aligned=-1;
  for(let p=32;p<limit-8;p++){const len=sizeAt(p),next=p+len;if(len&&next<=limit&&(sizeAt(next)||(next+8<=limit&&v.getUint32(next,true)===0&&v.getUint32(next+4,true)===0xffffffff))){aligned=p;break;}}
  if(aligned>=0)for(let p=aligned;p<limit-4;){
   const len=sizeAt(p);if(!len||p+len>limit){p+=p+8<=limit&&v.getUint32(p,true)===0&&v.getUint32(p+4,true)===0xffffffff?8:1;continue;}
   if(bytes[p+3]===0xc0){
    const marker=[...bytes.slice(p,p+4),1,0,0,0];
    if(find(bytes,marker,lookup)>=0){
     const itemId=String(v.getUint32(p+4,true)&0xffffff),f=fixed.get(itemId),meta=f?{...f,type:'standard'}:itemMap[itemId];
     if(meta){
      const effects=[];for(let j=0;j<4;j++){const id=v.getInt32(p+16+4*j,true),curse=v.getInt32(p+56+4*j,true);if(id>0)effects.push(String(id));if(id>0&&curse>0)effects.push(String(curse));}
      if(f||effects.length)relics.push({name:meta.name,color:meta.color,type:meta.type,effects:f?[...f.effects]:effects,...(f?{fixedId:f.id}:{}),ownedId:`slot-${s}-${v.getUint32(p,true)}`});else skipped++;
     }else skipped++;
    }
   }p+=len;
  }
  slots.push({name,index:s,relics,skipped});
 }
 if(!slots.length)throw Error('No readable save profiles found.');
 return slots;
}
