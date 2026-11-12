// Googleマップの短縮リンク（maps.app.goo.gl など）を、最終のURLに展開して返す。
// 宿の投稿フォームが、名前・緯度経度・国・街を自動で読み取るために使う。
// Googleマップ以外のURLは受け付けない。
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const OK = /^(maps\.app\.goo\.gl|goo\.gl|(www\.|maps\.)?google\.[a-z.]+)$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const { url } = await req.json();
    let u = new URL(String(url || ""));
    for (let i = 0; i < 6; i++) {
      if (u.protocol !== "https:" || !OK.test(u.hostname)) throw new Error("not google maps");
      const r = await fetch(u.toString(), {
        redirect: "manual",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; nomad-note)", "Accept-Language": "ja" },
      });
      const loc = r.headers.get("location");
      if (r.status >= 300 && r.status < 400 && loc) {
        u = new URL(loc, u);
        if (/\/maps\/place\/|@-?\d+\.\d+,-?\d+\.\d+|!3d-?\d+/.test(u.toString())) break;
        continue;
      }
      break;
    }
    return new Response(JSON.stringify({ url: u.toString() }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
