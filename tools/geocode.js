// data/restaurants.json の各店の位置（緯度・経度）を、OpenStreetMapの検索（Nominatim）で調べて保存します。
// 目安の位置です。街の中心から離れすぎている結果は採用しません。使い方：node tools/geocode.js
const fs = require("fs");
const path = require("path");
const FILE = path.join(__dirname, "..", "data", "restaurants.json");
const CITY = {
  "ハノイ": ["Hanoi, Vietnam", 21.0285, 105.8542], "トビリシ": ["Tbilisi, Georgia", 41.7151, 44.8271],
  "シンガポール": ["Singapore", 1.3521, 103.8198], "バンコク": ["Bangkok, Thailand", 13.7563, 100.5018],
  "ホーチミン": ["Ho Chi Minh City, Vietnam", 10.8231, 106.6297], "チェンマイ": ["Chiang Mai, Thailand", 18.7883, 98.9853],
  "ペナン（ジョージタウン）": ["George Town, Penang, Malaysia", 5.4141, 100.3288], "クアラルンプール": ["Kuala Lumpur, Malaysia", 3.139, 101.6869],
  "台北": ["Taipei, Taiwan", 25.033, 121.5654], "台南": ["Tainan, Taiwan", 22.9999, 120.227],
  "ダナン": ["Da Nang, Vietnam", 16.0544, 108.2022], "台中": ["Taichung, Taiwan", 24.1477, 120.6736], "高雄": ["Kaohsiung, Taiwan", 22.6273, 120.3014],
};
const km = (a, b, c, d) => { const R = 6371, r = Math.PI / 180, x = (c - a) * r, y = (d - b) * r; const h = Math.sin(x / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(y / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function search(q) {
  if (process.env.FAKE) return [{ lat: "0", lon: "0", fake: 1 }];
  const r = await fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=" + encodeURIComponent(q), { headers: { "User-Agent": "teihen-nomad-geocode/1.0 (+https://litsamurai.github.io/teihen-nomad/)" }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return await r.json();
}
(async () => {
  const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
  let ok = 0, ng = 0;
  for (const x of data) {
    if (typeof x.lat === "number") continue;
    const c = CITY[x.city];
    if (!c) { console.log("街が未登録：", x.city); continue; }
    const tries = [x.name + ", " + (x.addr || "") + ", " + c[0], (x.addr || "") + ", " + c[0], x.name + ", " + c[0]];
    let got = null;
    for (const q of tries) {
      if (!q.trim() || /^,/.test(q)) continue;
      try {
        const d = await search(q);
        await wait(1200);
        if (d && d.length) {
          const la = +d[0].lat, lo = +d[0].lon;
          if (process.env.FAKE) { got = [c[1], c[2]]; break; }
          if (km(la, lo, c[1], c[2]) <= 30) { got = [la, lo]; break; }
        }
      } catch (e) { console.log("エラー", x.name, String(e).slice(0, 80)); await wait(3000); }
    }
    if (got) { x.lat = Math.round(got[0] * 1e5) / 1e5; x.lng = Math.round(got[1] * 1e5) / 1e5; x.geo = "osm"; ok++; }
    else { ng++; console.log("見つからず：", x.name, "/", x.city); }
  }
  fs.writeFileSync(FILE, JSON.stringify(data, null, 1));
  console.log("位置を入れた：", ok, "件／見つからず：", ng, "件");
})();
