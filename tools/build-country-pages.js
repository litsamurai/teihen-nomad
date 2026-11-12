// 国別ページ（検索用の静的ページ）を data/countries.json から生成します。
// 使い方: node tools/build-country-pages.js
// データを直したら、もう一度実行して、country/ と sitemap.xml をコミットしてください。
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const BASE='https://litsamurai.github.io/teihen-nomad/';
const DATA=JSON.parse(fs.readFileSync(path.join(ROOT,'data/countries.json'),'utf8'));
const dn=new Intl.DisplayNames(['ja'],{type:'region'});
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const flag=c=>String.fromCodePoint(...c.split('').map(x=>0x1f1a5+x.charCodeAt(0)));
const CIX=JSON.parse(fs.readFileSync(path.join(ROOT,'data/cities.json'),'utf8'));
const jp=DATA.JP&&DATA.JP.idx;
const rel=i=>(typeof i==='number'&&jp)?Math.round(i/jp*100):null;
const cost=r=>r.cost!=null?r.cost:(r.idx!=null?Math.round((15000+3000*r.idx)/1000)*1000:null);
const yen=n=>n.toLocaleString('ja-JP')+'円';
const nameOf=c=>{try{const n=dn.of(c);return n&&n!==c?n:c}catch(e){return c}};
const indexable=r=>!r.est||!!r.ssrc;
const codes=Object.keys(DATA).sort();
const head=(title,desc,url,noindex)=>`<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
${noindex?'<meta name="robots" content="noindex,follow">':''}
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="article">
<meta property="og:url" content="${url}"><meta property="og:image" content="${BASE}img/og.png"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="../favicon.svg"><link rel="stylesheet" href="style.css"></head><body>
<header><a class="logo" href="../">底辺くんのノマドノート</a><a class="join" href="../#crew">💬 Discordで仲間と繋がる</a></header><main>`;
const MENU=[["fx","💱","両替"],["news","🌏","世界のニュース"],["stays","🏠","穴場の宿"],["market","🛒","マーケット"],["promo","📣","なんでもPR"],["safety","🛡","安全"],["ch","📺","旅YouTuber一覧"],["prep","🎒","準備"],["crew","🤝","仲間・参加"]];
const menuHtml=`<nav class="menu"><h2>📋 ほかのメニュー</h2><div>`+MENU.map(m=>`<a href="../#${m[0]}"><i>${m[1]}</i>${m[2]}</a>`).join("")+`<a href="https://www.anzen.mofa.go.jp/" target="_blank" rel="noopener"><i>🛂</i>渡航情報</a></div></nav>`;
const foot=`</main>${menuHtml}<footer><p><a href="../">ホーム</a>・<a href="../country/">国別の生活費ランキング</a>・<a href="../privacy.html">プライバシーポリシー</a>・<a href="../terms.html">利用規約</a></p><p>掲載情報には、概算・下書き（未検証）が含まれます。渡航前に、必ず公式情報を確認してください。</p></footer></body></html>`;
const sp=s=>String(s).split('｜');
function page(c){
  const r=DATA[c],name=nameOf(c),p=rel(r.idx),b=cost(r),url=`${BASE}country/${c.toLowerCase()}.html`;
  const cmp=p==null?'':(p<100?`日本より約${100-p}%安い`:p>100?`日本より約${p-100}%高い`:'日本と同じくらい');
  const title=`${name}の生活費・物価と治安【ノマド向け】｜底辺くんのノマドノート`;
  const desc=`${name}の物価は日本の${p!=null?'約'+p+'%':'—'}${b?`、月の生活費の目安は約${yen(b)}（指数から計算）`:''}。主な街、グルメ、治安・安全情報をまとめています。${r.est?'※数値は概算（未検証）です。':''}`;
  let h=head(title,desc,url,!indexable(r));
  h+=`<nav class="bc"><a href="../">ホーム</a> › <a href="./">国別の生活費</a> › ${esc(name)}</nav>`;
  h+=`<h1>${flag(c)} ${esc(name)}の生活費・物価と治安</h1>`;
  if(r.note)h+=`<p class="lead">${esc(r.note)}</p>`;
  h+=`<section><h2>物価と月の生活費の目安</h2><div class="kv"><div><span>物価指数（NYC=100）</span><b>${r.idx==null?'—':r.idx}</b></div><div><span>日本を100とすると</span><b>${p==null?'—':p}</b></div><div><span>1か月の目安（1人）</span><b>${b?'約'+yen(b):'—'}</b></div></div>`;
  if(cmp)h+=`<p>物価は、${cmp}目安です（家賃を除く指数）。</p>`;
  if(b){h+=`<table><caption>月の目安の内訳（指数から計算した概算）</caption><tr><th>宿</th><td>約${yen(Math.round(b*.35))}</td></tr><tr><th>食費</th><td>約${yen(Math.round(b*.4))}</td></tr><tr><th>交通</th><td>約${yen(Math.round(b*.08))}</td></tr><tr><th>通信・その他</th><td>約${yen(Math.round(b*.17))}</td></tr></table>`}
  h+=`<p class="src">${r.est?'⚠ この国の物価は、Claudeの概算（未検証）です。':'✅ 出典：'+esc(r.src||'')+(r.date?'（確認日 '+esc(r.date)+'）':'')}<br>月の目安は、物価指数から計算した大まかな値です。実際の費用は、街・宿・暮らし方で大きく変わります。</p></section>`;
  if(r.town&&r.town.length){h+=`<section><h2>🗺 主な街</h2><ul class="list">`+r.town.map(t=>{const a=sp(t);return `<li><b>${esc(a[0])}</b>${a[1]?'<br><span>'+esc(a[1])+'</span>':''}</li>`}).join('')+`</ul><p class="small">街の内容は下書き（未検証）です。</p></section>`}
  if(r.food&&r.food.length){h+=`<section><h2>🍜 グルメ</h2><ul class="list">`+r.food.map(t=>{const a=sp(t);return `<li><b>${esc(a[0])}</b>${a[1]?'<br><span>'+esc(a[1])+'</span>':''}</li>`}).join('')+`</ul></section>`}
  if(r.safety&&r.safety.length){h+=`<section><h2>🛡 治安・安全</h2><ul class="list">`+r.safety.map(t=>{const a=sp(t);return `<li><b>${esc(a[0])}</b>${a[1]?'<br><span>'+esc(a[1])+'</span>':''}${a[2]?'<br><span class="do">対策：'+esc(a[2])+'</span>':''}</li>`}).join('')+`</ul><p class="src">${r.ssrc?'出典：'+esc(r.ssrc):'出典：未確認の下書きです。必ず外務省 海外安全ホームページで確認してください。'}</p></section>`}
  const cs=CIX.cities.filter(x=>x.c===c);if(cs.length){h+=`<section><h2>🏙 街の生活費の目安</h2><ul class="list">`+cs.map(x=>`<li><a href="../city/${x.id}.html"><b>${esc(x.name)}</b></a><br><span>${esc(x.month.label)}</span></li>`).join('')+`</ul></section>`}
  h+=`<section class="cta"><h2>${esc(name)}の最新情報は、旅人に聞こう</h2><p>行った人の声や、最新の様子は、Discordコミュニティで。無料で、見るだけでもOKです。</p><a class="btn" href="../#crew">💬 Discordで仲間と繋がる</a><p><a href="../#wiki">サイトで国の情報を編集・追加する</a></p></section>`;
  h+=`<p class="small">ビザ・入国条件は変わります。渡航前に、<a href="https://www.anzen.mofa.go.jp/" rel="noopener">外務省 海外安全ホームページ</a>と、現地大使館の情報を必ず確認してください。</p>`;
  h+=`<script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"ホーム","item":BASE},{"@type":"ListItem","position":2,"name":"国別の生活費","item":BASE+'country/'},{"@type":"ListItem","position":3,"name":name,"item":url}]})}</script>`;
  return h+foot;
}
fs.mkdirSync(path.join(ROOT,'country'),{recursive:true});
codes.forEach(c=>fs.writeFileSync(path.join(ROOT,'country',c.toLowerCase()+'.html'),page(c)));
// ランキング（一覧）
const rows=codes.filter(c=>DATA[c].idx!=null).sort((a,b)=>DATA[a].idx-DATA[b].idx);
let h=head('国別の生活費・物価ランキング【物価が安い順】｜底辺くんのノマドノート','世界の国と地域を、物価が安い順に並べました。日本との比較、月の生活費の目安、治安・街・グルメの情報へ。確認済みの数値と、概算の数値を区別して表示しています。',BASE+'country/',false);
h+=`<nav class="bc"><a href="../">ホーム</a> › 国別の生活費</nav><h1>🧾 国別の生活費・物価ランキング</h1><p class="lead">物価が安い順です。✅は出典で確認した数値、⚠は概算（未検証）です。</p><p class="small">※物価が安くても、渡航が危険な国があります。行く前に、外務省の<a href="https://www.anzen.mofa.go.jp/" rel="noopener">海外安全ホームページ</a>で、危険情報を必ず確認してください。</p><table class="rank"><tr><th>#</th><th>国</th><th>日本=100</th><th>月の目安</th><th></th></tr>`;
rows.forEach((c,i)=>{const r=DATA[c],b=cost(r);h+=`<tr><td>${i+1}</td><td><a href="${c.toLowerCase()}.html">${flag(c)} ${esc(nameOf(c))}</a></td><td>${rel(r.idx)}</td><td>${b?'約'+yen(b):'—'}</td><td>${r.est?'⚠':'✅'}</td></tr>`});
h+=`</table>`+foot;
fs.writeFileSync(path.join(ROOT,'country/index.html'),h);

// ===== 都市ページ（data/cities.json）=====
const CI=JSON.parse(fs.readFileSync(path.join(ROOT,'data/cities.json'),'utf8'));
const FX=JSON.parse(fs.readFileSync(path.join(ROOT,'data/fx.json'),'utf8'));
const RATE=(FX.rates&&FX.rates.JPY)||158;
const yenU=u=>'約'+(Math.round(u*RATE/1000)*1000).toLocaleString('ja-JP')+'円';
fs.mkdirSync(path.join(ROOT,'city'),{recursive:true});
const chead=(t,d,u,ni)=>head(t,d,u,ni).replace('href="../favicon.svg"><link rel="stylesheet" href="style.css"','href="../favicon.svg"><link rel="stylesheet" href="../country/style.css"').replace('<a class="join" href="../#crew">','<a class="join" href="../#crew">');
CI.cities.forEach(c=>{
  const url=`${BASE}city/${c.id}.html`,cn=nameOf(c.c);
  const rng=c.month.usd[0]===c.month.usd[1]?yenU(c.month.usd[0]):yenU(c.month.usd[0])+'〜'+yenU(c.month.usd[1]);
  const title=`${c.name}の生活費の目安【ノマド向け】｜底辺くんのノマドノート`;
  const desc=`${c.name}（${cn}）の月の生活費の目安は${rng}。家賃、食事、ネット代などの目安と、出典・信頼度を載せています。`;
  let h=chead(title,desc,url,!c.index);
  h+=`<nav class="bc"><a href="../">ホーム</a> › <a href="./">街ガイド</a> › ${esc(c.name)}</nav><h1>${flag(c.c)} ${esc(c.name)}の生活費の目安</h1>`;
  h+=`<section><h2>月の目安</h2><div class="kv" style="grid-template-columns:1fr"><div><span>${esc(c.month.label)}</span><b>${rng}</b></div></div><p class="small">円換算は、1ドル=${Math.round(RATE)}円の目安です。実際のレートとは違います。</p>`;
  h+=`<table>`+c.items.map(i=>`<tr><th>${esc(i[0])}</th><td style="white-space:normal">${esc(i[1])}</td></tr>`).join('')+`</table>`;
  h+=`<p class="src">信頼度：${esc(c.grade)}<br>出典：${c.src.map(s=>`<a href="${esc(s[1])}" rel="noopener nofollow">${esc(s[0])}</a>`).join('、')}（取得日 ${esc(CI.retrieved)}）</p></section>`;
  h+=`<section><p><a href="../country/${c.c.toLowerCase()}.html">${flag(c.c)} ${esc(cn)}の物価・治安を見る</a></p></section>`;
  h+=`<section class="cta"><h2>${esc(c.name)}の最新情報は、旅人に聞こう</h2><p>行った人の声や、いまの様子は、Discordコミュニティで。無料で、見るだけでもOKです。</p><a class="btn" href="../#crew">💬 Discordで仲間と繋がる</a></section>`;
  h+=`<p class="small">数字は、公開されている二次情報から集めた参考値です。渡航前に、最新の情報を必ず確認してください。</p>`;
  h+=`<script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"ホーム","item":BASE},{"@type":"ListItem","position":2,"name":"街ガイド","item":BASE+'city/'},{"@type":"ListItem","position":3,"name":c.name,"item":url}]})}</script>`;
  fs.writeFileSync(path.join(ROOT,'city',c.id+'.html'),h+foot);
});
{let h=chead('ノマド向け街ガイド｜底辺くんのノマドノート','ノマドに人気の街の、生活費の目安と出典をまとめています。',BASE+'city/',false);
 h+=`<nav class="bc"><a href="../">ホーム</a> › 街ガイド</nav><h1>🗺 ノマド向け街ガイド</h1><p class="lead">人気の街の、生活費の目安です。</p><ul class="list">`+CI.cities.map(c=>`<li><a href="${c.id}.html"><b>${flag(c.c)} ${esc(c.name)}</b></a><br><span>${esc(c.month.label)}</span></li>`).join('')+`</ul>`+foot;
 fs.writeFileSync(path.join(ROOT,'city/index.html'),h);}

// sitemap（検索に載せるのは、出典で確認できた国だけ）
const urls=[BASE,BASE+'country/',...codes.filter(c=>indexable(DATA[c])).map(c=>`${BASE}country/${c.toLowerCase()}.html`),BASE+'city/',...CI.cities.filter(c=>c.index).map(c=>`${BASE}city/${c.id}.html`)];
const today=new Date().toISOString().slice(0,10);
fs.writeFileSync(path.join(ROOT,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`+urls.map(u=>`<url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')+`\n</urlset>\n`);
fs.writeFileSync(path.join(ROOT,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${BASE}sitemap.xml\n`);
console.log('pages',codes.length,'indexable',urls.length-2,'ranked',rows.length);
