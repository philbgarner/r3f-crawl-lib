// texture-loader.js — atomic-core texture loader demo
//
// Demonstrates loadTextureAtlas():
//   1. Fetches textureAtlas.json and textureAtlas.png from the local server.
//   2. Shelf-packs all sprites into a power-of-two OffscreenCanvas.
//   3. Displays all packed sprites with UV data, hover highlight, JSON popup,
//      and per-sprite enable/disable checkboxes that trigger live repacking.
//   4. Demonstrates resolveSprite() by both name and insertion-order id.

const { loadTextureAtlas, resolveSprite } = AtomicCore;

const statusEl    = document.getElementById("status");
const countEl     = document.getElementById("sprite-count");
const texSizeEl   = document.getElementById("tex-size");
const spriteListEl = document.getElementById("sprite-list");
const outputCanvas = document.getElementById("packed-canvas");
const downloadBtn    = document.getElementById("download-btn");
const toggleAllBtn   = document.getElementById("toggle-all-btn");
const popup       = document.getElementById("json-popup");
const popupTitle  = document.getElementById("json-popup-title");
const popupBody   = document.getElementById("json-popup-body");
const popupClose   = document.getElementById("json-popup-close");
const popupSprite  = document.getElementById("json-popup-sprite");

const ctx = outputCanvas.getContext("2d");
const overlayCb   = document.getElementById("overlay-cb");

let currentAtlas  = null;
let showOverlay   = false;
let sourceFrames  = null;   // original full frames for JSON popup
let fullAtlasJson = null;
let enabledSprites = new Set();
let baseImageData  = null;  // canvas pixels after overlays, used for hover restore
let repacking      = false;

// ---------------------------------------------------------------------------
// Canvas rendering
// ---------------------------------------------------------------------------

function renderCanvas(atlas) {
  const src = atlas.texture;
  const w   = src.width;
  const h   = src.height;

  outputCanvas.width  = w;
  outputCanvas.height = h;

  if (src instanceof OffscreenCanvas) {
    const bmp = src.transferToImageBitmap();
    ctx.drawImage(bmp, 0, 0);
    bmp.close();
  } else {
    ctx.drawImage(src, 0, 0);
  }

  if (showOverlay) {
    ctx.save();
    ctx.strokeStyle = "rgba(255, 0, 255, 0.75)";
    ctx.lineWidth   = 1;
    ctx.setLineDash([3, 3]);

    for (const sprite of atlas.sprites.values()) {
      const px = sprite.uvX * w;
      const py = sprite.uvY * h;
      const pw = sprite.uvW * w;
      const ph = sprite.uvH * h;
      ctx.strokeRect(px, py, pw, ph);

      const label    = `${Math.round(pw)}×${Math.round(ph)}`;
      const fontSize = Math.max(7, Math.min(11, pw / 6));
      ctx.setLineDash([]);
      ctx.font         = `bold ${fontSize}px monospace`;
      ctx.textAlign    = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle    = "rgba(0,0,0,0.6)";
      ctx.fillText(label, px + pw / 2 + 1, py + ph / 2 + 1);
      ctx.fillStyle    = "rgba(255,255,0,0.9)";
      ctx.fillText(label, px + pw / 2, py + ph / 2);
      ctx.setLineDash([3, 3]);
    }

    ctx.restore();
  }

  baseImageData = ctx.getImageData(0, 0, w, h);
}

function highlightSprite(name) {
  if (!baseImageData || !currentAtlas) return;
  const sprite = currentAtlas.getByName(name);
  if (!sprite) return;

  const w  = outputCanvas.width;
  const h  = outputCanvas.height;
  const px = sprite.uvX * w;
  const py = sprite.uvY * h;
  const pw = sprite.uvW * w;
  const ph = sprite.uvH * h;

  ctx.putImageData(baseImageData, 0, 0);
  ctx.save();
  ctx.fillStyle   = "rgba(255,255,0,0.18)";
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = "rgba(255,255,0,1)";
  ctx.lineWidth   = 2;
  ctx.setLineDash([]);
  ctx.strokeRect(px, py, pw, ph);
  ctx.restore();
}

function clearHighlight() {
  if (baseImageData) ctx.putImageData(baseImageData, 0, 0);
}

// ---------------------------------------------------------------------------
// Sprite list
// ---------------------------------------------------------------------------

function updateToggleLabel() {
  const allEnabled = enabledSprites.size === Object.keys(sourceFrames).length;
  toggleAllBtn.textContent = allEnabled ? "select none" : "select all";
}

function renderList() {
  spriteListEl.innerHTML = "";

  for (const name of Object.keys(sourceFrames)) {
    const sprite  = currentAtlas.getByName(name);
    const enabled = enabledSprites.has(name);

    const row = document.createElement("div");
    row.className = "sprite-row" + (enabled ? "" : " sprite-disabled");

    const cb    = document.createElement("input");
    cb.type     = "checkbox";
    cb.checked  = enabled;
    cb.title    = enabled ? "Uncheck to exclude from pack" : "Check to include in pack";
    cb.addEventListener("change", () => {
      if (repacking) { cb.checked = !cb.checked; return; }
      if (cb.checked) enabledSprites.add(name);
      else            enabledSprites.delete(name);
      repack();
    });

    const info = document.createElement("div");
    info.className = "sprite-info";
    const uvStr = sprite
      ? `id:${sprite.id} uv:(${sprite.uvX.toFixed(3)},${sprite.uvY.toFixed(3)})`
      : "<em>excluded</em>";
    info.innerHTML = `<span class="sprite-name">${name}</span><br>${uvStr}`;

    const btn       = document.createElement("button");
    btn.className   = "ellipsis-btn";
    btn.textContent = "…";
    btn.title       = "Show source JSON";
    btn.addEventListener("click", (e) => { e.stopPropagation(); showPopup(name); });

    row.appendChild(cb);
    row.appendChild(info);
    row.appendChild(btn);

    if (sprite) {
      row.addEventListener("mouseenter", () => highlightSprite(name));
      row.addEventListener("mouseleave", clearHighlight);
    }

    spriteListEl.appendChild(row);
  }
}

// ---------------------------------------------------------------------------
// JSON popup
// ---------------------------------------------------------------------------

function showPopup(name) {
  popupTitle.textContent = name;
  popupBody.textContent  = JSON.stringify(sourceFrames[name], null, 2);

  const sprite = currentAtlas && currentAtlas.getByName(name);
  if (sprite && baseImageData) {
    const aw = outputCanvas.width;
    const ah = outputCanvas.height;
    const sx = Math.round(sprite.uvX * aw);
    const sy = Math.round(sprite.uvY * ah);
    const sw = Math.round(sprite.uvW * aw);
    const sh = Math.round(sprite.uvH * ah);
    popupSprite.width  = sw;
    popupSprite.height = sh;
    popupSprite.style.display = "block";
    const sCtx = popupSprite.getContext("2d");
    const regionData = new ImageData(sw, sh);
    for (let row = 0; row < sh; row++) {
      const srcOff = ((sy + row) * aw + sx) * 4;
      const dstOff = row * sw * 4;
      regionData.data.set(baseImageData.data.subarray(srcOff, srcOff + sw * 4), dstOff);
    }
    sCtx.putImageData(regionData, 0, 0);
  } else {
    popupSprite.style.display = "none";
  }

  popup.style.display = "flex";
}

toggleAllBtn.addEventListener("click", () => {
  if (repacking) return;
  const allEnabled = enabledSprites.size === Object.keys(sourceFrames).length;
  if (allEnabled) {
    enabledSprites.clear();
  } else {
    for (const name of Object.keys(sourceFrames)) enabledSprites.add(name);
  }
  repack();
});

popupClose.addEventListener("click", () => { popup.style.display = "none"; });
popup.addEventListener("click", (e) => { if (e.target === popup) popup.style.display = "none"; });

overlayCb.addEventListener("change", () => {
  showOverlay = overlayCb.checked;
  if (currentAtlas) repack();
});

// ---------------------------------------------------------------------------
// Repacking
// ---------------------------------------------------------------------------

async function repack() {
  if (repacking) return;
  repacking = true;
  statusEl.textContent = "repacking...";

  const filtered = {
    ...fullAtlasJson,
    frames: Object.fromEntries(
      Object.entries(fullAtlasJson.frames).filter(([n]) => enabledSprites.has(n))
    ),
  };

  if (Object.keys(filtered.frames).length === 0) {
    outputCanvas.width  = 512;
    outputCanvas.height = 512;
    ctx.clearRect(0, 0, 512, 512);
    baseImageData = ctx.getImageData(0, 0, 512, 512);
    currentAtlas  = { sprites: new Map(), getByName: () => undefined, getById: () => undefined, texture: outputCanvas };
    countEl.textContent   = 0;
    texSizeEl.textContent = "512×512";
    statusEl.textContent  = "no sprites selected";
    renderList();
    updateToggleLabel();
    repacking = false;
    return;
  }

  try {
    const atlas = await loadTextureAtlas("../textureAtlas.png", filtered, {
      showLoadingScreen: false,
    });

    currentAtlas = atlas;
    renderCanvas(atlas);
    renderList();
    updateToggleLabel();

    countEl.textContent   = atlas.sprites.size;
    texSizeEl.textContent = `${outputCanvas.width}×${outputCanvas.height}`;
    statusEl.textContent  = "ready";
  } catch (err) {
    statusEl.textContent = "error";
    console.error("[texture-loader] repack error:", err);
  }

  repacking = false;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  statusEl.textContent = "loading...";

  fullAtlasJson = await fetch("../textureAtlas.json").then((r) => r.json());
  sourceFrames  = fullAtlasJson.frames;
  enabledSprites = new Set(Object.keys(sourceFrames));

  const atlas = await loadTextureAtlas("../textureAtlas.png", fullAtlasJson, {
    showLoadingScreen: true,
    loadingText: "Packing sprites...",
    onProgress: (loaded, total) => {
      statusEl.textContent = `step ${loaded}/${total}`;
    },
  });

  currentAtlas = atlas;
  renderCanvas(atlas);

  statusEl.textContent  = "ready";
  countEl.textContent   = atlas.sprites.size;
  texSizeEl.textContent = `${outputCanvas.width}×${outputCanvas.height}`;

  renderList();
  updateToggleLabel();

  downloadBtn.disabled      = false;
  downloadBtn.style.opacity = "1";
  downloadBtn.addEventListener("click", () => {
    const a    = document.createElement("a");
    a.download = "packed-atlas.png";
    a.href     = outputCanvas.toDataURL("image/png");
    a.click();
  });

  const byName = resolveSprite(atlas, "bat_placeholder1.png");
  const byId   = resolveSprite(atlas, byName?.id ?? 0);
  console.log("[texture-loader] resolveSprite by name:", byName);
  console.log("[texture-loader] resolveSprite by id:  ", byId);
  console.log(`[texture-loader] same sprite? ${byName === byId}`);
}

main().catch((err) => {
  statusEl.textContent = "error";
  console.error("[texture-loader]", err);
});
