// 公開中のサイトをスマホ幅で開き、スクショとエラーを保存する（確認用）。
const { chromium } = require("playwright");
const fs = require("fs");
const BASE = "https://litsamurai.github.io/teihen-nomad/";
const TABS = (process.env.TABS || "stays,food,home").split(",");
(async () => {
  fs.mkdirSync("shots", { recursive: true });
  const b = await chromium.launch();
  const log = [];
  for (const w of [390]) {
    const p = await b.newPage({ viewport: { width: w, height: 844 }, deviceScaleFactor: 2 });
    p.on("pageerror", (e) => log.push("pageerror: " + e.message));
    p.on("console", (m) => { if (m.type() === "error") log.push("console: " + m.text().slice(0, 200)); });
    for (const t of TABS) {
      await p.goto(BASE + "?v=" + Date.now() + "#" + t, { waitUntil: "networkidle" }).catch(() => {});
      await p.waitForTimeout(3500);
      await p.screenshot({ path: `shots/${t}-${w}.png`, fullPage: false });
      log.push(`[${t}] overflow-x: ` + (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)));
      if (t === "stays") {
        const info = await p.evaluate(() => (document.getElementById("stmapn") || {}).textContent);
        log.push("[stays] map: " + info);
        const pin = await p.$("#stmap .pin");
        if (pin) {
          await pin.scrollIntoViewIfNeeded();
          await pin.click({ force: true }).catch(() => {});
          await p.waitForTimeout(800);
          log.push("[stays] popup: " + (await p.$eval(".leaflet-popup-content", (e) => e.innerText.replace(/\n/g, " / ")).catch(() => "none")));
          await p.screenshot({ path: `shots/stays-popup-${w}.png` });
          const btn = await p.$(".leaflet-popup-content button");
          if (btn) { await btn.click().catch(() => {}); await p.waitForTimeout(1200); await p.screenshot({ path: `shots/stays-reviews-${w}.png` }); }
        }
        const el = await p.$("#stmapw");
        if (el) { await el.scrollIntoViewIfNeeded(); await p.screenshot({ path: `shots/stays-map-${w}.png` }); }
      }
    }
  }
  fs.writeFileSync("shots/log.txt", log.join("\n"));
  console.log(log.join("\n"));
  await b.close();
})();
