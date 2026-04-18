// texture-loader.js — atomic-core texture loader demo
//
// Demonstrates loadTextureAtlas():
//   1. Accepts a TexturePacker-format atlas JSON + source image URL.
//   2. Unpacks each named sprite (handling rotated:true), shelf-packs them into
//      a power-of-two OffscreenCanvas, and returns a PackedAtlas.
//   3. PackedAtlas.getByName(name) returns UV rect + pivot + rotation metadata.
//   4. PackedAtlas.getById(id) resolves by insertion-order index (== tileId).
//
// This example uses TEXTURE_ATLAS_DATA_URL and TEXTURE_ATLAS_JSON from the
// bundled textureAtlas-data.js so it works without an HTTP server.

const { loadTextureAtlas, resolveSprite } = AtomicCore;

const statusEl      = document.getElementById('status');
const countEl       = document.getElementById('sprite-count');
const texSizeEl     = document.getElementById('tex-size');
const spriteListEl  = document.getElementById('sprite-list');
const outputCanvas  = document.getElementById('packed-canvas');

async function main() {
  statusEl.textContent = 'loading...';

  // loadTextureAtlas accepts any URL — here we use the embedded data URL.
  const atlas = await loadTextureAtlas(
    window.TEXTURE_ATLAS_DATA_URL,
    window.TEXTURE_ATLAS_JSON,
    {
      showLoadingScreen: true,
      loadingText:       'Packing sprites...',
      onProgress: (loaded, total) => {
        statusEl.textContent = `step ${loaded}/${total}`;
      },
    },
  );

  // --- Blit the baked texture onto the visible canvas ---
  const src = atlas.texture;
  const w   = src instanceof OffscreenCanvas ? src.width  : src.width;
  const h   = src instanceof OffscreenCanvas ? src.height : src.height;

  outputCanvas.width  = w;
  outputCanvas.height = h;

  const ctx = outputCanvas.getContext('2d');

  if (src instanceof OffscreenCanvas) {
    // Transfer OffscreenCanvas pixels via ImageBitmap
    const bmp = await src.transferToImageBitmap();
    ctx.drawImage(bmp, 0, 0);
    bmp.close();
  } else {
    ctx.drawImage(src, 0, 0);
  }

  // --- Update sidebar stats ---
  statusEl.textContent = 'ready';
  countEl.textContent  = atlas.sprites.size;
  texSizeEl.textContent = `${w}×${h}`;

  // --- List first 20 sprites ---
  const names = [...atlas.sprites.keys()].slice(0, 20);
  spriteListEl.innerHTML = names
    .map((name) => {
      const s = atlas.getByName(name);
      return `<span>${name}</span><br>` +
             `id:${s.id} uv:(${s.uvX.toFixed(3)},${s.uvY.toFixed(3)})<br>`;
    })
    .join('');

  // --- Demonstrate resolveSprite with both name and id ---
  const byName = resolveSprite(atlas, 'bat_placeholder1.png');
  const byId   = resolveSprite(atlas, byName?.id ?? 0);

  console.log('[texture-loader] resolveSprite by name:', byName);
  console.log('[texture-loader] resolveSprite by id:  ', byId);
  console.log(`[texture-loader] same sprite? ${byName === byId}`);
}

main().catch((err) => {
  statusEl.textContent = 'error';
  console.error('[texture-loader]', err);
});
