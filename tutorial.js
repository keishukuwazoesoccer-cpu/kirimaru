/* Local task-based first-use guide. Never uploads or grades work. */
export function createTutorial({view,toast=()=>{},getState,getRosterInfo,isSaving}){
  const $=s=>document.querySelector(s),key='kirimaru.tutorial.seen.v1';
  const launch=document.createElement('button');launch.id='btnTutorial';launch.type='button';launch.textContent='使い方';$('#btnAbout').before(launch);
  const spot=document.createElement('div');spot.id='tutorialSpot';spot.hidden=true;spot.setAttribute('aria-hidden','true');document.body.append(spot);
  const card=document.createElement('section');card.id='tutorialCard';card.hidden=true;card.setAttribute('role','region');card.setAttribute('aria-label','作業に合わせた使い方案内');
  card.innerHTML='<p id="tutorialCount"></p><h2 id="tutorialTitle"></h2><button id="tutorialCollapse" type="button">説明をたたむ</button><p id="tutorialText"></p><p id="tutorialProgress" role="status" aria-live="polite"></p><p class="tutorial-note">作業が終わると次の案内に進みます。次回は自動表示せず、「使い方」で再表示できます。</p><div class="row"><button id="tutorialExit" type="button">案内を終了</button><span class="spacer"></span><button id="tutorialSkip" type="button" hidden>今回は使わない</button><button id="tutorialAction" type="button" class="primary"></button></div>';document.body.append(card);
  const steps=[
    ['import','#btnRoster','最初に、学年の名簿を登録','「名簿」で学年を選び、名簿を保存してください。まだ答案PDFは取り込まなくて大丈夫です。名簿の登録が終わると、答案取り込みの案内へ進みます。'],
    ['import','#drop','答案PDFを取り込む','名簿を保存した学年のテストへ、答案PDFをドラッグするか選んで取り込みます。複数クラスの名簿がある場合は、先に取り込むクラス名も入力してください。取り込み前のプレビューを確認します。'],
    ['import','#pps','1人分のページ数を確認','生徒1人の答案が何ページあるか確認してください。2ページを左右にまとめて1ページとして取り込んだ場合は「1」です。設定と人数が合ったら確認ボタンを押します。'],
    ['import','#studentTable','氏名と答案の対応を確認','先に登録した名簿を使います。未入力なら名簿を当てはめるか貼り付け、答案の順番と氏名が合っていることを確認してください。すでに入っている氏名を、もう一度入力する必要はありません。'],
    ['import','#btnTpl','白紙の解答用紙を追加（任意）','同じ形式の白紙PDFを追加すると、枠を見つけやすくなります。取り込みが終わると次へ進みます。ない場合は「今回は使わない」で進めます。'],
    ['import','#btnKey','模範解答を追加（任意）','模範解答は白紙とは別に登録します。採点中に見比べられます。取り込みが終わると次へ進みます。使わない場合はスキップできます。'],
    ['setup','#setupWrap','解答欄・番号・配点を設定','端末内で枠を提案し、候補を選んで追加するか、用紙をドラッグして囲みます。必要な枠・大問と小問の番号・配点を確認し、確認ボタンを押してください。'],
    ['grade','#view-grade','採点する','答案を見て○×や部分点を入力します。全員・全問の採点が終わるまで、この案内で待ちます。コメントや「あとで確認」も使えます。'],
    ['check','#view-check','最終確認する','氏名・答案全体・得点を確認し、「あとで確認」を解消して、生徒ごとに確認済みにします。全員の確認が終わると出力へ進みます。'],
    ['summary','#btnXlsx','集計結果を書き出す','Excelまたは返却用PDFなどを書き出してください。ダウンロードを始めただけでは保存完了とは限らないため、保存先にファイルがあることも確認します。'],
    ['import','#btnExportProj','最後にバックアップを保存','バックアップを保存し、保存先にファイルがあることを確認してください。入力を追加した場合は、最新の内容でもう一度保存します。']
  ];
  let active=false,index=0,frame=0,checking=false,again=false,autoPending=true,compact=false,projectId='',info=null,acks={},outputIntent=null,outputStarted=false,outputRevision=null,waitTimer=null;
  const hidden=(el,v)=>{if(el.hidden!==v)el.hidden=v};const text=(id,v)=>{if($(id).textContent!==v)$(id).textContent=v};
  const seen=()=>{try{if(localStorage.getItem(key)==='1')return true}catch{}try{return sessionStorage.getItem(key)==='1'}catch{return false}};
  function remember(){try{localStorage.setItem(key,'1');return}catch{}try{sessionStorage.setItem(key,'1')}catch{toast('案内の表示済み状態を保存できません。この画面では終了できます。',6000)}}
  const paused=()=>!!$('dialog[open],#busy.on,#webLocked,#stopScreen');
  function target(){let el=$(steps[index][1]);if(index===3)el=$('#studentTable')?.closest('.card');return el;}
  function position(){frame=0;if(!active)return;const pause=paused();hidden(card,pause);if(pause){hidden(spot,true);return;}const el=target();if(!el||!el.getClientRects().length){hidden(spot,true);card.style.left='8px';card.style.top='8px';return;}const r=el.getBoundingClientRect(),left=Math.max(4,r.left-5),top=Math.max(4,r.top-5),right=Math.min(innerWidth-4,r.right+5),bottom=Math.min(innerHeight-4,r.bottom+5);hidden(spot,right<=left||bottom<=top);if(!spot.hidden)Object.assign(spot.style,{left:left+'px',top:top+'px',width:(right-left)+'px',height:(bottom-top)+'px'});const cr=card.getBoundingClientRect(),x=Math.max(8,Math.min(innerWidth-cr.width-8,r.left)),below=bottom+12,above=top-cr.height-12,y=below+cr.height<innerHeight-8?below:above>=8?above:Math.max(8,innerHeight-cr.height-8);Object.assign(card.style,{left:x+'px',top:y+'px'});}
  function schedule(){if(active&&!frame)frame=requestAnimationFrame(position);}
  function fold(value){compact=value;hidden($('#tutorialText'),compact);hidden(card.querySelector('.tutorial-note'),compact);text('#tutorialCollapse',compact?'説明を開く':'説明をたたむ');schedule();}
  const qs=s=>s.regions.filter(q=>q.type==='q');
  const gradesDone=s=>!!s.students.length&&!!qs(s).length&&s.students.every(st=>qs(s).every(q=>{const v=s.scores[st.id]?.[q.id]?.s;return Number.isFinite(v)&&v>=0&&v<=q.max}));
  const reviewed=s=>gradesDone(s)&&s.students.every(st=>s.checked?.[st.id]&&qs(s).every(q=>!s.scores[st.id]?.[q.id]?.review));
  function validPoints(s){const q=qs(s),keys=q.map(r=>String(r.dai??'')+'/'+String(r.sho??r.label??''));return q.length>0&&q.every(r=>Number.isFinite(r.max)&&r.max>0)&&new Set(keys).size===keys.length&&(s.expectedMax==null||Math.abs(q.reduce((n,r)=>n+r.max,0)-s.expectedMax)<1e-8);}
  function completed(s){switch(index){case 0:return !!info?.grade&&info.rows.length>0||s.students.length>0&&s.students.every(st=>String(st.name||'').trim());case 1:return s.students.length>0;case 2:return acks.pages;case 3:return acks.names&&s.students.every(st=>String(st.name||'').trim());case 4:return !!s.template?.pages.length||acks.blank;case 5:return !!s.key?.pages.length||acks.model;case 6:return acks.frames&&validPoints(s);case 7:return gradesDone(s);case 8:return reviewed(s);case 9:return acks.output;case 10:return acks.backup&&s.backupExportedAt&&s.backupExportedAt>=(s.changedAt||0);default:return false;}}
  function controls(s){const names=s.students.filter(st=>!String(st.name||'').trim()).length,q=qs(s);let label='',disabled=false,status='';
    switch(index){case 0:label='名簿を登録する';status=info?.grade?`${info.grade}の名簿：${info.rows.length}人`:'学年を選んで名簿を登録してください。';break;
    case 1:label='答案PDFを選ぶ';break;case 2:label='ページ数を確認しました';disabled=!s.students.length||s.pages.length%s.pagesPerStudent!==0;status=`現在：1人${s.pagesPerStudent}ページ・${s.students.length}人`;break;
    case 3:label=names?'名簿を貼り付ける':'氏名と答案の対応を確認しました';status=names?`氏名が未入力：${names}人`:`氏名は入力済みです。名簿${info?.rows.length||0}人／答案${s.students.length}人の対応を確認してください。`;break;
    case 4:label='白紙PDFを選ぶ';break;case 5:label='模範解答PDFを選ぶ';break;
    case 6:label=q.length?'枠・番号・配点を確認しました':'端末内で枠を提案する';disabled=q.length>0&&(!validPoints(s)||!!$('#candBar')?.getClientRects().length);status=`登録した問題の枠：${q.length}件${disabled?'。候補の追加や配点・番号を確認してください。':''}`;break;
    case 7:label='採点欄に移動';status=`採点済み：${s.students.reduce((n,st)=>n+q.filter(r=>s.scores[st.id]?.[r.id]?.s!=null).length,0)} / ${s.students.length*q.length}欄`;break;
    case 8:label='確認画面に移動';status=`確認済み：${s.students.filter(st=>s.checked?.[st.id]).length} / ${s.students.length}人`;break;
    case 9:label=outputStarted?'ファイルの保存を確認しました':'Excelを書き出す';status=outputStarted?'保存先に実ファイルがあることを確認してください。':'書き出しが完了するまで待ちます。';break;
    case 10:label=s.backupExportedAt&&s.backupExportedAt>=(s.changedAt||0)?'バックアップの保存を確認しました':'バックアップを保存する';status='保存先のファイルも確認してください。';break;}
    text('#tutorialAction',label);$('#tutorialAction').disabled=disabled;text('#tutorialProgress',status);hidden($('#tutorialSkip'),index!==4&&index!==5);
  }
  function show(){view(steps[index][0]);text('#tutorialCount',`使い方 ${index+1} / ${steps.length}`);text('#tutorialTitle',steps[index][2]);text('#tutorialText',steps[index][3]);fold(false);hidden(card,false);controls(getState());target()?.scrollIntoView({block:'center',inline:'nearest',behavior:'auto'});position();$('#tutorialAction').focus({preventScroll:true});}
  function finish(done=false){active=false;clearTimeout(waitTimer);waitTimer=null;if(frame)cancelAnimationFrame(frame);frame=0;hidden(card,true);hidden(spot,true);launch.focus({preventScroll:true});if(done)toast('基本の作業が完了しました。保存先のファイルを保管してください。',7000);}
  async function check(){if(!active||paused()){schedule();return;}if(checking){again=true;return;}checking=true;try{let s=getState();if(s.id!==projectId){projectId=s.id;index=0;acks={};info=null;outputStarted=false;show();}if(index>2&&!s.students.length){index=s.pages.length?2:1;acks={};outputStarted=false;show();}
      if(index>7&&!gradesDone(s)){index=7;acks.output=false;outputStarted=false;show();}else if(index>8&&!reviewed(s)){index=8;acks.output=false;outputStarted=false;show();}
      if(index>=9&&outputStarted&&outputRevision!==(s.changedAt||0)){outputStarted=false;acks.output=false;acks.backup=false;if(index>9){index=9;show();}}
      const id=s.id;info=await getRosterInfo?.();if(!active||getState().id!==id)return;s=getState();if(isSaving?.()){controls(s);schedule();if(!waitTimer)waitTimer=setTimeout(()=>{waitTimer=null;check()},120);return;}if(completed(s)){if(index===steps.length-1){finish(true);return;}index++;show();again=true;}else controls(s);schedule();}finally{checking=false;if(again){again=false;setTimeout(check,0)}}}
  function start(){if(document.documentElement.dataset.kirimaruReady!=='1')return;if(typeof getState!=='function'||typeof getRosterInfo!=='function'){autoPending=false;toast('使い方案内を更新しました。ページを再読み込みしてから「使い方」を開いてください。',8000);return;}if(active||paused())return;autoPending=false;remember();active=true;index=0;acks={};outputStarted=false;projectId=getState().id;show();check();}
  $('#tutorialAction').onclick=()=>{const s=getState();switch(index){case 0:$('#btnRoster').click();break;case 1:$('#pdfInput').click();break;case 2:if(s.students.length&&s.pages.length%s.pagesPerStudent===0)acks.pages=true;break;case 3:if(s.students.some(st=>!String(st.name||'').trim()))$('#btnPasteNames').click();else acks.names=true;break;case 4:$('#tplInput').click();break;case 5:$('#keyInput').click();break;case 6:if(!qs(s).length)$('#btnDetect').click();else if(validPoints(s))acks.frames=true;break;case 7:view('grade');$('#grid').focus({preventScroll:true});break;case 8:view('check');break;case 9:if(outputStarted)acks.output=true;else{view('summary');$('#btnXlsx').click();}break;case 10:if(s.backupExportedAt&&s.backupExportedAt>=(s.changedAt||0))acks.backup=true;else $('#btnExportProj').click();break;}setTimeout(check,0)};
  $('#tutorialSkip').onclick=()=>{if(index===4)acks.blank=true;if(index===5)acks.model=true;check()};$('#tutorialCollapse').onclick=()=>fold(!compact);$('#tutorialExit').onclick=()=>finish();launch.onclick=start;
  document.addEventListener('keydown',e=>{if(active&&e.key==='Escape'&&!$('dialog[open]')){e.preventDefault();e.stopImmediatePropagation();finish()}},true);
  document.addEventListener('click',e=>{if(!active)return;const id=e.target.closest('button')?.id;const ext={btnXlsx:'xlsx',exportOk:'xlsx',btnReturnPdf:'pdf',btnCsvTally:'csv'}[id];if(ext&&index===9)outputIntent={id:getState().id,ext};setTimeout(check,0)},true);
  window.addEventListener('kirimaru-download',e=>{if(active&&index===9&&outputIntent?.id===getState().id&&String(e.detail?.name||'').toLowerCase().endsWith('.'+outputIntent.ext)){outputStarted=true;outputRevision=getState().changedAt||0;check()}});
  document.addEventListener('pointerdown',e=>{if(active&&!card.contains(e.target)&&!$('dialog[open]'))fold(true)},true);
  document.addEventListener('change',()=>setTimeout(check,0),true);document.addEventListener('input',()=>setTimeout(check,0),true);
  function auto(){if(autoPending&&document.documentElement.dataset.kirimaruReady==='1'&&!paused()){if(seen())autoPending=false;else start();}schedule();if(active)setTimeout(check,0);}
  new MutationObserver(auto).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','hidden','class']});window.addEventListener('kirimaru-ready',()=>setTimeout(auto,0));window.addEventListener('resize',schedule);document.addEventListener('scroll',schedule,true);setTimeout(auto,0);
  return {start,finish};
}
