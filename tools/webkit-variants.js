// iPhone Safari相当で、地図のポップアップが隠れる問題の直し方を、いくつか同時に試す。
const pw = require("playwright");
const fs = require("fs");
const BASE = "https://litsamurai.github.io/teihen-nomad/";
const V = {
  none: "",
  a_overlay_low: ".leaflet-overlay-pane{z-index:100!important}.leaflet-popup-pane{z-index:900!important}",
  b_3d: ".leaflet-map-pane{transform-style:preserve-3d}.leaflet-popup-pane{transform:translateZ(5px)}",
  c_will: ".leaflet-popup-pane,.leaflet-marker-pane{will-change:transform;transform:translateZ(0)}",
  d_svg_back: ".leaflet-overlay-pane svg{z-index:-1!important}.leaflet-popup-pane{position:relative;z-index:1000}",
  e_no_isolate: ".leaflet-container{isolation:auto!important;transform:none!important;-webkit-transform:none!important}.leaflet-popup-pane{z-index:1000!important}.leaflet-overlay-pane{z-index:200!important}",
  f_popup_top: ".leaflet-popup{z-index:2000!important;transform-style:flat}.leaflet-popup-pane{overflow:visible!important}",
};
(async () => {
  fs.mkdirSync("shots", { recursive: true });
  const b = await pw.webkit.launch();
  for (const [k, css] of Object.entries(V)) {
    const p = await b.newPage({ ...pw.devices["iPhone 14"] });
    await p.goto(BASE + "?v=" + Date.now() + "#stays", { waitUntil: "networkidle" }).catch(() => {});
    await p.waitForTimeout(3500);
    if (css) await p.addStyleTag({ content: css });
    const pin = await p.$("#stmap .pin");
    if (pin) { await pin.scrollIntoViewIfNeeded(); await pin.click({ force: true }).catch(() => {}); }
    await p.waitForTimeout(1200);
    const el = await p.$("#stmap");
    if (el) await el.screenshot({ path: `shots/v-${k}.png` });
    await p.close();
  }
  await b.close();
})();
