// Googleマップの短縮リンクから、宿の名前・住所・緯度経度を読み取って返す。
const H = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const OK = /^(maps\.app\.goo\.gl|goo\.gl|(www\.|maps\.|consent\.)?google\.[a-z.]+)$/i;
// ブラウザ風のUAだとGoogleは展開してくれないので、この形にする
const UA = "Mozilla/5.0 (compatible; nomad-note)";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: H });
  try {
    const { url } = await req.json();
    let u = new URL(String(url || ""));
    for (let i = 0; i < 8; i++) {
      if (u.protocol !== "https:" || !OK.test(u.hostname)) throw new Error("not google maps");
      const r = await fetch(u.toString(), { redirect: "manual", headers: { "User-Agent": UA } });
      const loc = r.headers.get("location");
      if (!(r.status >= 300 && r.status < 400 && loc)) break;
      u = new URL(loc, u);
    }
    const s = decodeURIComponent(u.toString());
    let name: string | null = null, addr: string | null = null, lat: number | null = null, lng: number | null = null;
    const pl = s.match(/\/maps\/place\/([^\/@?]+)/);
    if (pl) name = pl[1].replace(/\+/g, " ").trim();
    const c = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (c) { lat = +c[1]; lng = +c[2]; }
    const q = u.searchParams.get("q");
    if (q && !/^-?\d+\.\d+,/.test(q)) {
      const p = q.split(/,\s*/);
      if (!name) name = p[0].replace(/^\d+\s*樓\s*/, "").trim() || p[0];
      if (p.length > 1) addr = p.slice(1).join(", ");
    }
    return new Response(JSON.stringify({ url: u.toString(), name, addr, lat, lng }), { headers: H });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 400, headers: H });
  }
});
