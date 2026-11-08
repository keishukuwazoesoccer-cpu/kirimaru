/* Web distribution only. This file is not used by the native app. */
(() => {
  'use strict';
  let stopped = false;
  window.kirimaruStopApp = () => {
    if (stopped) return;
    stopped = true;
    document.querySelectorAll('dialog[open]').forEach(d => d.close());
    const exportBackup = document.querySelector('#btnExportProj').onclick;
    for (const el of document.body.children) {
      if (!['SCRIPT'].includes(el.tagName) && !['busy', 'toast'].includes(el.id)) el.hidden = true;
    }
    const screen = document.createElement('section'); screen.id = 'stopScreen';
    screen.style.cssText = 'position:fixed;inset:0;background:white;color:#18303c;padding:40px;z-index:9000;overflow:auto';
    const title = document.createElement('h1'); title.textContent = 'キリマルは一時停止中です';
    const text = document.createElement('p'); text.textContent = '保存済みデータは削除していません。採点や返却を止め、案内をご確認ください。現在のテストはバックアップできます。';
    const backup = document.createElement('button'); backup.id = 'stopBackup'; backup.textContent = '現在のテストのバックアップを保存'; backup.onclick = () => exportBackup();
    const reload = document.createElement('button'); reload.id = 'stopReload'; reload.textContent = '再開状況を確認'; reload.onclick = () => location.reload();
    screen.append(title, text, backup, reload); document.body.append(screen); backup.focus();
  };
  document.addEventListener('click', e => { if (stopped && !e.target.closest('#stopBackup,#stopReload')) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  document.addEventListener('keydown', e => { if (stopped) { e.stopImmediatePropagation(); if (!e.target.closest('#stopBackup,#stopReload')) e.preventDefault(); } }, true);
  window.addEventListener('load', () => {
    const status = document.createElement('p'); status.className = 'help'; status.textContent = '提供：zoemonlab ｜ Web版 2026.11.08 ｜ 手動採点';
    document.querySelector('#moveNotice')?.after(status);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
})();
