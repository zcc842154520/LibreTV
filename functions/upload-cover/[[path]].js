// ============================================
// LibreTV Cover Image Upload to R2
// POST { url: "douyin_cover_url" }
// ============================================

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
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const sourceUrl = body.url;

    if (!sourceUrl) {
      return new Response(JSON.stringify({ error: "Missing url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bucket = env.COVERS_BUCKET;
    if (!bucket || typeof bucket.put !== "function") {
      return new Response(JSON.stringify({ 
        error: "R2 binding not configured. Go to CF Pages > Settings > Functions > R2 bucket bindings, not env vars."
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const urlHash = await sha256Hex(sourceUrl);
    const ext = guessImageExt(sourceUrl);
    const r2Key = "covers/" + urlHash.substring(0, 16) + "." + ext;

    // Check if already uploaded (use try/catch since head may not exist)
    try {
      const existing = await bucket.get(r2Key, { range: { offset: 0, length: 1 } });
      if (existing !== null) {
        const r2Url = buildR2Url(env, r2Key);
        return new Response(JSON.stringify({ success: true, r2_url: r2Url, cached: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (e) {
      // Not found, continue to download
    }

    // Download from source
    const imageResp = await fetch(sourceUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LibreTV/1.0)",
        "Referer": "https://www.douyin.com/",
      },
    });

    if (!imageResp.ok) {
      return new Response(JSON.stringify({
        error: "Download failed: " + imageResp.status,
        source_url: sourceUrl
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imageData = await imageResp.arrayBuffer();
    const contentType = imageResp.headers.get("content-type") || "image/jpeg";

    await bucket.put(r2Key, imageData, {
      httpMetadata: { contentType },
    });

    const r2Url = buildR2Url(env, r2Key);
    return new Response(JSON.stringify({ success: true, r2_url: r2Url, cached: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function guessImageExt(url) {
  const lower = url.toLowerCase();
  if (lower.includes(".png") || lower.includes("format=png")) return "png";
  if (lower.includes(".webp") || lower.includes("format=webp")) return "webp";
  if (lower.includes(".gif")) return "gif";
  return "jpeg";
}

function buildR2Url(env, key) {
  const customDomain = env.R2_PUBLIC_DOMAIN || "";
  if (customDomain) {
    return "https://" + customDomain + "/" + key;
  }
  return "https://pub-CHANGE-ME.r2.dev/" + key;
}
