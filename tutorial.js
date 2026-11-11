/* A local, once-per-browser guided tour. No uploads or automatic grading/roster edits. */
export function createTutorial({view,toast=()=>{}}){
  const key='kirimaru.tutorial.seen.v1',$=s=>document.querySelector(s);
  const button=document.createElement('button');button.id='btnTutorial';button.type='button';button.textContent='使い方';$('#btnAbout').before(button);
  const spot=document.createElement('div');spot.id='tutorialSpot';spot.hidden=true;spot.setAttribute('aria-hidden','true');document.body.append(spot);
  const card=document.createElement('section');card.id='tutorialCard';card.hidden=true;card.setAttribute('role','region');card.setAttribute('aria-label','キリマルの使い方案内');
  card.innerHTML='<p id="tutorialCount"></p><h2 id="tutorialTitle"></h2><p id="tutorialText"></p><p class="tutorial-note">この案内は初回だけ表示します。あとから上部の「使い方」で見直せます。</p><div class="row"><button id="tutorialExit" type="button">案内を終了</button><span class="spacer"></span><button id="tutorialPrev" type="button">戻る</button><button id="tutorialNext" type="button" class="primary">次へ</button></div>';document.body.append(card);
  const steps=[
    ['import','#drop','① 答案PDFを取り込む','生徒の答案PDFをここへドラッグするか、クリックして選びます。取り込み前のプレビューで向き・ページ順を確認します。今は用紙がなくても「次へ」で操作場所を確認できます。'],
    ['import','#pps','② 1人分のページ数を確認','生徒1人の答案が何ページあるかを指定します。2ページを左右にまとめて1ページとして取り込んだ場合は「1」です。氏名や採点を入力する前に確認しましょう。'],
    ['import','#studentTable','③ 名簿と答案を対応させる','生徒名簿へ氏名を入力するか、「名簿を貼り付け」を使います。PDFの順番と氏名が合っているか確認してください。用紙が未登録のときは、このカードで名簿を登録します。'],
    ['import','#btnTpl','④ 白紙の解答用紙を追加','同じ形式の白紙PDFがあると枠を見つけやすくなります。模範解答は、その下の別の欄へ入れます。どちらもドラッグして追加できます。'],
    ['setup','#btnDetect','⑤ 解答欄を設定','「端末内で枠を提案」で候補を出し、不要な候補を外して追加します。答案上をドラッグして手動でも囲めます。番号・配点を確認してください。外部AIの使用は必須ではありません。'],
    ['grade','#grid','⑥ 先生が採点する','解答欄ごとの答案を見比べ、○×や部分点を入力します。小問メモ、答案コメント、「あとで確認」、元に戻す・やり直すも利用できます。答案が未登録のときは、先に①で取り込みます。'],
    ['check','#tabs [data-v="check"]','⑦ 最終確認','答案全体と氏名・得点を確認し、「あとで確認」を解消して、確認済みにします。採点しただけでは最終確認の完了にはなりません。'],
    ['summary','#btnXlsx','⑧ 集計して出力','配点と得点を確認し、必要なExcelや返却用PDFを出力します。氏名や点数を含むファイルの保存先・渡す相手を確認してください。'],
    ['import','#btnExportProj','⑨ バックアップを保存','作業の終わりにバックアップも保存します。再開・復元に使えるよう、学校が認めた場所で保管してください。これで案内は完了です。']
  ];
  let active=false,index=0,returnFocus=null,autoPending=true,frame=0,oldView=null;
  const seen=()=>{try{if(localStorage.getItem(key)==='1')return true}catch{}try{return sessionStorage.getItem(key)==='1'}catch{return false}};
  function remember(){try{localStorage.setItem(key,'1');return}catch{}try{sessionStorage.setItem(key,'1')}catch{toast('案内の表示済み状態を保存できません。この画面では案内を終了できます。',6000)}}
  const hidden=(el,value)=>{if(el.hidden!==value)el.hidden=value};
  function target(){let el=$(steps[index][1]);if(index===2&&!el?.querySelector('input'))el=$('#btnPasteNames')?.closest('.card');if(index===5&&!el?.children.length)el=$('#view-grade');return el;}
  function position(){frame=0;if(!active)return;const paused=!!$('dialog[open],#webLocked,#stopScreen');hidden(card,paused);if(paused){hidden(spot,true);return;}const el=target();if(!el||!el.getClientRects().length){hidden(spot,true);card.style.left='12px';card.style.top='12px';return;}const r=el.getBoundingClientRect(),pad=5,left=Math.max(4,r.left-pad),top=Math.max(4,r.top-pad),right=Math.min(innerWidth-4,r.right+pad),bottom=Math.min(innerHeight-4,r.bottom+pad);if(right<=left||bottom<=top){hidden(spot,true)}else{hidden(spot,false);Object.assign(spot.style,{left:left+'px',top:top+'px',width:(right-left)+'px',height:(bottom-top)+'px'})}const cr=card.getBoundingClientRect(),x=Math.max(8,Math.min(innerWidth-cr.width-8,r.left)),below=bottom+12,above=top-cr.height-12;const y=below+cr.height<innerHeight-8?below:above>=8?above:Math.max(8,innerHeight-cr.height-8);Object.assign(card.style,{left:x+'px',top:y+'px'});}
  function schedule(){if(active&&!frame)frame=requestAnimationFrame(position);}
  function show(){const step=steps[index];view(step[0]);$('#tutorialCount').textContent=`使い方 ${index+1} / ${steps.length}`;$('#tutorialTitle').textContent=step[2].replace(/^[①-⑨]\s*/, '');$('#tutorialText').textContent=step[3];$('#tutorialPrev').disabled=index===0;$('#tutorialNext').textContent=index===steps.length-1?'完了':'次へ';hidden(card,false);hidden(spot,false);target()?.scrollIntoView({block:'center',inline:'nearest',behavior:'auto'});position();$('#tutorialNext').focus({preventScroll:true});}
  function finish(){if(!active)return;active=false;if(frame)cancelAnimationFrame(frame);frame=0;hidden(card,true);hidden(spot,true);if(oldView)view(oldView);if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});}
  function start(){if(active||$('dialog[open],#webLocked,#stopScreen'))return;autoPending=false;remember();returnFocus=document.activeElement;oldView=$('#tabs button.active')?.dataset.v||'import';active=true;index=0;show();}
  button.onclick=start;$('#tutorialNext').onclick=()=>{if(index===steps.length-1)finish();else{index++;show()}};$('#tutorialPrev').onclick=()=>{if(index>0){index--;show()}};$('#tutorialExit').onclick=finish;
  document.addEventListener('keydown',e=>{if(active&&e.key==='Escape'&&!$('dialog[open]')){e.preventDefault();e.stopImmediatePropagation();finish()}},true);
  function auto(){if(autoPending&&document.documentElement.dataset.kirimaruReady==='1'&&!$('dialog[open],#webLocked,#stopScreen')){if(seen())autoPending=false;else start();}schedule();}
  const observer=new MutationObserver(auto);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','hidden','class']});window.addEventListener('kirimaru-ready',()=>setTimeout(auto,0));window.addEventListener('resize',schedule);document.addEventListener('scroll',schedule,true);setTimeout(auto,0);
  return {start,finish};
}
