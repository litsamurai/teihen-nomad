// 為替レートを最新にして data/fx.json に保存します（毎月、GitHub Actionsが実行）。
// 国別コストの「円」表示や両替の予備データに使います。取得に失敗したり、値がおかしいときは、更新しません。
const fs = require("fs");
const path = require("path");
const FILE = path.join(__dirname, "..", "data", "fx.json");
(async () => {
  const old = JSON.parse(fs.readFileSync(FILE, "utf8"));
  let d;
  if (process.env.FX_SOURCE_FILE) d = JSON.parse(fs.readFileSync(process.env.FX_SOURCE_FILE, "utf8"));
  else {
    for (let i = 0; i < 3 && !d; i++) {
      try {
        const r = await fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(20000) });
        if (r.ok) d = await r.json();
      } catch (e) {}
      if (!d) await new Promise((r) => setTimeout(r, 3000 * (i + 1)));
    }
  }
  if (!d || d.result !== "success" || !d.rates) { console.log("取得できなかったため、更新しません"); return; }
  const keys = Object.keys(old.rates), rates = {};
  keys.forEach((k) => { const v = d.rates[k]; if (typeof v === "number" && v > 0) rates[k] = v; });
  if (Object.keys(rates).length < keys.length * 0.9 || !rates.JPY || rates.JPY < 80 || rates.JPY > 300 || rates.USD !== 1) { console.log("値が不自然なため、更新しません"); return; }
  keys.forEach((k) => { if (!(k in rates)) rates[k] = old.rates[k]; });
  const date = new Date((d.time_last_update_unix || Date.now() / 1000) * 1000).toISOString().slice(0, 10);
  fs.writeFileSync(FILE, JSON.stringify({ date, src: "ExchangeRate-API（open.er-api.com）の中値", rates }));
  console.log("更新しました：", date, "JPY", rates.JPY);
})();
