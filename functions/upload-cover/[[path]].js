export async function onRequest(context) {
  const { request, env } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  try {
    const body = await request.json();
    const sourceUrl = body.url;
    if (!sourceUrl) {
      return new Response(JSON.stringify({ error: "Missing url" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const urlHash = await sha256Hex(sourceUrl);
    const ext = guessImageExt(sourceUrl);
    const r2Key = "covers/" + urlHash.substring(0, 16) + "." + ext;
    // Check cache
    try {
      const cached = await env.COVERS_BUCKET.get(r2Key, { range: { offset: 0, length: 1 } });
      if (cached !== null) {
        const r2Url = buildR2Url(env, r2Key);
        return new Response(JSON.stringify({ success: true, r2_url: r2Url, cached: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    } catch (_) {}
    // Download
    const imgResp = await fetch(sourceUrl, { headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://www.douyin.com/" } });
    if (!imgResp.ok) {
      return new Response(JSON.stringify({ error: "Download failed: " + imgResp.status, source_url: sourceUrl }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const imgData = await imgResp.arrayBuffer();
    const contentType = imgResp.headers.get("content-type") || "image/jpeg";
    await env.COVERS_BUCKET.put(r2Key, imgData, { httpMetadata: { contentType } });
    const r2Url = buildR2Url(env, r2Key);
    return new Response(JSON.stringify({ success: true, r2_url: r2Url, cached: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, hint: "If R2 binding missing, redeploy CF Pages after adding binding" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}
async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const h = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2,"0")).join("");
}
function guessImageExt(url) {
  var l = url.toLowerCase();
  if (l.includes(".png") || l.includes("format=png")) return "png";
  if (l.includes(".webp") || l.includes("format=webp")) return "webp";
  if (l.includes(".gif")) return "gif";
  return "jpeg";
}
function buildR2Url(env, key) {
  var d = env.R2_PUBLIC_DOMAIN || "";
  if (d) return "https://" + d + "/" + key;
  return "https://pub-CHANGE-ME.r2.dev/" + key;
}
