// 世界のニュース見出しを取得して data/news.json に保存します（GitHub Actionsが朝・昼・夜に実行）。
// 英語の見出しは日本語に自動翻訳します（翻訳済みの見出しは再利用して、翻訳の回数を減らします）。
const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "..", "data", "news.json");
const SRC = [
  { k: "yahoo", n: "Yahoo!ニュース 国際", u: "https://news.yahoo.co.jp/rss/topics/world.xml", en: false },
  { k: "bbc", n: "BBC World", u: "https://feeds.bbci.co.uk/news/world/rss.xml", en: true },
  { k: "aje", n: "Al Jazeera", u: "https://www.aljazeera.com/xml/rss/all.xml", en: true },
];
const dec = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'").trim();
const tag = (b, t) => { const m = b.match(new RegExp("<" + t + "[^>]*>([\\s\\S]*?)</" + t + ">", "i")); return m ? dec(m[1]) : ""; };
function parse(xml) {
  return [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].slice(0, 20).map((m) => ({ t: tag(m[0], "title"), l: tag(m[0], "link").replace(/^http:\/\//, "https://"), d: tag(m[0], "pubDate") || tag(m[0], "dc:date") })).filter((i) => i.t && /^https:\/\//.test(i.l));
}
async function get(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "teihen-nomad-news/1.0 (+https://litsamurai.github.io/teihen-nomad/)" }, signal: AbortSignal.timeout(20000) });
      if (r.ok) return await r.text();
      console.log(url, "HTTP", r.status);
    } catch (e) { console.log(url, "エラー", String(e).slice(0, 100)); }
    await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
  }
  return null;
}
async function tr(t) {
  try {
    const r = await fetch("https://api.mymemory.translated.net/get?langpair=en|ja&q=" + encodeURIComponent(t), { signal: AbortSignal.timeout(15000) });
    const d = await r.json();
    const j = d && d.responseData && d.responseData.translatedText;
    if (!j || d.responseStatus != 200 || /MYMEMORY|QUERY LENGTH/i.test(j)) return "";
    return j;
  } catch (e) { return ""; }
}
(async () => {
  let old = {};
  try { old = JSON.parse(fs.readFileSync(OUT, "utf8")); } catch (e) {}
  const out = { updated: new Date().toISOString(), sources: {} };
  for (const s of SRC) {
    const xml = await get(s.u);
    let items = xml ? parse(xml) : [];
    // 14日より古い見出しは載せない（提供元の更新が止まっているときに、古いニュースを出さないため）
    const fresh = items.filter((i) => { const t = Date.parse(i.d); return isNaN(t) || Date.now() - t < 14 * 86400000; });
    if (items.length && !fresh.length) console.log(s.k, "見出しがすべて14日より古い：提供元の更新が止まっている可能性");
    const stale = items.length > 0 && !fresh.length;
    items = fresh;
    if (stale) { out.sources[s.k] = { items: [], updated: out.updated, stale: true }; continue; }
    if (xml && !items.length) console.log(s.k, "解析できず：", xml.length, "文字：", xml.slice(0, 300).replace(/\s+/g, " "));
    if (!items.length) { // 取得できなかったときは、前回の内容を残す
      out.sources[s.k] = (old.sources && old.sources[s.k]) || { items: [], updated: null };
      console.log(s.k, "取得失敗：前回の内容を維持");
      continue;
    }
    const prev = {};
    ((old.sources && old.sources[s.k] && old.sources[s.k].items) || []).forEach((i) => { if (i.j) prev[i.t] = i.j; });
    if (s.en) {
      for (const i of items.slice(0, 15)) {
        if (prev[i.t]) { i.j = prev[i.t]; continue; }
        const j = await tr(i.t);
        if (j) i.j = j;
        await new Promise((r) => setTimeout(r, 400));
      }
    }
    out.sources[s.k] = { items, updated: out.updated };
    console.log(s.k, items.length, "件", s.en ? "（翻訳 " + items.filter((i) => i.j).length + " 件）" : "");
  }
  if (!Object.values(out.sources).some((v) => v.items && v.items.length)) { console.log("全て取得失敗のため更新しません"); process.exit(0); }
  fs.writeFileSync(OUT, JSON.stringify(out));
})();
