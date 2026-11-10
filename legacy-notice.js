/* Retain access to old-origin backups; never transfer student data automatically. */
(() => {
  const n=document.createElement('aside');n.id='legacyMigrationNotice';n.style.cssText='padding:10px 18px;background:#fff2c7;color:#332600;font:14px/1.6 sans-serif;flex-shrink:0';
  n.append(document.createTextNode('旧URLを開いています。今後の公式配布先は '));const a=document.createElement('a');a.href='https://zoemon-lab.github.io/kirimaru/';a.rel='noopener noreferrer';a.target='_blank';a.textContent='zoemonlabのキリマル';n.append(a,document.createTextNode(' です。ここに保存した作業は「バックアップを保存」で書き出し、新URLの「バックアップを開く」で取り込めます。自動では移りません。'));document.body.prepend(n);
})();
