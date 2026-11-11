/* Public Web helpers. No AI calls, image sorting or model-answer annotation. */
export function auditPoints(s) {
  const qs=s.regions.filter(q=>q.type==='q'), issues=[], seen=new Set();let total=0;
  for(const q of qs){
    const name=String(q.label||'番号なし');
    if(!Number.isFinite(q.max)||q.max<=0)issues.push(`${name}：配点を確認してください`);else total+=q.max;
    const key=q.dai!=null&&String(q.dai)!==''?`${q.dai}/${q.sho??''}`:name.trim();
    if(seen.has(key))issues.push(`${name}：問題番号が重複しています`);seen.add(key);
    if(q.partialPresets?.some(p=>!Number.isFinite(p.score)||p.score<0||p.score>q.max))issues.push(`${name}：部分点ボタンが配点の範囲外です`);
  }
  if(s.expectedMax!=null&&Math.abs(total-s.expectedMax)>1e-8)issues.push(`満点 ${s.expectedMax}点と配点合計 ${total}点が一致しません`);
  return {total,issues,count:qs.length};
}
const clone=v=>v==null?v:structuredClone(v);
export function createScoreHistory(getState,changed){
  let group=null;
  const journal=()=>{const s=getState();return s.scoreJournal??=( {past:[],future:[]} )};
  function commit(entries,label){if(!entries.length)return;const j=journal();j.past.push({at:Date.now(),label,entries});if(j.past.length>100)j.past.shift();j.future=[];}
  return {
    record(sid,rid,before,after,checked){if(JSON.stringify(before)===JSON.stringify(after))return;const item={sid,rid,before:clone(before),after:clone(after),checked:!!checked};if(group)group.entries.push(item);else commit([item],'採点を変更');},
    begin(label){group={label,entries:[]}}, end(){if(group){commit(group.entries,group.label);group=null}},
    move(redo=false){const s=getState(),j=journal(),from=redo?j.future:j.past,to=redo?j.past:j.future;if(!from.length)return false;const action=from[from.length-1];
      if(!Array.isArray(action.entries)||action.entries.some(e=>!s.students.some(st=>st.id===e.sid)||!s.regions.some(q=>q.id===e.rid)))throw Error('答案・設問が変更されたため、この操作は戻せません');
      for(const e of action.entries){const value=redo?e.after:e.before,q=s.regions.find(q=>q.id===e.rid);if(value?.s!=null&&(!Number.isFinite(value.s)||value.s<0||value.s>q.max))throw Error('現在の配点では戻せません。配点を確認してください');}
      from.pop();for(const e of (redo?action.entries:[...action.entries].reverse())){s.scores[e.sid]??={};const value=clone(redo?e.after:e.before);if(value==null)delete s.scores[e.sid][e.rid];else s.scores[e.sid][e.rid]=value;if(s.checked)delete s.checked[e.sid];}to.push(action);changed();return true;
    }, get(){return journal()}
  };
}
export function createWebTools(b){
  const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const history=createScoreHistory(b.state,()=>{b.save();b.redraw();refresh()});
  const node=(tag,id,parent)=>{const n=document.createElement(tag);n.id=id;parent.append(n);return n};
  const guide=node('div','webGuide',$('#tabs').parentElement);$('#tabs').before(guide);guide.className='web-toolbox';
  const rosterNotice=node('div','webRosterNotice',guide.parentElement);guide.after(rosterNotice);rosterNotice.className='web-toolbox';rosterNotice.setAttribute('role','status');rosterNotice.hidden=true;
  function openRosterEntry(paste=false){b.view('import');if(paste){$('#btnPasteNames').click();return;}const table=$('#studentTable');table.closest('.card').scrollIntoView({block:'center',behavior:'smooth'});const empty=[...table.querySelectorAll('input.nm')].find(e=>!e.value.trim());empty?.focus({preventScroll:true});}
  const panel=node('div','webPoints',$('#setupCanvasBox'));panel.className='web-toolbox';$('#setupCanvasBox').prepend(panel);
  const backup=node('p','webBackup',$('#btnExportProj').parentElement.parentElement);backup.className='help';
  const grade=node('div','webGrading',$('#grid').parentElement);$('#grid').before(grade);grade.className='web-toolbox';
  grade.innerHTML='<div class="row"><button id="webUndo">↶ 元に戻す</button><button id="webRedo">↷ やり直す</button><button id="webHistory">変更履歴</button><button id="webQuestion">小問のメモ・部分点設定</button><button id="webAnswer">選択した答案のコメント</button></div><div id="webPartial" class="row"></div>';
  const summary=node('div','webSummary',$('#view-summary .pad'));summary.className='web-toolbox';$('#view-summary .pad').prepend(summary);
  const dlg=node('dialog','webDialog',document.body);dlg.className='web-dialog';
  const preview=node('dialog','webPdfPreview',document.body);preview.className='web-dialog';
  dlg.addEventListener('keydown',e=>e.stopPropagation());preview.addEventListener('keydown',e=>e.stopPropagation());
  let pending=false,storageText='';
  navigator.storage?.estimate?.().then(x=>{if(x.quota)storageText=`端末内の使用量：約${Math.round(x.usage/1048576)}MB / ${Math.round(x.quota/1048576)}MB${x.usage/x.quota>.8?'（空き容量に注意）':''}`;refresh()}).catch(()=>{});
  function modal(html,onSave){if(dlg.open)dlg.close();dlg.innerHTML=`<form method="dialog">${html}<div class="row"><button value="cancel">閉じる</button>${onSave?'<button id="webSave" type="button" class="primary">保存</button>':''}</div><p role="alert" id="webError"></p></form>`;dlg.showModal();if(onSave)$('#webSave').onclick=()=>{try{onSave();dlg.close();refresh()}catch(e){$('#webError').textContent=e.message}};}
  function questionDialog(){const q=b.question();if(!q)return b.toast('先に小問を選んでください');modal(`<h2>${esc(q.label)}：小問の設定（任意）</h2><label>先生用の採点メモ<textarea id="webQMemo" maxlength="4000">${esc(q.teacherMemo||'')}</textarea></label><p>先生用のメモは模範解答や返却PDFに印刷しません。</p><label>部分点ボタン（1行に「点数:説明」）<textarea id="webPresets" placeholder="1:式が正しい\n2:計算まで正しい">${esc((q.partialPresets||[]).map(p=>`${p.score}:${p.label}`).join('\n'))}</textarea></label>`,()=>{
    if(!b.state().regions.includes(q))throw Error('テストが変わりました。開き直してください');
    const rows=$('#webPresets').value.split('\n').filter(x=>x.trim());if(rows.length>12)throw Error('部分点ボタンは12個までです');
    const presets=rows.map(row=>{const m=row.match(/^\s*(\d+(?:\.\d+)?)\s*[:：]\s*(.{1,40})\s*$/);if(!m||+m[1]>q.max)throw Error(`0〜${q.max}点の「点数:説明」で入力してください`);return {score:+m[1],label:m[2].trim()}});
    q.teacherMemo=$('#webQMemo').value.trim();q.partialPresets=presets;b.save();
  })}
  function answerDialog(st=b.student(),q=b.question()){
    if(!st||!q)return b.toast('小問と答案を選んでください');const s=b.state(),sc=s.scores[st.id]?.[q.id]||{};
    modal(`<h2>${esc(st.no)} ${esc(st.name)} ／ ${esc(q.label)}</h2><label><input id="webReview" type="checkbox" ${sc.review?'checked':''}> あとで確認する</label><label>この答案へのコメント<textarea id="webComment" maxlength="4000">${esc(sc.comment||'')}</textarea></label><p>このコメントは端末内とバックアップに保存します。返却PDF・模範解答には自動で印刷しません。コメント一覧CSVに書き出せます。</p>`,()=>{if(b.state()!==s)throw Error('テストが変わりました。開き直してください');b.meta(st.id,q.id,{comment:$('#webComment').value.trim(),review:$('#webReview').checked});b.redraw();});
  }
  function move(redo){try{history.move(redo);refresh()}catch(e){b.toast(e.message,6000)}}
  $('#webUndo').onclick=()=>move(false);$('#webRedo').onclick=()=>move(true);$('#webQuestion').onclick=questionDialog;$('#webAnswer').onclick=()=>answerDialog();
  $('#webHistory').onclick=()=>{const j=history.get();modal(`<h2>採点の変更履歴</h2><p>このテストの直近100操作を保存します。一括採点も1操作として戻せます。戻した後に採点を変更すると、やり直し履歴は消えます。</p><ol>${[...j.past].reverse().map(a=>`<li>${esc(new Date(a.at).toLocaleString('ja-JP'))} ${esc(a.label)}（${a.entries.length}件）</li>`).join('')}</ol>`)};
  function refresh(){const s=b.state(),a=auditPoints(s),q=b.question(),st=b.student(),sc=st&&q?s.scores[st.id]?.[q.id]:null;
    guide.innerHTML='<span>準備 → 採点 → 確認・出力</span> <button id="webNext" class="primary"></button>';
    const missingNames=s.students.filter(st=>!String(st.name??'').trim()).length;
    rosterNotice.hidden=!missingNames;
    rosterNotice.innerHTML=missingNames?`<b>名簿の登録を確認してください</b><span> 氏名が未入力の答案が${missingNames}人分あります。採点・返却の前に、氏名と答案の対応を確認してください。</span> <button id="webRosterEntry">氏名を登録する</button> <button id="webRosterPaste">名簿を貼り付ける</button>`:'';
    if(missingNames){$('#webRosterEntry').onclick=()=>openRosterEntry();$('#webRosterPaste').onclick=()=>openRosterEntry(true);}
    const next=!s.students.length?'import':missingNames?'roster':!a.count?'setup':s.students.some(st=>s.regions.filter(q=>q.type==='q').some(q=>s.scores[st.id]?.[q.id]?.s==null))?'grade':'check';
    $('#webNext').textContent={import:'答案を取り込む',roster:'名簿を登録する',setup:'解答欄を設定する',grade:'採点を続ける',check:'最終確認へ'}[next];$('#webNext').onclick=()=>next==='roster'?openRosterEntry():b.view(next);
    panel.innerHTML=`<details id="webPointDetails"><summary>配点チェック：${a.count}問・合計 ${a.total}点${a.issues.length?' ／ 要確認 '+a.issues.length+'件':''}</summary><label>このテストの満点（任意） <input id="webExpected" type="number" min="0" step="0.5" value="${s.expectedMax??''}"></label><ul>${a.issues.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></details>`;
    $('#webExpected').onchange=e=>{const v=e.target.value.trim();if(v!==''&&(!Number.isFinite(+v)||+v<0))return;e.target.blur();s.expectedMax=v===''?null:+v;b.save();refresh();$('#webPointDetails').open=true};
    backup.textContent=`前回のバックアップ書き出し：${s.backupExportedAt?new Date(s.backupExportedAt).toLocaleString('ja-JP'):'まだありません'}。${!s.backupExportedAt||s.changedAt>s.backupExportedAt?'作業後はファイルにも保存してください。':''} ${storageText} ※ダウンロード先への保存を確認してください。`;
    const j=history.get();$('#webUndo').disabled=!j.past.length;$('#webRedo').disabled=!j.future.length;
    $('#webPartial').innerHTML=q?`<span>選択中：${esc(st?`${st.no} ${st.name}`:'答案なし')} ／ ${esc(q.label)}${sc?.review?' ⚑ あとで確認':''}${sc?.comment?' 💬 コメントあり':''}</span>${(q.partialPresets||[]).filter(p=>Number.isFinite(p.score)&&p.score>=0&&p.score<=q.max).map((p,i)=>`<button data-preset="${i}">${esc(p.label)} ${p.score}点</button>`).join('')}${q.teacherMemo?`<details><summary>先生用メモ</summary><p style="white-space:pre-wrap">${esc(q.teacherMemo)}</p></details>`:''}`:'';
    $('#webPartial').querySelectorAll('[data-preset]').forEach(el=>el.onclick=()=>b.score(q.partialPresets[+el.dataset.preset].score));
    let reviews=0,comments=0;for(const row of Object.values(s.scores))for(const x of Object.values(row)){if(x.review)reviews++;if(x.comment)comments++}
    summary.innerHTML=`<b>出力前の確認</b><p>${a.issues.length?esc(a.issues.join(' ／ ')):'配点チェック：問題は見つかりませんでした'} ／ あとで確認 ${reviews}件 ／ 答案コメント ${comments}件</p><button id="webNotesExport">コメント・確認フラグ一覧をCSV保存</button><p class="help">先生用です。生徒の氏名・コメントを含むため、保存先と共有範囲を確認してください。</p>`;
    $('#webNotesExport').onclick=()=>{const cell=x=>'"'+String(x??'').replace(/^(?:\s*[=+\-@]|[\t\r\n])/,"'$&").replace(/"/g,'""')+'"';const rows=[['クラス','番号','氏名','小問','点数','あとで確認','答案コメント']];for(const st of s.students)for(const q of s.regions.filter(q=>q.type==='q')){const sc=s.scores[st.id]?.[q.id]||{};rows.push([st.cls,st.no,st.name,q.label,sc.s,sc.review?'要確認':'',sc.comment])}b.download(new Blob(['\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),'キリマル_コメント確認一覧.csv')};
  }
  async function preparePDF(files,kind){
    if(pending){b.toast('先の読み込みを完了してください');return null}pending=true;const state=b.state(),groups=[],urls=[];let totalPages=0;
    if(files.length>500||files.reduce((n,f)=>n+f.size,0)>200*1024*1024){pending=false;throw Error('一度に取り込むPDFは合計200MB・500ファイル以下にしてください');}
    try{const lib=await b.getPdfjs();for(const file of files){if(file.size>100*1024*1024)throw Error('PDFは100MB以下に分割してください');const task=lib.getDocument({data:await file.arrayBuffer(),...b.pdfOptions});try{const doc=await task.promise;totalPages+=doc.numPages;if(totalPages>500)throw Error('一度に取り込むPDFは合計500ページ以下に分割してください');const pages=[];for(let i=1;i<=doc.numPages;i++){b.busy('PDFのプレビューを作成中…',`${file.name}：${i}/${doc.numPages}`);const page=await doc.getPage(i);const p=await b.renderPdfPage(page);p.texts=[];if(kind==='template'){const vp=page.getViewport({scale:1}),tc=await b.readText(page);for(const it of tc.items){if(!it.str?.trim())continue;const fh=Math.hypot(it.transform[2],it.transform[3])||it.height,[x,y]=vp.convertToViewportPoint(it.transform[4],it.transform[5]);p.texts.push({s:it.str,x:x/vp.width,y:(y-fh*.88)/vp.height,w:it.width/vp.width,h:fh/vp.height})}}pages.push(p);page.cleanup()}groups.push({name:file.name,pages})}finally{await task.destroy()}}
      b.busy(null);const count=groups.reduce((n,g)=>n+g.pages.length,0);if(!count)throw Error('ページがありません');
      preview.innerHTML=`<h2>${{answers:'答案',template:'白紙の解答用紙',key:'模範解答'}[kind]}：取り込み前の確認</h2><p>日本語・向き・ページ順が正しく表示されているか確認してください。画像は端末内で処理します。</p><label>取り込み方法 <select id="webPdfMode"><option value="original">元のページのまま（${count}ページ）</option><option value="join" ${groups.some(g=>g.pages.length%2)?'disabled':''}>連続する2ページを左右に並べて1ページにする</option></select></label><p id="webPdfCount"></p><div id="webPdfImages"></div><div class="row"><button id="webPdfCancel">キャンセル</button><button id="webPdfConfirm" class="primary">この内容で取り込む</button></div>`;
      const draw=()=>{for(const u of urls)URL.revokeObjectURL(u);urls.length=0;const join=$('#webPdfMode').value==='join';$('#webPdfCount').textContent=`取り込み後：${join?count/2:count}ページ${join?'（左右連結・答案は1人1ページに設定）':''}${groups.some(g=>g.pages.length%2)?'。奇数ページのPDFは左右連結できません。':''}`;const out=$('#webPdfImages');out.innerHTML='';for(const group of groups){const title=document.createElement('h3');title.textContent=group.name;out.append(title);const grid=document.createElement('div');grid.className='web-previews';out.append(grid);group.pages.forEach((p,i)=>{let row;if(!join||i%2===0){row=document.createElement('figure');if(join)row.className='web-pair';grid.append(row)}else row=grid.lastElementChild;const img=document.createElement('img'),u=URL.createObjectURL(p.blob);urls.push(u);img.src=u;img.alt=`${i+1}ページ目`;img.loading='lazy';img.title=`${i+1}ページ目：${p.w}×${p.h}`;row.append(img)})}};
      draw();preview.showModal();const selected=await new Promise(resolve=>{preview.onclose=()=>resolve(null);preview.oncancel=e=>{e.preventDefault();resolve(null)};$('#webPdfCancel').onclick=()=>resolve(null);$('#webPdfConfirm').onclick=()=>resolve($('#webPdfMode').value);$('#webPdfMode').onchange=draw});preview.onclose=null;preview.close();if(!selected)return null;if(b.state()!==state)throw Error('テストが変わったため中止しました');
      const out=[];for(const g of groups){if(selected==='original'){out.push(...g.pages);continue}for(let i=0;i<g.pages.length;i+=2){const pair=g.pages.slice(i,i+2),height=Math.max(...pair.map(p=>p.h)),width=pair.reduce((w,p)=>w+p.w*height/p.h,0),scale=Math.min(1,2200/Math.max(width,height)),c=document.createElement('canvas');c.width=Math.round(width*scale);c.height=Math.round(height*scale);const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);let x=0,texts=[];for(const p of pair){const w=p.w*height/p.h,bmp=await createImageBitmap(p.blob);ctx.drawImage(bmp,x*scale,0,w*scale,c.height);bmp.close();texts.push(...p.texts.map(t=>({...t,x:(x+t.x*w)/width,w:t.w*w/width})));x+=w}out.push({w:c.width,h:c.height,texts,blob:await new Promise((resolve,reject)=>c.toBlob(x=>x?resolve(x):reject(Error('画像を生成できませんでした')),'image/jpeg',.92))})}}
      return {pages:out,joined:selected==='join',name:groups.map(g=>g.name).join('、')};
    }finally{b.busy(null);if(preview.open)preview.close();for(const u of urls)URL.revokeObjectURL(u);preview.replaceChildren();preview.onclose=null;preview.oncancel=null;pending=false}
  }
  function confirmRestore(s){b.busy(null);return new Promise(resolve=>{modal(`<h2>バックアップの確認</h2><p>テスト：${esc(s.name)} ／ ${s.students.length}人 ／ ${s.regions.filter(q=>q.type==='q').length}問 ／ 答案 ${s.pages.length}ページ</p><p>現在のテストは残し、新しいテストとして追加します。</p><button type="button" id="webRestoreConfirm" class="primary">このバックアップを取り込む</button>`);let done=false;const finish=x=>{if(done)return;done=true;dlg.onclose=null;dlg.close();resolve(x)};dlg.onclose=()=>finish(false);$('#webRestoreConfirm').onclick=()=>finish(true)})}
  for(const [id,kind,input] of [['btnTpl','template','tplInput'],['btnKey','key','keyInput']]){const el=$('#'+id).parentElement;el.classList.add('web-drop');el.addEventListener('dragover',e=>{e.preventDefault();el.classList.add('drag')});el.addEventListener('dragleave',()=>el.classList.remove('drag'));el.addEventListener('drop',e=>{e.preventDefault();el.classList.remove('drag');const files=[...e.dataTransfer.files];if(files.length!==1||!files[0].name.toLowerCase().endsWith('.pdf'))return b.toast('PDFを1つずつ追加してください');b.reference(kind,files[0])});}
  document.addEventListener('keydown',e=>{if(!e.ctrlKey&&!e.metaKey||e.altKey||e.target.closest('input,textarea,[contenteditable="true"]')||document.querySelector('dialog[open]'))return;if(e.key.toLowerCase()==='z'){e.preventDefault();move(e.shiftKey)}});
  return {history,refresh,preparePDF,confirmRestore,answerDialog};
}
