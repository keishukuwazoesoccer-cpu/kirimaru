/* Local-only startup feedback. No diagnostics are sent anywhere. */
(() => {
  let panel;
  window.addEventListener('kirimaru-ready',()=>panel?.remove());
  setTimeout(()=>{
    if(document.documentElement.dataset.kirimaruReady||document.querySelector('#webLocked,#stopScreen'))return;
    panel=document.createElement('section');panel.id='startupHelp';panel.style.cssText='position:fixed;inset:0;background:white;color:#18303c;z-index:99998;padding:32px;overflow:auto';
    const h=document.createElement('h1');h.textContent='起動を確認できませんでした';
    const p=document.createElement('p');p.textContent='初回の読み込みや旧データの引き継ぎには時間がかかる場合があります。しばらく待っても変わらない場合は、最新版のChrome・Edge・Safariと通信状態、ブラウザの保存許可を確認してください。保存済みデータを消す操作は行わず、不具合報告の案内をご覧ください。';
    const reload=document.createElement('button');reload.textContent='再読み込み';reload.onclick=()=>location.reload();const support=document.createElement('a');support.href='./support.html';support.textContent='不具合報告の案内';panel.append(h,p,reload,document.createTextNode(' '),support);document.body.append(panel);
  },15000);
})();
