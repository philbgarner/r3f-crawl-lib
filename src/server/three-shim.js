// src/server/three-shim.js
//
// Minimal Three.js shim for server-side dungeon generation.
// Replaces THREE.DataTexture with a plain object that carries image.data,
// and stubs the numeric constants bsp.ts assigns to texture properties.
// The server only reads solid.image.data, so all other texture details are
// irrelevant — they just need to not throw.

export class DataTexture {
  constructor(data, width, height) {
    this.image = { data, width, height }
    this.needsUpdate = false
    this.name = ''
    this.magFilter = 0
    this.minFilter = 0
    this.generateMipmaps = false
    this.wrapS = 0
    this.wrapT = 0
    this.colorSpace = ''
    this.flipY = false
  }
}

// Numeric constants — values match Three.js r160+ but only need to be
// truthy/assignable; the server never passes them to a GPU.
export const RedFormat          = 1028
export const RGBAFormat         = 1023
export const UnsignedByteType   = 1009
export const NearestFilter      = 1003
export const ClampToEdgeWrapping = 1001
export const NoColorSpace       = ''
