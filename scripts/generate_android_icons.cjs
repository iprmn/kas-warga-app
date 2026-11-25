const fs = require("fs");
const path = require("path");
const puppeteer = require("C:\\Users\\indra.permana\\.gemini\\antigravity\\scratch\\toko-app\\node_modules\\puppeteer-core");

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const rootDir = path.resolve(__dirname, "..");
const resDir = path.join(rootDir, "android", "app", "src", "main", "res");

// Clean, bold, Play-Store-grade KasWarga SVG emblem:
// Deep Forest Green (#07332A) + Electric Lime (#8EE055) + Pure White
// Motif: Modern neighborhood house silhouette sheltering a crisp wallet/coin emblem + community mark
function buildIconSvg(mode) {
  const isFg = mode === "foreground";
  const isRound = mode === "round";

  const bgMarkup = isFg
    ? ""
    : `
      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0E4F41"/>
          <stop offset="55%" stop-color="#07332A"/>
          <stop offset="100%" stop-color="#04211B"/>
        </linearGradient>
        <radialGradient id="glow" cx="30%" cy="22%" r="65%">
          <stop offset="0%" stop-color="#8EE055" stop-opacity="0.24"/>
          <stop offset="100%" stop-color="#8EE055" stop-opacity="0"/>
        </radialGradient>
        ${isRound ? `<clipPath id="clipShape"><circle cx="256" cy="256" r="256"/></clipPath>` : `<clipPath id="clipShape"><rect x="0" y="0" width="512" height="512" rx="112" ry="112"/></clipPath>`}
      </defs>
      <g clip-path="url(#clipShape)">
        <rect width="512" height="512" fill="url(#bgGrad)"/>
        <rect width="512" height="512" fill="url(#glow)"/>
        <circle cx="430" cy="86" r="120" fill="#8EE055" fill-opacity="0.06"/>
        <circle cx="80" cy="440" r="130" fill="#8EE055" fill-opacity="0.05"/>
      </g>
    `;

  // Adaptive icon safe zone is central 66% (scale 0.66 centered at 256,256)
  const groupTransform = isFg ? "translate(256, 256) scale(0.64) translate(-256, -256)" : "translate(256, 256) scale(0.88) translate(-256, -256)";

  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
    ${bgMarkup}
    <g transform="${groupTransform}">
      <!-- Subtle soft shadow under house -->
      <ellipse cx="256" cy="422" rx="146" ry="20" fill="#021410" fill-opacity="0.38"/>

      <!-- Modern House Body (Crisp White Card) -->
      <path d="M114 234 L256 122 L398 234 L398 378 C398 398 382 414 362 414 L150 414 C130 414 114 398 114 378 Z"
            fill="#FFFFFF"/>

      <!-- Bold Electric Lime Roof Arch -->
      <path d="M74 236 L241 102 C250 95 262 95 271 102 L438 236 C449 245 450 261 441 271 C432 282 416 283 405 274 L256 155 L107 274 C96 283 80 282 71 271 C62 261 63 245 74 236 Z"
            fill="#8EE055"/>

      <!-- Inner Forest Green Wallet / Kas Emblem inside the house -->
      <rect x="158" y="226" width="196" height="142" rx="28" fill="#07332A"/>

      <!-- Wallet Top Flap Accent -->
      <path d="M158 254 C158 238.5 170.5 226 186 226 L326 226 C341.5 226 354 238.5 354 254 L354 268 L158 268 Z"
            fill="#0F4D40"/>

      <!-- Community People Icon (Left side inside wallet) -->
      <circle cx="222" cy="296" r="17" fill="#8EE055"/>
      <path d="M192 342 C192 325 205 316 222 316 C239 316 252 325 252 342" fill="#8EE055"/>
      <circle cx="264" cy="301" r="13" fill="#D9F99D"/>
      <path d="M248 342 C248 329 257 322 269 322 C281 322 290 329 290 342" fill="#D9F99D"/>

      <!-- Wallet Clasp & Coin Badge (Right side) -->
      <rect x="298" y="282" width="72" height="50" rx="25" fill="#8EE055" stroke="#FFFFFF" stroke-width="6"/>
      <circle cx="324" cy="307" r="11" fill="#07332A"/>

      <!-- Floating Rupiah Coin Badge at top-right of roof -->
      <circle cx="384" cy="144" r="54" fill="#8EE055" stroke="#07332A" stroke-width="12"/>
      <text x="384" y="160" text-anchor="middle" font-family="'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif" font-weight="900" font-size="44" fill="#07332A">Rp</text>
    </g>
  </svg>`;
}

function buildSplashHtml(width, height) {
  const iconSize = Math.round(Math.min(width, height) * 0.28);
  const titleSize = Math.round(Math.min(width, height) * 0.068);
  const subSize = Math.round(Math.min(width, height) * 0.032);
  return `<!DOCTYPE html>
  <html>
  <head>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        width: ${width}px;
        height: ${height}px;
        background: radial-gradient(circle at 30% 20%, #0E4F41 0%, #07332A 60%, #04211B 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: 'Plus Jakarta Sans', 'Segoe UI', Roboto, sans-serif;
        color: #FFFFFF;
      }
      .icon-box {
        width: ${iconSize}px;
        height: ${iconSize}px;
        border-radius: ${Math.round(iconSize * 0.24)}px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
        margin-bottom: ${Math.round(iconSize * 0.18)}px;
      }
      .title {
        font-size: ${titleSize}px;
        font-weight: 800;
        letter-spacing: -0.5px;
        color: #FFFFFF;
      }
      .sub {
        margin-top: ${Math.round(subSize * 0.45)}px;
        font-size: ${subSize}px;
        font-weight: 600;
        color: #8EE055;
        letter-spacing: 0.3px;
      }
    </style>
  </head>
  <body>
    <div class="icon-box">${buildIconSvg("square")}</div>
    <div class="title">KasWarga</div>
    <div class="sub">Iuran Kas Warga RT &amp; RW</div>
  </body>
  </html>`;
}

async function renderSvgToPng(page, svg, size, outPath, transparent = false) {
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  await page.setContent(`<!DOCTYPE html><html><body style="margin:0;padding:0;width:${size}px;height:${size}px;background:transparent;overflow:hidden;">${svg}</body></html>`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await page.screenshot({ path: outPath, omitBackground: transparent });
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    // High-res 512px preview & PWA icon
    await renderSvgToPng(page, buildIconSvg("square"), 512, path.join(rootDir, "public", "icon-512.png"), true);
    await renderSvgToPng(page, buildIconSvg("square"), 192, path.join(rootDir, "public", "icon-192.png"), true);
    console.log("Generated public/icon-512.png & icon-192.png");

    const densities = [
      { name: "mipmap-mdpi", launcher: 48, fg: 108 },
      { name: "mipmap-hdpi", launcher: 72, fg: 162 },
      { name: "mipmap-xhdpi", launcher: 96, fg: 216 },
      { name: "mipmap-xxhdpi", launcher: 144, fg: 324 },
      { name: "mipmap-xxxhdpi", launcher: 192, fg: 432 },
    ];

    for (const d of densities) {
      const dir = path.join(resDir, d.name);
      await renderSvgToPng(page, buildIconSvg("square"), d.launcher, path.join(dir, "ic_launcher.png"), true);
      await renderSvgToPng(page, buildIconSvg("round"), d.launcher, path.join(dir, "ic_launcher_round.png"), true);
      await renderSvgToPng(page, buildIconSvg("foreground"), d.fg, path.join(dir, "ic_launcher_foreground.png"), true);
      console.log(`Generated ${d.name} icons (${d.launcher}px / ${d.fg}px)`);
    }

    // Generate matching KasWarga splash screens (replace default Capacitor logo)
    const splashes = [
      { folder: "drawable", w: 480, h: 800 },
      { folder: "drawable-port-mdpi", w: 320, h: 480 },
      { folder: "drawable-port-hdpi", w: 480, h: 800 },
      { folder: "drawable-port-xhdpi", w: 720, h: 1280 },
      { folder: "drawable-port-xxhdpi", w: 960, h: 1600 },
      { folder: "drawable-port-xxxhdpi", w: 1280, h: 1920 },
      { folder: "drawable-land-mdpi", w: 480, h: 320 },
      { folder: "drawable-land-hdpi", w: 800, h: 480 },
      { folder: "drawable-land-xhdpi", w: 1280, h: 720 },
      { folder: "drawable-land-xxhdpi", w: 1600, h: 960 },
      { folder: "drawable-land-xxxhdpi", w: 1920, h: 1280 },
    ];

    for (const s of splashes) {
      const outPath = path.join(resDir, s.folder, "splash.png");
      await page.setViewport({ width: s.w, height: s.h, deviceScaleFactor: 1 });
      await page.setContent(buildSplashHtml(s.w, s.h));
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      await page.screenshot({ path: outPath });
    }
    console.log("Generated all 11 KasWarga Android splash screens!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Icon generation error:", err);
  process.exit(1);
});
