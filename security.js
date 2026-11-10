/* Untrusted project files must be validated before storage or rendering. */
export const safeId = id => typeof id==='string' && /^[a-zA-Z0-9_-]{1,100}$/.test(id) && !['__proto__','prototype','constructor'].includes(id);
const object = x => x!==null && typeof x==='object' && !Array.isArray(x);
export function validateProject(st,{templateOnly=false}={}) {
  let nodes=0;function walk(x,depth=0){if(depth>40||++nodes>1500000)throw Error('バックアップが複雑すぎます');if(x&&typeof x==='object')for(const k of Object.keys(x)){if(['__proto__','prototype','constructor'].includes(k))throw Error('不正なバックアップです');walk(x[k],depth+1)}}walk(st);
  if(!object(st)||!Array.isArray(st.pages)||!Array.isArray(st.students)||!Array.isArray(st.regions)||!object(st.scores))throw Error('バックアップ形式が不正です');
  const pps=templateOnly?8:st.pagesPerStudent;
  if(!Number.isInteger(pps)||pps<1||pps>8||st.pages.length>2000||st.students.length>2000||st.regions.length>5000)throw Error('人数・ページ数・設問数が範囲外です');
  for(const k of ['name','grade','subject','lastCls'])if(st[k]!=null&&(typeof st[k]!=='string'||st[k].length>1000))throw Error('テスト情報が不正です');
  const meta=new Map(),pageIds=new Set();for(const [kind,pages] of [['pages',st.pages],['template',st.template?.pages||[]],['key',st.key?.pages||[]]]){
    if(!Array.isArray(pages)||pages.length>2000)throw Error('画像情報が不正です');const local=new Set();
    for(const p of pages){if(!object(p)||!safeId(p.id)||local.has(p.id)||!Number.isInteger(p.w)||!Number.isInteger(p.h)||p.w<1||p.h<1||p.w>10000||p.h>10000||p.w*p.h>16000000)throw Error('画像情報が不正です');local.add(p.id);if(meta.has(p.id)&&(meta.get(p.id).w!==p.w||meta.get(p.id).h!==p.h))throw Error('画像情報が重複しています');meta.set(p.id,p);if(kind==='pages')pageIds.add(p.id);
      if(kind==='template'&&p.texts==null)p.texts=[];
      if(p.texts!=null&&(!Array.isArray(p.texts)||p.texts.length>100000||p.texts.some(t=>!object(t)||typeof t.s!=='string'||t.s.length>5000||!['x','y','w','h'].every(k=>Number.isFinite(t[k])))))throw Error('文字情報が不正です');}
  }
  const qids=new Set(),qmap=new Map();for(const q of st.regions){if(!object(q)||!safeId(q.id)||qids.has(q.id)||!['q','name','score','total','kanten'].includes(q.type))throw Error('解答欄ID・種類が不正です');qids.add(q.id);
    if(!['x','y','w','h'].every(k=>Number.isFinite(q[k]))||q.x<0||q.y<0||q.w<=0||q.h<=0||q.x+q.w>1.01||q.y+q.h>1.01||!Number.isInteger(q.page)||q.page<0||q.page>=pps)throw Error('解答欄の範囲が不正です');
    for(const k of ['label','answer','rubric','teacherMemo','of'])if(q[k]!=null&&(typeof q[k]!=='string'||q[k].length>10000))throw Error('解答欄の文字情報が不正です');
    for(const k of ['dai','sho'])if(q[k]!=null&&!(typeof q[k]==='string'&&q[k].length<=200)&&!Number.isFinite(q[k]))throw Error('問題番号が不正です');
    if(q.kanten!=null&&!['知','思','主'].includes(q.kanten))throw Error('観点が不正です');if(q.type==='q'){if(!Number.isFinite(q.max)||q.max<0||q.max>100000)throw Error('配点が不正です');qmap.set(q.id,q)}
    if(q.partialPresets!=null&&(!Array.isArray(q.partialPresets)||q.partialPresets.length>12||q.partialPresets.some(p=>!object(p)||!Number.isFinite(p.score)||p.score<0||p.score>q.max||typeof p.label!=='string'||p.label.length>40)))throw Error('部分点設定が不正です');
  }
  const students=new Set(),used=new Set();for(const s of st.students){if(!object(s)||!safeId(s.id)||students.has(s.id)||!Array.isArray(s.pageIds)||s.pageIds.length!==pps||s.pageIds.some(id=>!pageIds.has(id)||used.has(id))||new Set(s.pageIds).size!==s.pageIds.length)throw Error('名簿の画像参照が不正です');students.add(s.id);s.pageIds.forEach(id=>used.add(id));for(const k of ['no','name','cls'])if(s[k]!=null&&!(typeof s[k]==='string'&&s[k].length<=1000)&&!(k==='no'&&Number.isFinite(s[k])))throw Error('名簿の文字情報が不正です')}
  // A trailing incomplete student may exist in legacy data, but assigned pages must follow PDF order.
  for(let i=0;i<st.students.length;i++)if(st.students[i].pageIds.some((id,j)=>id!==st.pages[i*pps+j]?.id))throw Error('名簿と答案の順序が一致しません');
  for(const [sid,row] of Object.entries(st.scores)){if(!students.has(sid)||!object(row))throw Error('採点結果の参照が不正です');for(const [qid,sc] of Object.entries(row)){if(!qmap.has(qid)||!object(sc))throw Error('採点結果の設問参照が不正です');if(sc.s!=null&&(!Number.isFinite(sc.s)||sc.s<0||sc.s>qmap.get(qid).max))throw Error('点数が範囲外です');if(sc.comment!=null&&(typeof sc.comment!=='string'||sc.comment.length>4000))throw Error('コメントが不正です');if(sc.review!=null&&typeof sc.review!=='boolean')throw Error('確認フラグが不正です')}}
  if(st.expectedMax!=null&&(!Number.isFinite(st.expectedMax)||st.expectedMax<0||st.expectedMax>10000000))throw Error('満点が不正です');
  if(st.pad!=null&&(!Number.isFinite(st.pad)||st.pad<0||st.pad>10))throw Error('切り出し余白が不正です');
  if(st.align!=null){if(!object(st.align))throw Error('位置合わせが不正です');for(const [id,t] of Object.entries(st.align))if(!meta.has(id)||!validTransform(t))throw Error('位置合わせが不正です')}
  if(st.key&&!st.key.align)st.key.align={};
  if(st.key?.align!=null){if(!object(st.key.align))throw Error('模範解答の位置合わせが不正です');for(const [pg,t] of Object.entries(st.key.align))if(!/^\d+$/.test(pg)||+pg>=st.key.pages.length||t!=null&&!validTransform(t))throw Error('模範解答の位置合わせが不正です')}
  if(st.slip!=null){if(!object(st.slip))throw Error('個票設定が不正です');if(st.slip.color!=null&&!/^#[\da-f]{6}$/i.test(st.slip.color))throw Error('個票の色が不正です');if(st.slip.cmSize!=null&&!['s','m','l'].includes(st.slip.cmSize))throw Error('個票の文字サイズが不正です')}
  return true;
}
function validTransform(t){return object(t)&&['ax','ay'].every(k=>Number.isFinite(t[k])&&t[k]>.1&&t[k]<10)&&['bx','by'].every(k=>Number.isFinite(t[k])&&Math.abs(t[k])<2)}
export async function decodeBackupImage(url,meta){
  if(typeof url!=='string'||url.length>32*1024*1024||!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]*={0,2}$/i.test(url))throw Error('画像が不足しているか、対応していないバックアップです');
  const split=url.indexOf(','),bytes=Uint8Array.from(atob(url.slice(split+1)),c=>c.charCodeAt(0)),blob=new Blob([bytes],{type:url.slice(5,url.indexOf(';'))});
  const bmp=await createImageBitmap(blob);try{if(bmp.width!==meta.w||bmp.height!==meta.h)throw Error('画像のサイズと保存情報が一致しません')}finally{bmp.close()}return blob;
}
export async function acquireEditorLock(){
  window.addEventListener('pageshow',e=>{if(e.persisted)location.reload()});
  if(!navigator.locks)return true;let release;
  return new Promise((resolve,reject)=>{navigator.locks.request('kirimaru-web-editor-v1',{ifAvailable:true},async lock=>{if(!lock){resolve(false);return}resolve(true);await new Promise(r=>{release=r;window.addEventListener('pagehide',r,{once:true})})}).catch(reject)});
}
export function validateTemplate(t){
  if(!object(t)||!Number.isInteger(t.pps)||t.pps<1||t.pps>8||typeof t.name!=='string'||t.name.length>1000)throw Error('テンプレートのページ数・名前が不正です');
  validateProject({...t,pages:[],students:[],scores:{},pagesPerStudent:t.pps});
  if(t.refBoxes!=null&&(!Array.isArray(t.refBoxes)||t.refBoxes.length>8||t.refBoxes.some(rows=>!Array.isArray(rows)||rows.length>5000||rows.some(r=>!object(r)||!['x','y','w','h'].every(k=>Number.isFinite(r[k]))||r.w<=0||r.h<=0))))throw Error('テンプレートの枠情報が不正です');
}
