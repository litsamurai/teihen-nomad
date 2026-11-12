// Googleマップの短縮リンク（maps.app.goo.gl など）から、宿の名前と緯度経度を読み取って返す。
// 宿の投稿フォームが、名前・国・街・ピンを自動で入れるために使う。
// Googleマップ以外のURLは受け付けない。
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const OK = /^(maps\.app\.goo\.gl|goo\.gl|(www\.|maps\.|consent\.)?google\.[a-z.]+)$/i;
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });

function fromUrl(s: string) {
  const o: { name?: string; lat?: number; lng?: number } = {};
  const n = s.match(/\/maps\/place\/([^\/@?]+)/);
  if (n) { try { o.name = decodeURIComponent(n[1].replace(/\+/g, " ")).trim(); } catch (_) { /* */ } }
  const c = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ||
    s.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (c) { o.lat = +c[1]; o.lng = +c[2]; }
  return o;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const { url } = await req.json();
    let u = new URL(String(url || ""));
    for (let i = 0; i < 8; i++) {
      if (u.protocol !== "https:" || !OK.test(u.hostname)) throw new Error("not google maps");
      const r = await fetch(u.toString(), { redirect: "manual", headers: { "User-Agent": UA, "Accept-Language": "ja" } });
      const loc = r.headers.get("location");
      if (r.status >= 300 && r.status < 400 && loc) {
        u = new URL(loc, u);
        if (/^consent\./i.test(u.hostname) && u.searchParams.get("continue")) u = new URL(u.searchParams.get("continue")!);
        continue;
      }
      break;
    }
    const o = fromUrl(decodeURIComponent(u.toString()));
    // ?q=宿名, 住所 の形（座標なし）のとき：名前と住所に分けて返す
    let addr: string | null = null;
    const qp = u.searchParams.get("q");
    if (qp && !/^-?\d+\.\d+,/.test(qp)) {
      const parts = qp.split(/,\s*/);
      if (!o.name && parts[0]) o.name = parts[0].replace(/^\d+\s*樓\s*/, "").trim() || parts[0];
      if (parts.length > 1) addr = parts.slice(1).join(", ");
    }
    if ((typeof o.lat !== "number" && !addr) || !o.name) {
      // 最終ページのHTMLから、名前と位置を探す
      try {
        const r = await fetch(u.toString(), {
          headers: { "User-Agent": UA, "Accept-Language": "ja", "Cookie": "CONSENT=YES+1; SOCS=CAI" },
        });
        const t = (await r.text()).slice(0, 600000);
        const c = t.match(/center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/) || t.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ||
          t.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
        if (c && typeof o.lat !== "number") { o.lat = +c[1]; o.lng = +c[2]; }
        if (!o.name) {
          const m = t.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/) || t.match(/<title>([^<]+)<\/title>/);
          if (m) {
            const nn = m[1].replace(/&amp;/g, "&").replace(/&#39;/g, "'").split(" · ")[0].replace(/ - Google.*$/, "").trim();
            if (nn && !/^Google/i.test(nn)) o.name = nn;
          }
        }
      } catch (_) { /* 読めなくても、わかった分だけ返す */ }
    }
    return json({ url: u.toString(), name: o.name || null, addr, lat: o.lat ?? null, lng: o.lng ?? null });
  } catch (e) {
    return json({ error: String(e) }, 400);
  }
});
