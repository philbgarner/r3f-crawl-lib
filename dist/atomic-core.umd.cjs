(function(global, factory) {
	typeof exports === "object" && typeof module !== "undefined" ? factory(exports, require("three")) : typeof define === "function" && define.amd ? define(["exports", "three"], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global.AtomicCore = {}, global.THREE));
})(this, function(exports, three) {
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
	//#region \0rolldown/runtime.js
	var __create = Object.create;
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __getProtoOf = Object.getPrototypeOf;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
			key = keys[i];
			if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: ((k) => from[k]).bind(null, key),
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
		value: mod,
		enumerable: true
	}) : target, mod));
	//#endregion
	three = __toESM(three, 1);
	//#region src/lib/dungeon/colliderFlags.ts
	/** Normal volitional movement (walk, run) is permitted on this cell. */
	var IS_WALKABLE = 1;
	/**
	* No entity may enter this cell by any means — forced or voluntary.
	* Solid walls carry this flag.  Pits do NOT: they can be entered via forced
	* movement (e.g. a shove) even though they are not IS_WALKABLE.
	*/
	var IS_BLOCKED = 2;
	/** Light and line-of-sight rays pass through this cell unobstructed. */
	var IS_LIGHT_PASSABLE = 4;
	/**
	* Derive a collider-flags byte from a legacy `solid` mask value.
	*   solid === 0  →  floor:  IS_WALKABLE | IS_LIGHT_PASSABLE  (0x05)
	*   solid  > 0  →  wall:   IS_BLOCKED                        (0x02)
	*/
	function colliderFlagsFromSolid(solid) {
		return solid === 0 ? 5 : 2;
	}
	/**
	* Build a colliderFlags Uint8Array from a solid mask of the same length.
	* This is the default derivation used by all dungeon generators.
	*/
	function buildColliderFlags(solidMask) {
		const flags = new Uint8Array(solidMask.length);
		for (let i = 0; i < solidMask.length; i++) flags[i] = colliderFlagsFromSolid(solidMask[i]);
		return flags;
	}
	/** Returns true when the cell may be entered by normal walking movement. */
	function isWalkableCell(flags) {
		return (flags & 1) !== 0 && (flags & 2) === 0;
	}
	/** Returns true when no entity may enter this cell by any means. */
	function isBlockedCell(flags) {
		return (flags & 2) !== 0;
	}
	/** Returns true when light/LOS passes through this cell. */
	function isLightPassableCell(flags) {
		return (flags & 4) !== 0;
	}
	//#endregion
	//#region src/lib/dungeon/bsp.ts
	function hashSeedToUint32(seed) {
		if (seed === void 0) return 305419896;
		if (typeof seed === "number") return seed >>> 0 || 305419896;
		let h = 2166136261;
		for (let i = 0; i < seed.length; i++) {
			h ^= seed.charCodeAt(i);
			h = Math.imul(h, 16777619);
		}
		return h >>> 0;
	}
	function mulberry32(seed) {
		let t = seed >>> 0;
		return function rand() {
			t += 1831565813;
			let x = t;
			x = Math.imul(x ^ x >>> 15, x | 1);
			x ^= x + Math.imul(x ^ x >>> 7, x | 61);
			return ((x ^ x >>> 14) >>> 0) / 4294967296;
		};
	}
	function makeRng$2(seedU32) {
		const r = mulberry32(seedU32);
		return {
			next: () => r(),
			int: (minIncl, maxIncl) => {
				const lo = Math.min(minIncl, maxIncl);
				const hi = Math.max(minIncl, maxIncl);
				return lo + Math.floor(r() * (hi - lo + 1));
			},
			chance: (p) => r() < p
		};
	}
	function inBounds(x, y, W, H) {
		return x >= 0 && y >= 0 && x < W && y < H;
	}
	function idx$1(x, y, w) {
		return y * w + x;
	}
	function carveRect(solid, W, H, r, keepOuterWalls) {
		for (let y = r.y; y <= r.y + r.h - 1; y++) for (let x = r.x; x <= r.x + r.w - 1; x++) {
			if (!inBounds(x, y, W, H)) continue;
			if (keepOuterWalls && (x === 0 || y === 0 || x === W - 1 || y === H - 1)) continue;
			solid[idx$1(x, y, W)] = 0;
		}
	}
	function carvePoint(solid, W, H, p, keepOuterWalls) {
		if (!inBounds(p.x, p.y, W, H)) return;
		if (keepOuterWalls && (p.x === 0 || p.y === 0 || p.x === W - 1 || p.y === H - 1)) return;
		solid[idx$1(p.x, p.y, W)] = 0;
	}
	function carveCorridor(solid, W, H, a, b, corridorWidth, keepOuterWalls) {
		const w = Math.max(1, corridorWidth);
		const dx = Math.sign(b.x - a.x);
		const dy = Math.sign(b.y - a.y);
		const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
		let x = a.x;
		let y = a.y;
		for (let i = 0; i <= steps; i++) {
			const half = Math.floor(w / 2);
			for (let oy = -half; oy <= half; oy++) for (let ox = -half; ox <= half; ox++) carvePoint(solid, W, H, {
				x: x + ox,
				y: y + oy
			}, keepOuterWalls);
			x += dx;
			y += dy;
		}
	}
	function rectCenter(r) {
		return {
			x: r.x + Math.floor(r.w / 2),
			y: r.y + Math.floor(r.h / 2)
		};
	}
	function clampInt(v, lo, hi) {
		return Math.max(lo, Math.min(hi, v));
	}
	function buildBsp(rect, depth, opts, rng) {
		const node = {
			rect,
			depth
		};
		const canSplitBySize = rect.w > opts.maxLeafSize || rect.h > opts.maxLeafSize;
		if (!(depth < opts.maxDepth) && !canSplitBySize) return {
			node,
			maxDepthReached: depth
		};
		const aspect = rect.w / rect.h;
		let splitVertical;
		if (aspect > 1.25) splitVertical = true;
		else if (aspect < .8) splitVertical = false;
		else splitVertical = rng.chance(.5);
		if (splitVertical) {
			const minSplitX = rect.x + opts.splitPadding + opts.minLeafSize;
			const maxSplitX = rect.x + rect.w - opts.splitPadding - opts.minLeafSize;
			if (minSplitX > maxSplitX) return {
				node,
				maxDepthReached: depth
			};
			const splitX = rng.int(minSplitX, maxSplitX);
			const L = buildBsp({
				x: rect.x,
				y: rect.y,
				w: splitX - rect.x,
				h: rect.h
			}, depth + 1, opts, rng);
			const R = buildBsp({
				x: splitX,
				y: rect.y,
				w: rect.x + rect.w - splitX,
				h: rect.h
			}, depth + 1, opts, rng);
			node.left = L.node;
			node.right = R.node;
			return {
				node,
				maxDepthReached: Math.max(L.maxDepthReached, R.maxDepthReached)
			};
		} else {
			const minSplitY = rect.y + opts.splitPadding + opts.minLeafSize;
			const maxSplitY = rect.y + rect.h - opts.splitPadding - opts.minLeafSize;
			if (minSplitY > maxSplitY) return {
				node,
				maxDepthReached: depth
			};
			const splitY = rng.int(minSplitY, maxSplitY);
			const L = buildBsp({
				x: rect.x,
				y: rect.y,
				w: rect.w,
				h: splitY - rect.y
			}, depth + 1, opts, rng);
			const R = buildBsp({
				x: rect.x,
				y: splitY,
				w: rect.w,
				h: rect.y + rect.h - splitY
			}, depth + 1, opts, rng);
			node.left = L.node;
			node.right = R.node;
			return {
				node,
				maxDepthReached: Math.max(L.maxDepthReached, R.maxDepthReached)
			};
		}
	}
	function forEachLeaf(node, fn) {
		if (!node.left && !node.right) {
			fn(node);
			return;
		}
		if (node.left) forEachLeaf(node.left, fn);
		if (node.right) forEachLeaf(node.right, fn);
	}
	function pickRandomPointInRect(r, rng) {
		return {
			x: rng.int(r.x, r.x + r.w - 1),
			y: rng.int(r.y, r.y + r.h - 1)
		};
	}
	function writeRegionRect(regionId, W, H, r, idVal) {
		for (let y = r.y; y <= r.y + r.h - 1; y++) for (let x = r.x; x <= r.x + r.w - 1; x++) {
			if (!inBounds(x, y, W, H)) continue;
			regionId[idx$1(x, y, W)] = idVal;
		}
	}
	function createRooms(root, solid, regionId, floorType, W, H, opts, rng) {
		let nextRoomId = 1;
		forEachLeaf(root, (leaf) => {
			const pad = Math.max(0, opts.roomPadding);
			const availW = Math.max(1, leaf.rect.w - pad * 2);
			const availH = Math.max(1, leaf.rect.h - pad * 2);
			let rw;
			let rh;
			if (rng.chance(opts.roomFillLeafChance)) {
				rw = clampInt(availW, Math.min(opts.minRoomSize, availW), availW);
				rh = clampInt(availH, Math.min(opts.minRoomSize, availH), availH);
			} else {
				rw = clampInt(rng.int(opts.minRoomSize, opts.maxRoomSize), 1, availW);
				rh = clampInt(rng.int(opts.minRoomSize, opts.maxRoomSize), 1, availH);
			}
			const minX = leaf.rect.x + pad;
			const minY = leaf.rect.y + pad;
			const room = {
				x: rng.int(minX, Math.max(minX, leaf.rect.x + leaf.rect.w - pad - rw)),
				y: rng.int(minY, Math.max(minY, leaf.rect.y + leaf.rect.h - pad - rh)),
				w: rw,
				h: rh
			};
			leaf.room = room;
			leaf.roomId = nextRoomId;
			leaf.rep = pickRandomPointInRect(room, rng);
			nextRoomId++;
			if (nextRoomId > 255) nextRoomId = 1;
			carveRect(solid, W, H, room, opts.keepOuterWalls);
			writeRegionRect(regionId, W, H, room, leaf.roomId);
			for (let y = room.y; y <= room.y + room.h - 1; y++) for (let x = room.x; x <= room.x + room.w - 1; x++) {
				if (!inBounds(x, y, W, H)) continue;
				floorType[idx$1(x, y, W)] = 1;
			}
		});
	}
	function connectSiblings(node, solid, W, H, opts, rng, adjacency) {
		if (!node.left && !node.right) {
			if (!node.rep) node.rep = node.room ? rectCenter(node.room) : rectCenter(node.rect);
			return {
				rep: node.rep,
				roomId: node.roomId
			};
		}
		const L = connectSiblings(node.left, solid, W, H, opts, rng, adjacency);
		const R = connectSiblings(node.right, solid, W, H, opts, rng, adjacency);
		if (L.roomId !== R.roomId) {
			if (!adjacency.has(L.roomId)) adjacency.set(L.roomId, /* @__PURE__ */ new Set());
			if (!adjacency.has(R.roomId)) adjacency.set(R.roomId, /* @__PURE__ */ new Set());
			adjacency.get(L.roomId).add(R.roomId);
			adjacency.get(R.roomId).add(L.roomId);
		}
		if (L.rep.x === R.rep.x || L.rep.y === R.rep.y) carveCorridor(solid, W, H, L.rep, R.rep, opts.corridorWidth, opts.keepOuterWalls);
		else if (rng.chance(.5)) {
			const mid = {
				x: R.rep.x,
				y: L.rep.y
			};
			carveCorridor(solid, W, H, L.rep, mid, opts.corridorWidth, opts.keepOuterWalls);
			carveCorridor(solid, W, H, mid, R.rep, opts.corridorWidth, opts.keepOuterWalls);
		} else {
			const mid = {
				x: L.rep.x,
				y: R.rep.y
			};
			carveCorridor(solid, W, H, L.rep, mid, opts.corridorWidth, opts.keepOuterWalls);
			carveCorridor(solid, W, H, mid, R.rep, opts.corridorWidth, opts.keepOuterWalls);
		}
		const useLeft = rng.chance(.5);
		node.rep = useLeft ? L.rep : R.rep;
		return {
			rep: node.rep,
			roomId: useLeft ? L.roomId : R.roomId
		};
	}
	function buildRoomsMap(root, adjacency) {
		const rooms = /* @__PURE__ */ new Map();
		forEachLeaf(root, (leaf) => {
			if (leaf.roomId === void 0 || !leaf.room) return;
			rooms.set(leaf.roomId, {
				id: leaf.roomId,
				type: "room",
				rect: {
					x: leaf.room.x,
					y: leaf.room.y,
					w: leaf.room.w,
					h: leaf.room.h
				},
				connections: Array.from(adjacency.get(leaf.roomId) ?? [])
			});
		});
		return rooms;
	}
	/**
	* Flood-fills corridor floor cells (regionId === 0) into unique connected
	* components, assigning IDs starting from `firstId`. Returns:
	* - `fullRegionIds` - copy of `regionIdData` with corridor cells re-labelled
	* - `corridorRooms`  - a `RoomInfo` entry for every corridor segment, with
	*    its bounding rect and the room IDs it borders in `connections`
	*/
	function assignCorridorRegions(regionIdData, solidData, W, H, firstId) {
		const full = new Uint8Array(regionIdData);
		const visited = new Uint8Array(W * H);
		const corridorRooms = [];
		let nextId = firstId;
		for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
			const i = y * W + x;
			if (solidData[i] !== 0) continue;
			if (regionIdData[i] !== 0) continue;
			if (visited[i]) continue;
			const corridorId = (nextId - 1 & 255) + 1;
			nextId++;
			let minX = x, minY = y, maxX = x, maxY = y;
			const adjacentRooms = /* @__PURE__ */ new Set();
			const queue = [i];
			visited[i] = 1;
			let head = 0;
			while (head < queue.length) {
				const ci = queue[head++];
				full[ci] = corridorId;
				const cx = ci % W;
				const cy = ci / W | 0;
				if (cx < minX) minX = cx;
				if (cx > maxX) maxX = cx;
				if (cy < minY) minY = cy;
				if (cy > maxY) maxY = cy;
				for (const [dx, dy] of [
					[-1, 0],
					[1, 0],
					[0, -1],
					[0, 1]
				]) {
					const nx = cx + dx;
					const ny = cy + dy;
					if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
					const ni = ny * W + nx;
					const nReg = regionIdData[ni];
					if (nReg !== 0) {
						if (solidData[ni] === 0) adjacentRooms.add(nReg);
						continue;
					}
					if (visited[ni] || solidData[ni] !== 0) continue;
					visited[ni] = 1;
					queue.push(ni);
				}
			}
			corridorRooms.push({
				id: corridorId,
				type: "corridor",
				rect: {
					x: minX,
					y: minY,
					w: maxX - minX + 1,
					h: maxY - minY + 1
				},
				connections: Array.from(adjacentRooms)
			});
		}
		return {
			fullRegionIds: full,
			corridorRooms
		};
	}
	function pickStartEndRooms$1(adjacency) {
		const allRooms = Array.from(adjacency.keys());
		if (allRooms.length === 0) return {
			startRoomId: 1,
			endRoomId: 1
		};
		if (allRooms.length === 1) return {
			startRoomId: allRooms[0],
			endRoomId: allRooms[0]
		};
		const deadEnds = allRooms.filter((id) => (adjacency.get(id)?.size ?? 0) === 1);
		const candidates = deadEnds.length > 0 ? deadEnds : allRooms;
		function bfsFurthest(startId) {
			const dist = /* @__PURE__ */ new Map();
			dist.set(startId, 0);
			const queue = [startId];
			let furthestId = startId;
			let furthestDist = 0;
			let head = 0;
			while (head < queue.length) {
				const cur = queue[head++];
				const d = dist.get(cur);
				for (const nb of adjacency.get(cur) ?? []) if (!dist.has(nb)) {
					dist.set(nb, d + 1);
					queue.push(nb);
					if (d + 1 > furthestDist) {
						furthestDist = d + 1;
						furthestId = nb;
					}
				}
			}
			return {
				id: furthestId,
				dist: furthestDist
			};
		}
		let endRoomId = candidates[0];
		let bestDist = -1;
		for (const cand of candidates) {
			const { dist: d } = bfsFurthest(cand);
			if (d > bestDist) {
				bestDist = d;
				endRoomId = cand;
			}
		}
		const { id: startRoomId } = bfsFurthest(endRoomId);
		return {
			startRoomId,
			endRoomId
		};
	}
	function computeDistanceToWall$1(solid, W, H) {
		const dist = new Uint16Array(W * H);
		const INF = 65535;
		dist.fill(INF);
		const q = new Int32Array(W * H);
		let qh = 0;
		let qt = 0;
		for (let i = 0; i < W * H; i++) if (solid[i] === 255) {
			dist[i] = 0;
			q[qt++] = i;
		}
		if (qt === 0) {
			const out = new Uint8Array(W * H);
			out.fill(255);
			return out;
		}
		const neighbors = [
			{
				dx: 1,
				dy: 0
			},
			{
				dx: -1,
				dy: 0
			},
			{
				dx: 0,
				dy: 1
			},
			{
				dx: 0,
				dy: -1
			}
		];
		while (qh < qt) {
			const i = q[qh++];
			const x = i % W;
			const y = i / W | 0;
			const next = dist[i] + 1;
			for (const n of neighbors) {
				const nx = x + n.dx;
				const ny = y + n.dy;
				if (!inBounds(nx, ny, W, H)) continue;
				const ni = idx$1(nx, ny, W);
				if (next < dist[ni]) {
					dist[ni] = next;
					q[qt++] = ni;
				}
			}
		}
		const out = new Uint8Array(W * H);
		for (let i = 0; i < W * H; i++) {
			const d = dist[i];
			out[i] = d === INF ? 255 : d > 255 ? 255 : d;
		}
		return out;
	}
	function maskToDataTextureR8$1(mask, W, H, name) {
		const tex = new three.DataTexture(mask, W, H, three.RedFormat, three.UnsignedByteType);
		tex.name = name;
		tex.needsUpdate = true;
		tex.magFilter = three.NearestFilter;
		tex.minFilter = three.NearestFilter;
		tex.generateMipmaps = false;
		tex.wrapS = three.ClampToEdgeWrapping;
		tex.wrapT = three.ClampToEdgeWrapping;
		tex.colorSpace = three.NoColorSpace;
		tex.flipY = false;
		return tex;
	}
	function maskToDataTextureRGBA$1(mask, W, H, name) {
		const tex = new three.DataTexture(mask, W, H, three.RGBAFormat, three.UnsignedByteType);
		tex.name = name;
		tex.needsUpdate = true;
		tex.magFilter = three.NearestFilter;
		tex.minFilter = three.NearestFilter;
		tex.generateMipmaps = false;
		tex.wrapS = three.ClampToEdgeWrapping;
		tex.wrapT = three.ClampToEdgeWrapping;
		tex.colorSpace = three.NoColorSpace;
		tex.flipY = false;
		return tex;
	}
	function generateBspDungeon(options) {
		const opts = {
			width: options.width,
			height: options.height,
			seed: options.seed ?? 305419896,
			maxDepth: options.maxDepth ?? 6,
			minLeafSize: options.minLeafSize ?? 12,
			maxLeafSize: options.maxLeafSize ?? 28,
			splitPadding: options.splitPadding ?? 2,
			roomPadding: options.roomPadding ?? 1,
			minRoomSize: options.minRoomSize ?? 5,
			maxRoomSize: options.maxRoomSize ?? 14,
			roomFillLeafChance: options.roomFillLeafChance ?? .08,
			corridorWidth: options.corridorWidth ?? 1,
			corridorStyle: options.corridorStyle ?? "straight-or-z",
			keepOuterWalls: options.keepOuterWalls ?? true
		};
		if (opts.width <= 2 || opts.height <= 2) throw new Error("generateBspDungeon: width/height must be > 2");
		if (opts.minLeafSize < 4) throw new Error("generateBspDungeon: minLeafSize too small (recommend >= 4)");
		const seedUsed = hashSeedToUint32(opts.seed);
		const rng = makeRng$2(seedUsed);
		const W = opts.width;
		const H = opts.height;
		const solid = new Uint8Array(W * H);
		solid.fill(255);
		const regionId = new Uint8Array(W * H);
		const floorType = new Uint8Array(W * H);
		const wallType = new Uint8Array(W * H);
		const overlays = new Uint8Array(4 * W * H);
		const wallOverlays = new Uint8Array(4 * W * H);
		const ceilingType = new Uint8Array(W * H);
		const ceilingOverlays = new Uint8Array(4 * W * H);
		const floorSkirtType = new Uint8Array(4 * W * H);
		const ceilSkirtType = new Uint8Array(4 * W * H);
		const floorHeightOffset = new Uint8Array(W * H);
		floorHeightOffset.fill(128);
		const ceilingHeightOffset = new Uint8Array(W * H);
		ceilingHeightOffset.fill(128);
		const { node: root } = buildBsp({
			x: 0,
			y: 0,
			w: W,
			h: H
		}, 0, {
			maxDepth: opts.maxDepth,
			minLeafSize: opts.minLeafSize,
			maxLeafSize: opts.maxLeafSize,
			splitPadding: opts.splitPadding
		}, rng);
		createRooms(root, solid, regionId, floorType, W, H, {
			roomPadding: opts.roomPadding,
			minRoomSize: opts.minRoomSize,
			maxRoomSize: opts.maxRoomSize,
			roomFillLeafChance: opts.roomFillLeafChance,
			keepOuterWalls: opts.keepOuterWalls
		}, rng);
		const adjacency = /* @__PURE__ */ new Map();
		connectSiblings(root, solid, W, H, {
			corridorWidth: opts.corridorWidth,
			keepOuterWalls: opts.keepOuterWalls
		}, rng, adjacency);
		const { startRoomId, endRoomId } = pickStartEndRooms$1(adjacency);
		const rooms = buildRoomsMap(root, adjacency);
		const firstCorridorRegionId = (rooms.size > 0 ? Math.max(...rooms.keys()) : 0) + 1;
		const { fullRegionIds, corridorRooms } = assignCorridorRegions(regionId, solid, W, H, firstCorridorRegionId);
		for (const cr of corridorRooms) rooms.set(cr.id, cr);
		regionId.set(fullRegionIds);
		{
			const queue = [];
			for (let i = 0; i < W * H; i++) if (solid[i] === 0 && floorType[i] > 0) queue.push(i);
			let qh = 0;
			while (qh < queue.length) {
				const ci = queue[qh++];
				const cx = ci % W;
				const cy = ci / W | 0;
				const neighbors = [
					cy > 0 ? ci - W : -1,
					cy < H - 1 ? ci + W : -1,
					cx > 0 ? ci - 1 : -1,
					cx < W - 1 ? ci + 1 : -1
				];
				for (const ni of neighbors) {
					if (ni < 0) continue;
					if (solid[ni] !== 0 || floorType[ni] !== 0) continue;
					floorType[ni] = floorType[ci];
					queue.push(ni);
				}
			}
		}
		{
			const queue = [];
			for (let i = 0; i < W * H; i++) if (solid[i] === 0 && floorType[i] > 0) queue.push(i);
			let qh = 0;
			while (qh < queue.length) {
				const ci = queue[qh++];
				const cx = ci % W;
				const cy = ci / W | 0;
				const neighbors = [
					cy > 0 ? ci - W : -1,
					cy < H - 1 ? ci + W : -1,
					cx > 0 ? ci - 1 : -1,
					cx < W - 1 ? ci + 1 : -1
				];
				for (const ni of neighbors) {
					if (ni < 0) continue;
					if (solid[ni] === 0 || wallType[ni] !== 0) continue;
					wallType[ni] = solid[ci] === 0 ? floorType[ci] : wallType[ci];
					queue.push(ni);
				}
			}
		}
		for (let i = 0; i < W * H; i++) if (solid[i] === 0) ceilingType[i] = 1;
		const temperature = new Uint8Array(W * H);
		for (let i = 0; i < W * H; i++) if (solid[i] === 0) temperature[i] = 127;
		const distanceToWall = computeDistanceToWall$1(solid, W, H);
		const hazards = new Uint8Array(W * H);
		const colliderFlagsArr = buildColliderFlags(solid);
		return {
			width: W,
			height: H,
			seed: seedUsed,
			endRoomId,
			startRoomId,
			rooms,
			fullRegionIds,
			firstCorridorRegionId,
			textures: {
				solid: maskToDataTextureR8$1(solid, W, H, "bsp_dungeon_solid"),
				regionId: maskToDataTextureR8$1(regionId, W, H, "bsp_dungeon_region_id"),
				distanceToWall: maskToDataTextureR8$1(distanceToWall, W, H, "bsp_dungeon_distance_to_wall"),
				hazards: maskToDataTextureR8$1(hazards, W, H, "bsp_dungeon_hazards"),
				temperature: maskToDataTextureR8$1(temperature, W, H, "bsp_dungeon_temperature"),
				floorType: maskToDataTextureR8$1(floorType, W, H, "bsp_dungeon_floor_type"),
				overlays: maskToDataTextureRGBA$1(overlays, W, H, "bsp_dungeon_overlays"),
				wallType: maskToDataTextureR8$1(wallType, W, H, "bsp_dungeon_wall_type"),
				wallOverlays: maskToDataTextureRGBA$1(wallOverlays, W, H, "bsp_dungeon_wall_overlays"),
				ceilingType: maskToDataTextureR8$1(ceilingType, W, H, "bsp_dungeon_ceiling_type"),
				ceilingOverlays: maskToDataTextureRGBA$1(ceilingOverlays, W, H, "bsp_dungeon_ceiling_overlays"),
				floorSkirtType: maskToDataTextureRGBA$1(floorSkirtType, W, H, "bsp_dungeon_floor_skirt_type"),
				ceilSkirtType: maskToDataTextureRGBA$1(ceilSkirtType, W, H, "bsp_dungeon_ceil_skirt_type"),
				floorHeightOffset: maskToDataTextureR8$1(floorHeightOffset, W, H, "bsp_dungeon_floor_height_offset"),
				ceilingHeightOffset: maskToDataTextureR8$1(ceilingHeightOffset, W, H, "bsp_dungeon_ceiling_height_offset"),
				colliderFlags: maskToDataTextureR8$1(colliderFlagsArr, W, H, "bsp_dungeon_collider_flags")
			}
		};
	}
	/**
	* Write floor skirt overlay tile IDs for a single cell.
	* `tiles` is an array of up to 4 numeric tile IDs corresponding to RGBA slots 1–4.
	* Missing entries are left unchanged; pass 0 to clear a slot.
	*/
	function setFloorSkirtTiles(outputs, cx, cz, tiles) {
		const data = outputs.textures.floorSkirtType.image.data;
		const base = (cz * outputs.width + cx) * 4;
		for (let i = 0; i < 4 && i < tiles.length; i++) if (tiles[i] !== void 0) data[base + i] = tiles[i];
		outputs.textures.floorSkirtType.needsUpdate = true;
	}
	/**
	* Write ceiling skirt overlay tile IDs for a single cell.
	* `tiles` is an array of up to 4 numeric tile IDs corresponding to RGBA slots 1–4.
	* Missing entries are left unchanged; pass 0 to clear a slot.
	*/
	function setCeilSkirtTiles(outputs, cx, cz, tiles) {
		const data = outputs.textures.ceilSkirtType.image.data;
		const base = (cz * outputs.width + cx) * 4;
		for (let i = 0; i < 4 && i < tiles.length; i++) if (tiles[i] !== void 0) data[base + i] = tiles[i];
		outputs.textures.ceilSkirtType.needsUpdate = true;
	}
	//#endregion
	//#region src/lib/dungeon/cellular.ts
	function hashSeed(seed) {
		if (seed === void 0) return 305419896;
		if (typeof seed === "number") return seed >>> 0 || 305419896;
		let h = 2166136261;
		for (let i = 0; i < seed.length; i++) {
			h ^= seed.charCodeAt(i);
			h = Math.imul(h, 16777619);
		}
		return h >>> 0;
	}
	function makeRng$1(seedU32) {
		let t = seedU32 >>> 0;
		return () => {
			t += 1831565813;
			let x = t;
			x = Math.imul(x ^ x >>> 15, x | 1);
			x ^= x + Math.imul(x ^ x >>> 7, x | 61);
			return ((x ^ x >>> 14) >>> 0) / 4294967296;
		};
	}
	function idx(x, y, W) {
		return y * W + x;
	}
	function countWallNeighbours(solid, x, y, W, H) {
		let count = 0;
		for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
			if (dx === 0 && dy === 0) continue;
			const nx = x + dx;
			const ny = y + dy;
			if (nx < 0 || ny < 0 || nx >= W || ny >= H || solid[idx(nx, ny, W)] !== 0) count++;
		}
		return count;
	}
	function floodFill(solid, W, H, startIdx, visited) {
		const region = [];
		const queue = [startIdx];
		visited[startIdx] = 1;
		let head = 0;
		while (head < queue.length) {
			const i = queue[head++];
			region.push(i);
			const x = i % W;
			const y = i / W | 0;
			const neighbours = [
				x - 1 >= 0 ? idx(x - 1, y, W) : -1,
				x + 1 < W ? idx(x + 1, y, W) : -1,
				y - 1 >= 0 ? idx(x, y - 1, W) : -1,
				y + 1 < H ? idx(x, y + 1, W) : -1
			];
			for (const ni of neighbours) if (ni !== -1 && !visited[ni] && solid[ni] === 0) {
				visited[ni] = 1;
				queue.push(ni);
			}
		}
		return region;
	}
	function computeDistanceToWall(solid, W, H) {
		const dist = new Uint16Array(W * H).fill(65535);
		const queue = new Int32Array(W * H);
		let qh = 0;
		let qt = 0;
		for (let i = 0; i < W * H; i++) if (solid[i] !== 0) {
			dist[i] = 0;
			queue[qt++] = i;
		}
		const DX = [
			1,
			-1,
			0,
			0
		];
		const DY = [
			0,
			0,
			1,
			-1
		];
		while (qh < qt) {
			const i = queue[qh++];
			const x = i % W;
			const y = i / W | 0;
			const next = dist[i] + 1;
			for (let d = 0; d < 4; d++) {
				const nx = x + DX[d];
				const ny = y + DY[d];
				if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
				const ni = idx(nx, ny, W);
				if (next < dist[ni]) {
					dist[ni] = next;
					queue[qt++] = ni;
				}
			}
		}
		const out = new Uint8Array(W * H);
		for (let i = 0; i < W * H; i++) {
			const d = dist[i];
			out[i] = d === 65535 ? 255 : d > 255 ? 255 : d;
		}
		return out;
	}
	function maskToDataTextureR8(mask, W, H, name) {
		const tex = new three.DataTexture(mask, W, H, three.RedFormat, three.UnsignedByteType);
		tex.name = name;
		tex.needsUpdate = true;
		tex.magFilter = three.NearestFilter;
		tex.minFilter = three.NearestFilter;
		tex.generateMipmaps = false;
		tex.wrapS = three.ClampToEdgeWrapping;
		tex.wrapT = three.ClampToEdgeWrapping;
		tex.colorSpace = three.NoColorSpace;
		tex.flipY = false;
		return tex;
	}
	function maskToDataTextureRGBA(mask, W, H, name) {
		const tex = new three.DataTexture(mask, W, H, three.RGBAFormat, three.UnsignedByteType);
		tex.name = name;
		tex.needsUpdate = true;
		tex.magFilter = three.NearestFilter;
		tex.minFilter = three.NearestFilter;
		tex.generateMipmaps = false;
		tex.wrapS = three.ClampToEdgeWrapping;
		tex.wrapT = three.ClampToEdgeWrapping;
		tex.colorSpace = three.NoColorSpace;
		tex.flipY = false;
		return tex;
	}
	/**
	* Assign Voronoi room IDs by doing a multi-source BFS from the local maxima of
	* the distanceToWall field. Each local maximum seeds one "room"; every reachable
	* floor cell is claimed by the nearest seed. The regionId array (1..N, 0 = wall)
	* is written in-place and the full room graph is returned.
	*/
	function buildVoronoiRooms(solid, dtw, W, H) {
		const MIN_SEED_DIST = 2;
		const DX = [
			1,
			-1,
			0,
			0
		];
		const DY = [
			0,
			0,
			1,
			-1
		];
		const seeds = [];
		for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
			const i = idx(x, y, W);
			if (solid[i] !== 0) continue;
			const d = dtw[i];
			if (d < MIN_SEED_DIST) continue;
			if (d > (x > 0 ? dtw[idx(x - 1, y, W)] : 0) && d > (x < W - 1 ? dtw[idx(x + 1, y, W)] : 0) && d > (y > 0 ? dtw[idx(x, y - 1, W)] : 0) && d > (y < H - 1 ? dtw[idx(x, y + 1, W)] : 0)) seeds.push(i);
		}
		if (seeds.length === 0) {
			let bestIdx = -1, bestDist = -1;
			for (let i = 0; i < W * H; i++) if (solid[i] === 0 && dtw[i] > bestDist) {
				bestDist = dtw[i];
				bestIdx = i;
			}
			if (bestIdx >= 0) seeds.push(bestIdx);
		}
		if (seeds.length > 254) seeds.length = 254;
		const N = seeds.length;
		const regionIdArr = new Uint8Array(W * H);
		const queue = new Int32Array(W * H);
		let qh = 0, qt = 0;
		for (let s = 0; s < N; s++) {
			const si = seeds[s];
			regionIdArr[si] = s + 1;
			queue[qt++] = si;
		}
		while (qh < qt) {
			const i = queue[qh++];
			const x = i % W, y = i / W | 0;
			const rid = regionIdArr[i];
			for (let d = 0; d < 4; d++) {
				const nx = x + DX[d], ny = y + DY[d];
				if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
				const ni = idx(nx, ny, W);
				if (solid[ni] !== 0 || regionIdArr[ni] !== 0) continue;
				regionIdArr[ni] = rid;
				queue[qt++] = ni;
			}
		}
		const minX = new Int32Array(N + 1).fill(W);
		const minY = new Int32Array(N + 1).fill(H);
		const maxX = new Int32Array(N + 1).fill(-1);
		const maxY = new Int32Array(N + 1).fill(-1);
		const adj = /* @__PURE__ */ new Map();
		for (let i = 1; i <= N; i++) adj.set(i, /* @__PURE__ */ new Set());
		for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
			const rid = regionIdArr[idx(x, y, W)] ?? 0;
			if (rid === 0) continue;
			if (x < (minX[rid] ?? W)) minX[rid] = x;
			if (x > (maxX[rid] ?? -1)) maxX[rid] = x;
			if (y < (minY[rid] ?? H)) minY[rid] = y;
			if (y > (maxY[rid] ?? -1)) maxY[rid] = y;
			if (x + 1 < W) {
				const nr = regionIdArr[idx(x + 1, y, W)] ?? 0;
				if (nr !== 0 && nr !== rid) {
					adj.get(rid).add(nr);
					adj.get(nr).add(rid);
				}
			}
			if (y + 1 < H) {
				const nr = regionIdArr[idx(x, y + 1, W)] ?? 0;
				if (nr !== 0 && nr !== rid) {
					adj.get(rid).add(nr);
					adj.get(nr).add(rid);
				}
			}
		}
		const rooms = /* @__PURE__ */ new Map();
		for (let i = 1; i <= N; i++) {
			const rx = minX[i] ?? 0, ry = minY[i] ?? 0;
			const rw = (maxX[i] ?? rx) - rx + 1, rh = (maxY[i] ?? ry) - ry + 1;
			rooms.set(i, {
				id: i,
				type: "room",
				rect: {
					x: rx,
					y: ry,
					w: rw,
					h: rh
				},
				connections: [...adj.get(i) ?? []]
			});
		}
		const { startRoomId, endRoomId } = pickStartEndRooms(adj);
		return {
			regionIdArr,
			rooms,
			firstCorridorRegionId: N + 1,
			startRoomId,
			endRoomId
		};
	}
	function pickStartEndRooms(adjacency) {
		const allRooms = Array.from(adjacency.keys());
		if (allRooms.length === 0) return {
			startRoomId: 1,
			endRoomId: 1
		};
		if (allRooms.length === 1) return {
			startRoomId: allRooms[0],
			endRoomId: allRooms[0]
		};
		const deadEnds = allRooms.filter((id) => (adjacency.get(id)?.size ?? 0) === 1);
		const candidates = deadEnds.length > 0 ? deadEnds : allRooms;
		function bfsFurthest(startId) {
			const dist = /* @__PURE__ */ new Map();
			dist.set(startId, 0);
			const q = [startId];
			let head = 0, furthestId = startId, furthestDist = 0;
			while (head < q.length) {
				const cur = q[head++];
				const d = dist.get(cur);
				for (const nb of adjacency.get(cur) ?? []) if (!dist.has(nb)) {
					dist.set(nb, d + 1);
					q.push(nb);
					if (d + 1 > furthestDist) {
						furthestDist = d + 1;
						furthestId = nb;
					}
				}
			}
			return {
				id: furthestId,
				dist: furthestDist
			};
		}
		let endRoomId = candidates[0];
		let bestDist = -1;
		for (const cand of candidates) {
			const { dist: d } = bfsFurthest(cand);
			if (d > bestDist) {
				bestDist = d;
				endRoomId = cand;
			}
		}
		const { id: startRoomId } = bfsFurthest(endRoomId);
		return {
			startRoomId,
			endRoomId
		};
	}
	/**
	* Generate a cellular-automata cave dungeon.
	* Unlike BSP, there is no explicit room graph; use regionId for flood-fill regions.
	* Pass the output directly to generateContent() as it shares the same texture layout.
	*/
	function generateCellularDungeon(options) {
		const W = options.width;
		const H = options.height;
		if (W <= 2 || H <= 2) throw new Error("generateCellularDungeon: width/height must be > 2");
		const fillProbability = options.fillProbability ?? .45;
		const iterations = options.iterations ?? 5;
		const birthThreshold = options.birthThreshold ?? 5;
		const survivalThreshold = options.survivalThreshold ?? 4;
		const keepOuterWalls = options.keepOuterWalls ?? true;
		const seedU32 = hashSeed(options.seed);
		const rand = makeRng$1(seedU32);
		let solid = new Uint8Array(W * H);
		for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (keepOuterWalls && (x === 0 || y === 0 || x === W - 1 || y === H - 1)) solid[idx(x, y, W)] = 255;
		else solid[idx(x, y, W)] = rand() < fillProbability ? 255 : 0;
		const next = new Uint8Array(W * H);
		for (let iter = 0; iter < iterations; iter++) {
			for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
				if (keepOuterWalls && (x === 0 || y === 0 || x === W - 1 || y === H - 1)) {
					next[idx(x, y, W)] = 255;
					continue;
				}
				const walls = countWallNeighbours(solid, x, y, W, H);
				const isWall = solid[idx(x, y, W)] !== 0;
				next[idx(x, y, W)] = isWall ? walls >= survivalThreshold ? 255 : 0 : walls >= birthThreshold ? 255 : 0;
			}
			solid.set(next);
		}
		const visited = new Uint8Array(W * H);
		let largestRegion = [];
		for (let i = 0; i < W * H; i++) if (solid[i] === 0 && !visited[i]) {
			const region = floodFill(solid, W, H, i, visited);
			if (region.length > largestRegion.length) largestRegion = region;
		}
		solid.fill(255);
		for (const i of largestRegion) solid[i] = 0;
		const distanceToWall = computeDistanceToWall(solid, W, H);
		const { regionIdArr, rooms, firstCorridorRegionId, startRoomId, endRoomId } = buildVoronoiRooms(solid, distanceToWall, W, H);
		const hazards = new Uint8Array(W * H);
		const colliderFlagsArr = buildColliderFlags(solid);
		const temperature = new Uint8Array(W * H);
		for (let i = 0; i < W * H; i++) if (solid[i] === 0) temperature[i] = 127;
		const floorType = new Uint8Array(W * H);
		const wallType = new Uint8Array(W * H);
		const overlays = new Uint8Array(4 * W * H);
		const wallOverlays = new Uint8Array(4 * W * H);
		const ceilingType = new Uint8Array(W * H);
		const ceilingOverlays = new Uint8Array(4 * W * H);
		const floorSkirtType = new Uint8Array(4 * W * H);
		const ceilSkirtType = new Uint8Array(4 * W * H);
		for (let i = 0; i < W * H; i++) if (solid[i] === 0) ceilingType[i] = 1;
		return {
			width: W,
			height: H,
			seed: seedU32,
			startRoomId,
			endRoomId,
			rooms,
			fullRegionIds: regionIdArr,
			firstCorridorRegionId,
			textures: {
				solid: maskToDataTextureR8(solid, W, H, "cellular_solid"),
				regionId: maskToDataTextureR8(regionIdArr, W, H, "cellular_region_id"),
				distanceToWall: maskToDataTextureR8(distanceToWall, W, H, "cellular_distance_to_wall"),
				hazards: maskToDataTextureR8(hazards, W, H, "cellular_hazards"),
				temperature: maskToDataTextureR8(temperature, W, H, "cellular_temperature"),
				floorType: maskToDataTextureR8(floorType, W, H, "cellular_floor_type"),
				overlays: maskToDataTextureRGBA(overlays, W, H, "cellular_overlays"),
				wallType: maskToDataTextureR8(wallType, W, H, "cellular_wall_type"),
				wallOverlays: maskToDataTextureRGBA(wallOverlays, W, H, "cellular_wall_overlays"),
				ceilingType: maskToDataTextureR8(ceilingType, W, H, "cellular_ceiling_type"),
				ceilingOverlays: maskToDataTextureRGBA(ceilingOverlays, W, H, "cellular_ceiling_overlays"),
				colliderFlags: maskToDataTextureR8(colliderFlagsArr, W, H, "cellular_collider_flags"),
				floorSkirtType: maskToDataTextureRGBA(floorSkirtType, W, H, "cellular_floor_skirt_type"),
				ceilSkirtType: maskToDataTextureRGBA(ceilSkirtType, W, H, "cellular_ceil_skirt_type")
			}
		};
	}
	//#endregion
	//#region src/lib/dungeon/tiled.ts
	function r8Texture(data, W, H, name) {
		const tex = new three.DataTexture(data, W, H, three.RedFormat, three.UnsignedByteType);
		tex.name = name;
		tex.needsUpdate = true;
		tex.magFilter = three.NearestFilter;
		tex.minFilter = three.NearestFilter;
		tex.generateMipmaps = false;
		tex.wrapS = three.ClampToEdgeWrapping;
		tex.wrapT = three.ClampToEdgeWrapping;
		tex.colorSpace = three.NoColorSpace;
		tex.flipY = false;
		return tex;
	}
	function rgbaTexture(data, W, H, name) {
		const tex = new three.DataTexture(data, W, H, three.RGBAFormat, three.UnsignedByteType);
		tex.name = name;
		tex.needsUpdate = true;
		tex.magFilter = three.NearestFilter;
		tex.minFilter = three.NearestFilter;
		tex.generateMipmaps = false;
		tex.wrapS = three.ClampToEdgeWrapping;
		tex.wrapT = three.ClampToEdgeWrapping;
		tex.colorSpace = three.NoColorSpace;
		tex.flipY = false;
		return tex;
	}
	/**
	* Convert a parsed Tiled JSON export to `TiledMapOutputs` (a `DungeonOutputs`
	* superset that also carries the parsed object placements).
	*
	* @param tiledJson  Raw object from `JSON.parse` of a Tiled .tmj / .json export.
	* @param options    Developer-supplied channel map, GID→value map, and object-type map.
	*/
	function loadTiledMap(tiledJson, options) {
		const json = tiledJson;
		const W = json.width;
		const H = json.height;
		const tileW = json.tilewidth ?? 1;
		const tileH = json.tileheight ?? 1;
		const { layers: layerMap, tilesetMap, objectTypes, objectLayer, seed = 0 } = options;
		const layersByName = /* @__PURE__ */ new Map();
		for (const layer of json.layers) layersByName.set(layer.name, layer);
		/** Build an R8 (1 byte/cell) channel from a named tile layer. */
		function buildR8(layerName) {
			const out = new Uint8Array(W * H);
			if (!layerName) return out;
			const layer = layersByName.get(layerName);
			if (!layer || layer.type !== "tilelayer" || !layer.data) return out;
			for (let i = 0; i < W * H; i++) {
				const gid = layer.data[i] ?? 0;
				out[i] = gid === 0 ? 0 : tilesetMap[gid] ?? 0;
			}
			return out;
		}
		/**
		* Build an RGBA (4 bytes/cell) channel from a named tile layer.
		* The mapped GID value is written into the R byte; G/B/A remain 0.
		* This matches how bsp.ts encodes the overlays/wallOverlays/ceilingOverlays channels.
		*/
		function buildRGBA(layerName) {
			const out = new Uint8Array(W * H * 4);
			if (!layerName) return out;
			const layer = layersByName.get(layerName);
			if (!layer || layer.type !== "tilelayer" || !layer.data) return out;
			for (let i = 0; i < W * H; i++) {
				const gid = layer.data[i] ?? 0;
				out[i * 4] = gid === 0 ? 0 : tilesetMap[gid] ?? 0;
			}
			return out;
		}
		const solidArr = buildR8(layerMap.solid);
		let tempArr;
		if (layerMap.temperature) tempArr = buildR8(layerMap.temperature);
		else {
			tempArr = new Uint8Array(W * H);
			for (let i = 0; i < W * H; i++) tempArr[i] = solidArr[i] === 0 ? 127 : 0;
		}
		const colliderFlagsArr = layerMap.colliderFlags ? buildR8(layerMap.colliderFlags) : buildColliderFlags(solidArr);
		const textures = {
			solid: r8Texture(solidArr, W, H, "solid"),
			regionId: r8Texture(buildR8(layerMap.regionId), W, H, "regionId"),
			distanceToWall: r8Texture(buildR8(layerMap.distanceToWall), W, H, "distanceToWall"),
			hazards: r8Texture(buildR8(layerMap.hazards), W, H, "hazards"),
			temperature: r8Texture(tempArr, W, H, "temperature"),
			floorType: r8Texture(buildR8(layerMap.floorType), W, H, "floorType"),
			overlays: rgbaTexture(buildRGBA(layerMap.overlays), W, H, "overlays"),
			wallType: r8Texture(buildR8(layerMap.wallType), W, H, "wallType"),
			wallOverlays: rgbaTexture(buildRGBA(layerMap.wallOverlays), W, H, "wallOverlays"),
			ceilingType: r8Texture(buildR8(layerMap.ceilingType), W, H, "ceilingType"),
			ceilingOverlays: rgbaTexture(buildRGBA(layerMap.ceilingOverlays), W, H, "ceilingOverlays"),
			colliderFlags: r8Texture(colliderFlagsArr, W, H, "colliderFlags"),
			floorSkirtType: rgbaTexture(new Uint8Array(W * H * 4), W, H, "floorSkirtType"),
			ceilSkirtType: rgbaTexture(new Uint8Array(W * H * 4), W, H, "ceilSkirtType")
		};
		const objectPlacements = [];
		if (objectLayer) {
			const layer = layersByName.get(objectLayer);
			if (layer && layer.type === "objectgroup" && layer.objects) for (const obj of layer.objects) {
				const placementType = objectTypes[obj.type];
				if (!placementType) continue;
				const gridX = Math.floor((obj.x + obj.width / 2) / tileW);
				const gridZ = Math.floor((obj.y + obj.height / 2) / tileH);
				const meta = {
					tiledId: obj.id,
					tiledName: obj.name
				};
				if (obj.properties) for (const prop of obj.properties) meta[prop.name] = prop.value;
				objectPlacements.push({
					x: gridX,
					z: gridZ,
					type: placementType,
					meta
				});
			}
		}
		return {
			width: W,
			height: H,
			seed,
			textures,
			objectPlacements
		};
	}
	//#endregion
	//#region src/lib/turn/scheduler.ts
	var MinHeap$1 = class {
		constructor() {
			this._heap = [];
		}
		get size() {
			return this._heap.length;
		}
		push(priority, value) {
			this._heap.push({
				priority,
				value
			});
			this._bubbleUp(this._heap.length - 1);
		}
		pop() {
			if (this._heap.length === 0) return void 0;
			const top = this._heap[0].value;
			const last = this._heap.pop();
			if (this._heap.length > 0) {
				this._heap[0] = last;
				this._siftDown(0);
			}
			return top;
		}
		_bubbleUp(i) {
			while (i > 0) {
				const parent = i - 1 >> 1;
				if (this._heap[parent].priority <= this._heap[i].priority) break;
				const tmp = this._heap[parent];
				this._heap[parent] = this._heap[i];
				this._heap[i] = tmp;
				i = parent;
			}
		}
		_siftDown(i) {
			const n = this._heap.length;
			while (true) {
				let smallest = i;
				const l = 2 * i + 1;
				const r = 2 * i + 2;
				if (l < n && this._heap[l].priority < this._heap[smallest].priority) smallest = l;
				if (r < n && this._heap[r].priority < this._heap[smallest].priority) smallest = r;
				if (smallest === i) break;
				const tmp = this._heap[smallest];
				this._heap[smallest] = this._heap[i];
				this._heap[i] = tmp;
				i = smallest;
			}
		}
	};
	var TurnScheduler = class {
		constructor() {
			this.heap = new MinHeap$1();
			this.now = 0;
			this.seq = 0;
			this.cancelled = /* @__PURE__ */ new Set();
		}
		/** Schedule an actor to act at now + delay. */
		add(actorId, delay) {
			const at = this.now + delay;
			const seq = this.seq++;
			const priority = at + seq % 1e6 / 1e6;
			this.heap.push(priority, {
				actorId,
				at,
				seq
			});
		}
		/** Lazily remove an actor from the schedule. */
		remove(actorId) {
			this.cancelled.add(actorId);
		}
		/** Re-add a cancelled actor (un-cancels it too). */
		restore(actorId) {
			this.cancelled.delete(actorId);
		}
		/**
		* Pop the next actor whose turn it is.
		* Advances now to the actor's scheduled time.
		* Returns null if the schedule is empty.
		*/
		next() {
			while (this.heap.size > 0) {
				const entry = this.heap.pop();
				if (this.cancelled.has(entry.actorId)) {
					this.cancelled.delete(entry.actorId);
					continue;
				}
				this.now = entry.at;
				return {
					actorId: entry.actorId,
					now: this.now
				};
			}
			return null;
		}
		/** Re-schedule an actor after it has acted. */
		reschedule(actorId, delay) {
			this.add(actorId, delay);
		}
		/** Return the current absolute time (updated by `next()`). */
		getNow() {
			return this.now;
		}
		get size() {
			return this.heap.size;
		}
	};
	var ACTION_MULTIPLIER = {
		wait: 1,
		move: 1,
		attack: 2,
		interact: 1.5
	};
	/**
	* Compute the scheduler delay for an actor with the given speed performing the given action.
	* Faster actors (higher speed) get smaller delays.
	*/
	function actionDelay(speed, action) {
		const mult = ACTION_MULTIPLIER[action.kind] ?? 1;
		return 100 / speed * mult;
	}
	//#endregion
	//#region src/lib/turn/system.ts
	/**
	* Build the initial TurnSystemState from a player + monster list.
	*/
	function createTurnSystemState(player, monsters) {
		const actors = {};
		const scheduler = new TurnScheduler();
		actors[player.id] = player;
		scheduler.add(player.id, actionDelay(player.speed, { kind: "move" }));
		for (const m of monsters) {
			actors[m.id] = m;
			scheduler.add(m.id, actionDelay(m.speed, { kind: "move" }));
		}
		return {
			actors,
			playerId: player.id,
			scheduler,
			awaitingPlayerInput: false,
			activeActorId: null
		};
	}
	var MAX_MONSTER_TICKS_PER_CALL = 500;
	/**
	* Advance the schedule until it is the player's turn.
	* Mutates the scheduler in-place; returns new state for actors/flags.
	*/
	function tickUntilPlayer(state, deps) {
		let current = {
			...state,
			awaitingPlayerInput: false,
			activeActorId: null
		};
		let safetyCounter = 0;
		while (safetyCounter++ < MAX_MONSTER_TICKS_PER_CALL) {
			const prevT = current.scheduler.getNow();
			const evt = current.scheduler.next();
			if (!evt) break;
			const { actorId } = evt;
			const nextT = evt.now;
			if (nextT !== prevT) deps.onTimeAdvanced?.({
				prevTime: prevT,
				nextTime: nextT,
				activeActorId: actorId,
				state: current
			});
			const actor = current.actors[actorId];
			if (!actor || !actor.alive) continue;
			if (actorId === current.playerId) return {
				...current,
				awaitingPlayerInput: true,
				activeActorId: actorId
			};
			const { action, monsterPatch } = deps.monsterDecide(current, actorId);
			const cost = deps.computeCost(actorId, action);
			if (Object.keys(monsterPatch).length > 0) current = {
				...current,
				actors: {
					...current.actors,
					[actorId]: {
						...actor,
						...monsterPatch
					}
				}
			};
			current = deps.applyAction(current, actorId, action, deps);
			current.scheduler.reschedule(actorId, cost.time);
		}
		return current;
	}
	/**
	* Commit the player's chosen action, advance the turn, then run monsters until
	* the player's next turn.
	*
	* Precondition: state.awaitingPlayerInput === true
	*/
	function commitPlayerAction(state, deps, action) {
		if (!state.awaitingPlayerInput) return state;
		const cost = deps.computeCost(state.playerId, action);
		let next = deps.applyAction(state, state.playerId, action, deps);
		next = {
			...next,
			awaitingPlayerInput: false,
			activeActorId: null
		};
		next.scheduler.reschedule(state.playerId, cost.time);
		return tickUntilPlayer(next, deps);
	}
	/**
	* Default computeCost using actionDelay.
	*/
	function defaultComputeCost(actorId, action, actors) {
		const actor = actors[actorId];
		return { time: actionDelay(actor?.speed ?? 1, action) };
	}
	//#endregion
	//#region src/lib/events/eventEmitter.ts
	/** Create a typed event emitter that dispatches `GameEventMap` events. */
	function createEventEmitter() {
		const handlers = {};
		return {
			on(event, handler) {
				if (!handlers[event]) handlers[event] = /* @__PURE__ */ new Set();
				handlers[event].add(handler);
			},
			off(event, handler) {
				handlers[event]?.delete(handler);
			},
			emit(...args) {
				const [event, payload] = args;
				const set = handlers[event];
				if (!set) return;
				for (const h of set) h(payload);
			}
		};
	}
	//#endregion
	//#region src/lib/combat/factions.ts
	/** Create a new empty faction registry. */
	function createFactionRegistry() {
		const stances = /* @__PURE__ */ new Map();
		function key(from, to) {
			return `${from}\0${to}`;
		}
		return {
			setStance(from, to, stance) {
				stances.set(key(from, to), stance);
			},
			getStance(from, to) {
				return stances.get(key(from, to)) ?? "neutral";
			},
			isHostile(from, to) {
				return stances.get(key(from, to)) === "hostile";
			}
		};
	}
	/**
	* Convenience: build a registry from a stance table.
	*
	* Example:
	*   createFactionRegistryFromTable([
	*     ["player", "enemy", "hostile"],
	*     ["enemy", "player", "hostile"],
	*   ])
	*/
	function createFactionRegistryFromTable(table) {
		const registry = createFactionRegistry();
		for (const [from, to, stance] of table) registry.setStance(from, to, stance);
		return registry;
	}
	//#endregion
	//#region src/lib/utils/geometry.ts
	/**
	* A minimal binary min-heap keyed on a numeric priority.
	* Used by A* as the open-set priority queue.
	*/
	var MinHeap = class {
		constructor() {
			this._heap = [];
		}
		/** Number of elements currently in the heap. */
		get size() {
			return this._heap.length;
		}
		/** Insert a value with the given numeric priority. */
		push(priority, value) {
			this._heap.push({
				priority,
				value
			});
			this._bubbleUp(this._heap.length - 1);
		}
		/** Remove and return the value with the lowest priority, or `undefined` if empty. */
		pop() {
			if (this._heap.length === 0) return void 0;
			const top = this._heap[0].value;
			const last = this._heap.pop();
			if (this._heap.length > 0) {
				this._heap[0] = last;
				this._siftDown(0);
			}
			return top;
		}
		/** Return the lowest-priority value without removing it, or `undefined` if empty. */
		peek() {
			return this._heap[0]?.value;
		}
		/** Return the lowest priority value in the heap, or `Infinity` if empty. */
		peekPriority() {
			return this._heap[0]?.priority ?? Infinity;
		}
		_bubbleUp(i) {
			while (i > 0) {
				const parent = i - 1 >> 1;
				if (this._heap[parent].priority <= this._heap[i].priority) break;
				const tmp = this._heap[parent];
				this._heap[parent] = this._heap[i];
				this._heap[i] = tmp;
				i = parent;
			}
		}
		_siftDown(i) {
			const n = this._heap.length;
			while (true) {
				let smallest = i;
				const l = 2 * i + 1;
				const r = 2 * i + 2;
				if (l < n && this._heap[l].priority < this._heap[smallest].priority) smallest = l;
				if (r < n && this._heap[r].priority < this._heap[smallest].priority) smallest = r;
				if (smallest === i) break;
				const tmp = this._heap[smallest];
				this._heap[smallest] = this._heap[i];
				this._heap[i] = tmp;
				i = smallest;
			}
		}
	};
	/**
	* Octile distance heuristic for 8-directional grids.
	* Scaled to match integer movement costs: orthogonal=10, diagonal=14.
	*/
	function octile(ax, ay, bx, by) {
		const dx = Math.abs(ax - bx);
		const dy = Math.abs(ay - by);
		return 10 * (dx + dy) - 6 * Math.min(dx, dy);
	}
	//#endregion
	//#region src/lib/ai/astar.ts
	var DIRS = [
		[
			0,
			-1,
			10
		],
		[
			1,
			-1,
			14
		],
		[
			1,
			0,
			10
		],
		[
			1,
			1,
			14
		],
		[
			0,
			1,
			10
		],
		[
			-1,
			1,
			14
		],
		[
			-1,
			0,
			10
		],
		[
			-1,
			-1,
			14
		]
	];
	/**
	* Find the shortest 8-directional path from `start` to `goal`.
	*
	* @param dungeon     Dungeon outputs (used for grid dimensions only)
	* @param isWalkable  Walkability predicate
	* @param start       Starting grid position
	* @param goal        Target grid position
	* @param opts        Optional extra options (runtime blockers, per-cell costs)
	* @returns           Path from start to goal (inclusive) and total cost, or null if unreachable.
	*/
	function aStar8(dungeon, isWalkable, start, goal, opts = {}) {
		const W = dungeon.width;
		const H = dungeon.height;
		function cellOk(x, y) {
			if (x < 0 || y < 0 || x >= W || y >= H) return false;
			if (!isWalkable(x, y)) return false;
			if (opts.isBlocked?.(x, y)) return false;
			return true;
		}
		if (!cellOk(goal.x, goal.y)) return null;
		if (!cellOk(start.x, start.y)) return null;
		const gScore = new Int32Array(W * H).fill(2147483647);
		const cameFromX = new Int16Array(W * H).fill(-1);
		const cameFromY = new Int16Array(W * H).fill(-1);
		const startIdx = start.y * W + start.x;
		gScore[startIdx] = 0;
		const open = new MinHeap();
		open.push(octile(start.x, start.y, goal.x, goal.y), startIdx);
		while (open.size > 0) {
			const idx = open.pop();
			const cx = idx % W;
			const cy = idx / W | 0;
			if (cx === goal.x && cy === goal.y) {
				const path = [];
				let ni = idx;
				while (ni !== startIdx || path.length === 0) {
					path.push({
						x: ni % W,
						y: ni / W | 0
					});
					const px = cameFromX[ni];
					const py = cameFromY[ni];
					if (px === -1) break;
					ni = py * W + px;
				}
				if (path[path.length - 1].x !== start.x || path[path.length - 1].y !== start.y) path.push({
					x: start.x,
					y: start.y
				});
				path.reverse();
				return {
					path,
					cost: gScore[idx]
				};
			}
			const curG = gScore[idx];
			for (const [dx, dy, moveCost] of DIRS) {
				if (opts.fourDir && dx !== 0 && dy !== 0) continue;
				const nx = cx + dx;
				const ny = cy + dy;
				if (!cellOk(nx, ny)) continue;
				if (dx !== 0 && dy !== 0) {
					if (!cellOk(cx + dx, cy) || !cellOk(cx, cy + dy)) continue;
				}
				const ni = ny * W + nx;
				const tentativeG = curG + moveCost + (opts.cellCost?.(nx, ny) ?? 0);
				if (tentativeG < gScore[ni]) {
					gScore[ni] = tentativeG;
					cameFromX[ni] = cx;
					cameFromY[ni] = cy;
					open.push(tentativeG + octile(nx, ny, goal.x, goal.y), ni);
				}
			}
		}
		return null;
	}
	//#endregion
	//#region src/lib/ai/monsterAI.ts
	/**
	* Derive alert config from danger level.
	* danger 0  → detectionRadius 4,  giveUpTurns 3
	* danger 10 → detectionRadius 10, giveUpTurns 12
	*/
	function monsterAlertConfig(danger) {
		return {
			detectionRadius: Math.min(10, 4 + danger),
			giveUpTurns: Math.min(12, 3 + danger)
		};
	}
	/**
	* Bresenham line-of-sight check.
	* Returns true if there is an unobstructed path from (x0,y0) to (x1,y1).
	* Intermediate cells (not the endpoints) must all be non-opaque.
	*/
	function hasLineOfSight(x0, y0, x1, y1, isOpaque) {
		const dx = Math.abs(x1 - x0);
		const dy = Math.abs(y1 - y0);
		const stepX = x0 < x1 ? 1 : -1;
		const stepY = y0 < y1 ? 1 : -1;
		let err = dx - dy;
		let x = x0;
		let y = y0;
		while (x !== x1 || y !== y1) {
			const e2 = 2 * err;
			if (e2 > -dy) {
				err -= dy;
				x += stepX;
			}
			if (e2 < dx) {
				err += dx;
				y += stepY;
			}
			if (x === x1 && y === y1) break;
			if (isOpaque(x, y)) return false;
		}
		return true;
	}
	function canMonsterSeePlayer(monsterX, monsterY, playerX, playerY, playerVisRadius, isOpaque) {
		if (Math.hypot(monsterX - playerX, monsterY - playerY) > playerVisRadius) return false;
		return hasLineOfSight(monsterX, monsterY, playerX, playerY, isOpaque);
	}
	function _pathTo(sx, sy, gx, gy, dungeon, isWalkable, maxSteps, fourDir) {
		const opts = {};
		if (fourDir !== void 0) opts.fourDir = fourDir;
		const result = aStar8(dungeon, isWalkable, {
			x: sx,
			y: sy
		}, {
			x: gx,
			y: gy
		}, opts);
		if (!result || result.path.length < 2) return null;
		return maxSteps != null ? result.path.slice(0, maxSteps) : result.path;
	}
	function transitionAlertState(monster, playerX, playerY, playerVisRadius, config, isOpaque) {
		const canSeePlayer = canMonsterSeePlayer(monster.x, monster.y, playerX, playerY, playerVisRadius, isOpaque);
		const withinDetection = Math.hypot(monster.x - playerX, monster.y - playerY) <= config.detectionRadius;
		switch (monster.alertState) {
			case "idle":
				if (canSeePlayer && withinDetection) return {
					newAlertState: "chasing",
					newSearchTurnsLeft: 0,
					newLastKnownPlayerPos: {
						x: playerX,
						y: playerY
					}
				};
				return {
					newAlertState: "idle",
					newSearchTurnsLeft: 0,
					newLastKnownPlayerPos: null
				};
			case "chasing":
				if (canSeePlayer) return {
					newAlertState: "chasing",
					newSearchTurnsLeft: 0,
					newLastKnownPlayerPos: {
						x: playerX,
						y: playerY
					}
				};
				return {
					newAlertState: "searching",
					newSearchTurnsLeft: config.giveUpTurns,
					newLastKnownPlayerPos: monster.lastKnownPlayerPos
				};
			case "searching": {
				if (canSeePlayer) return {
					newAlertState: "chasing",
					newSearchTurnsLeft: 0,
					newLastKnownPlayerPos: {
						x: playerX,
						y: playerY
					}
				};
				const turnsLeft = monster.searchTurnsLeft - 1;
				if (turnsLeft <= 0) return {
					newAlertState: "idle",
					newSearchTurnsLeft: 0,
					newLastKnownPlayerPos: null
				};
				return {
					newAlertState: "searching",
					newSearchTurnsLeft: turnsLeft,
					newLastKnownPlayerPos: monster.lastKnownPlayerPos
				};
			}
		}
	}
	/**
	* Decide what a monster does this turn.
	*
	* @param playerVisRadius  FOV radius used by the renderer (default 8).
	*/
	function decideChasePlayer(state, monsterId, dungeon, isWalkable, isOpaque, playerVisRadius = 8, fourDir = false) {
		const monster = state.actors[monsterId];
		const player = state.actors[state.playerId];
		if (!monster || !player || !monster.alive || !player.alive) return {
			action: { kind: "wait" },
			monsterPatch: {}
		};
		const config = monsterAlertConfig(monster.danger);
		const transition = transitionAlertState(monster, player.x, player.y, playerVisRadius, config, isOpaque);
		const patch = {
			alertState: transition.newAlertState,
			searchTurnsLeft: transition.newSearchTurnsLeft,
			lastKnownPlayerPos: transition.newLastKnownPlayerPos
		};
		if (transition.newAlertState === "idle") return {
			action: { kind: "wait" },
			monsterPatch: patch
		};
		if (transition.newAlertState === "chasing") {
			const path = _pathTo(monster.x, monster.y, player.x, player.y, dungeon, isWalkable, void 0, fourDir);
			if (!path) return {
				action: { kind: "wait" },
				monsterPatch: patch
			};
			const next = path[1];
			return {
				action: {
					kind: "move",
					dx: next.x - monster.x,
					dy: next.y - monster.y
				},
				monsterPatch: patch
			};
		}
		const target = transition.newLastKnownPlayerPos;
		if (!target) return {
			action: { kind: "wait" },
			monsterPatch: patch
		};
		if (monster.x === target.x && monster.y === target.y) return {
			action: { kind: "wait" },
			monsterPatch: patch
		};
		const path = _pathTo(monster.x, monster.y, target.x, target.y, dungeon, isWalkable, void 0, fourDir);
		if (!path) return {
			action: { kind: "wait" },
			monsterPatch: patch
		};
		const next = path[1];
		return {
			action: {
				kind: "move",
				dx: next.x - monster.x,
				dy: next.y - monster.y
			},
			monsterPatch: patch
		};
	}
	//#endregion
	//#region src/lib/ai/fov.ts
	var OCTANTS = [
		[
			1,
			0,
			0,
			1
		],
		[
			0,
			1,
			1,
			0
		],
		[
			0,
			-1,
			1,
			0
		],
		[
			-1,
			0,
			0,
			1
		],
		[
			-1,
			0,
			0,
			-1
		],
		[
			0,
			-1,
			-1,
			0
		],
		[
			0,
			1,
			-1,
			0
		],
		[
			1,
			0,
			0,
			-1
		]
	];
	/**
	* Compute the set of cells visible from (originX, originY) using recursive
	* shadowcasting across all 8 octants.
	*
	* Example:
	*   computeFov(px, py, {
	*     isOpaque: (x, y) => x < 0 || y < 0 || x >= W || y >= H || solidData[y*W+x] !== 0,
	*     visit: (x, y) => visibilityMask[y * W + x] = 1,
	*     radius: 12,
	*   });
	*/
	function computeFov(originX, originY, options) {
		const { isOpaque, visit } = options;
		const radius = options.radius ?? 1024;
		const radiusSq = radius * radius;
		visit(originX, originY);
		for (const [xx, xy, yx, yy] of OCTANTS) castLight(originX, originY, 1, 1, 0, radius, radiusSq, xx, xy, yx, yy, isOpaque, visit);
	}
	function castLight(cx, cy, row, startSlope, endSlope, radius, radiusSq, xx, xy, yx, yy, isOpaque, visit) {
		if (startSlope < endSlope) return;
		for (let j = row; j <= radius; j++) {
			const dy = -j;
			let blocked = false;
			let newStartSlope = 0;
			for (let dx = -j; dx <= 0; dx++) {
				const lSlope = (dx - .5) / (dy + .5);
				const rSlope = (dx + .5) / (dy - .5);
				if (startSlope < rSlope) continue;
				if (endSlope > lSlope) break;
				const mapX = cx + dx * xx + dy * xy;
				const mapY = cy + dx * yx + dy * yy;
				if (dx * dx + dy * dy <= radiusSq) visit(mapX, mapY);
				if (blocked) if (isOpaque(mapX, mapY)) newStartSlope = rSlope;
				else {
					blocked = false;
					startSlope = newStartSlope;
				}
				else if (isOpaque(mapX, mapY) && j < radius) {
					blocked = true;
					castLight(cx, cy, j + 1, startSlope, lSlope, radius, radiusSq, xx, xy, yx, yy, isOpaque, visit);
					newStartSlope = rSlope;
				}
			}
			if (blocked) break;
		}
	}
	//#endregion
	//#region src/lib/utils/minimap.ts
	/**
	* Build the initial minimap state for a new dungeon.
	* Pre-explores the start room (endRoomId), the first monster's room, and the
	* corridor path connecting them — matching the classic roguelike "you know
	* where you started" reveal.
	*/
	function createMinimapState(dungeon) {
		const { width, height } = dungeon;
		return {
			width,
			height,
			explored: buildInitialExploredMask(dungeon),
			visible: new Uint8Array(width * height)
		};
	}
	/**
	* Merge an FOV result into the minimap state (mutates in place).
	* Pass the visible mask produced by `computeFov` / `createVisibilityMask`.
	*/
	function updateExplored(state, fovResult) {
		const n = state.explored.length;
		for (let i = 0; i < n; i++) {
			state.visible[i] = fovResult[i] ?? 0;
			if (fovResult[i]) state.explored[i] = 1;
		}
	}
	function buildInitialExploredMask(dungeon) {
		const { width, height, rooms, endRoomId, fullRegionIds } = dungeon;
		const mask = new Uint8Array(width * height);
		function markRegion(regionId) {
			for (let i = 0; i < fullRegionIds.length; i++) if (fullRegionIds[i] === regionId) mask[i] = 1;
		}
		markRegion(endRoomId);
		let firstMobRoomId = null;
		for (const [roomId, room] of rooms) if (roomId !== endRoomId && room.type === "room") {
			firstMobRoomId = roomId;
			break;
		}
		if (firstMobRoomId !== null) {
			markRegion(firstMobRoomId);
			const roomToCorridors = /* @__PURE__ */ new Map();
			for (const [id, room] of rooms) {
				if (room.type !== "corridor") continue;
				for (const connRoomId of room.connections) {
					if (!roomToCorridors.has(connRoomId)) roomToCorridors.set(connRoomId, []);
					roomToCorridors.get(connRoomId).push(id);
				}
			}
			const visited = new Set([endRoomId]);
			const queue = [[endRoomId, []]];
			outer: while (queue.length > 0) {
				const [curRoom, corridorPath] = queue.shift();
				for (const corridorId of roomToCorridors.get(curRoom) ?? []) {
					const corridor = rooms.get(corridorId);
					if (!corridor) continue;
					for (const nextRoom of corridor.connections) {
						if (nextRoom === curRoom || visited.has(nextRoom)) continue;
						visited.add(nextRoom);
						const newPath = [...corridorPath, corridorId];
						if (nextRoom === firstMobRoomId) {
							for (const cid of newPath) markRegion(cid);
							break outer;
						}
						queue.push([nextRoom, newPath]);
					}
				}
			}
		}
		return mask;
	}
	/** Write all cells of a passage into the mask. Use PASSAGE_NONE to erase. */
	function stampPassageToMask(mask, width, passage, value) {
		for (const cell of passage.cells) mask[cell.y * width + cell.x] = value;
	}
	/** Enable a passage in the mask (stamp with PASSAGE_ENABLED). */
	function enablePassageInMask(mask, width, passage) {
		stampPassageToMask(mask, width, passage, 2);
	}
	/** Disable a passage in the mask (stamp with PASSAGE_DISABLED). */
	function disablePassageInMask(mask, width, passage) {
		stampPassageToMask(mask, width, passage, 1);
	}
	/**
	* Build the initial mask from an array of HiddenPassage objects.
	* All passages start disabled.
	*/
	function buildPassageMask(width, height, passages) {
		const mask = new Uint8Array(width * height);
		for (const passage of passages) stampPassageToMask(mask, width, passage, 1);
		return mask;
	}
	//#endregion
	//#region src/lib/api/player.ts
	/**
	* Wrap a live `PlayerState` in a `PlayerHandle`.
	* Mutate `state.entity`, `state.facing`, or `state.inventory` and the
	* getters will reflect those changes on the next read.
	*/
	function createPlayerHandle(state) {
		return {
			get x() {
				return state.entity.x;
			},
			get z() {
				return state.entity.z;
			},
			get hp() {
				return state.entity.hp ?? 0;
			},
			get maxHp() {
				return state.entity.maxHp ?? 0;
			},
			get facing() {
				return state.facing;
			},
			get alive() {
				return state.entity.alive;
			},
			get inventory() {
				return state.inventory;
			},
			move(dx, dz) {
				return {
					kind: "move",
					dx,
					dy: dz
				};
			},
			rotate(angle) {
				return {
					kind: "interact",
					meta: { rotate: angle }
				};
			},
			interact(entityId) {
				return entityId != null ? {
					kind: "interact",
					targetId: entityId
				} : { kind: "interact" };
			},
			wait() {
				return { kind: "wait" };
			},
			pickup(itemId) {
				return {
					kind: "interact",
					meta: { pickup: itemId }
				};
			},
			useItem(slotIndex) {
				return {
					kind: "interact",
					meta: { useItem: slotIndex }
				};
			},
			dropItem(slotIndex) {
				return {
					kind: "interact",
					meta: { dropItem: slotIndex }
				};
			},
			_state: state
		};
	}
	//#endregion
	//#region src/lib/api/keybindings.ts
	/**
	* Install a `keydown` listener on `document` that maps key presses to
	* named actions using `options.bindings`.
	*
	* Returns a handle with a `destroy()` method that removes the listener.
	*/
	function createKeybindings(options) {
		const keyToAction = /* @__PURE__ */ new Map();
		for (const [action, keys] of Object.entries(options.bindings)) for (const key of keys) keyToAction.set(key, action);
		const repeatDelayMs = options.repeatDelayMs ?? 150;
		const lastFired = /* @__PURE__ */ new Map();
		function handleKeydown(event) {
			const action = keyToAction.get(event.key);
			if (action === void 0) return;
			if (event.repeat && repeatDelayMs > 0) {
				const last = lastFired.get(event.key) ?? 0;
				if (event.timeStamp - last < repeatDelayMs) return;
			}
			lastFired.set(event.key, event.timeStamp);
			options.onAction(action, event);
		}
		document.addEventListener("keydown", handleKeydown);
		return { destroy() {
			document.removeEventListener("keydown", handleKeydown);
		} };
	}
	//#endregion
	//#region src/lib/utils/rng.ts
	/**
	* Create a seeded LCG pseudo-random number generator.
	* Uses Numerical Recipes constants. Returns a function that yields
	* deterministic values in [0, 1) for a given seed.
	*/
	function makeRng(seed) {
		let s = seed >>> 0;
		return () => {
			s = Math.imul(1664525, s) + 1013904223 >>> 0;
			return s / 4294967295;
		};
	}
	//#endregion
	//#region src/lib/missions/missionSystem.ts
	function recordToPublic(r) {
		return r;
	}
	/**
	* Create the mission system.
	*
	* @param events     Game event emitter — used to fire `mission-complete` on success.
	* @param transport  Optional multiplayer transport — used to broadcast completions to peers.
	* @returns          A `MissionsHandle` for adding, removing, and evaluating missions.
	*/
	function createMissionSystem(events, transport) {
		const records = /* @__PURE__ */ new Map();
		function completeRecord(record, turn) {
			record.status = "complete";
			record.completedAt = turn;
			events.emit("mission-complete", {
				missionId: record.id,
				name: record.name,
				turn,
				metadata: record.metadata
			});
			record.onComplete?.(recordToPublic(record));
			transport?.sendMissionComplete?.(record.id, record.name);
		}
		return {
			add(def) {
				if (records.has(def.id)) records.delete(def.id);
				records.set(def.id, {
					id: def.id,
					name: def.name,
					description: def.description ?? "",
					status: "active",
					completedAt: void 0,
					metadata: def.metadata ? { ...def.metadata } : {},
					evaluator: def.evaluator,
					onComplete: def.onComplete
				});
			},
			remove(id) {
				records.delete(id);
			},
			get(id) {
				const r = records.get(id);
				return r ? recordToPublic(r) : void 0;
			},
			get list() {
				return Array.from(records.values()).map(recordToPublic);
			},
			get active() {
				return Array.from(records.values()).filter((r) => r.status === "active").map(recordToPublic);
			},
			get completed() {
				return Array.from(records.values()).filter((r) => r.status === "complete").map(recordToPublic);
			},
			_tick(ctx) {
				for (const record of records.values()) {
					if (record.status !== "active") continue;
					const ctxWithRecord = {
						...ctx,
						mission: record
					};
					let result = false;
					try {
						result = record.evaluator(ctxWithRecord);
					} catch (err) {
						console.warn(`[missions] Evaluator for "${record.id}" threw:`, err);
					}
					if (result) completeRecord(record, ctx.turn);
				}
			}
		};
	}
	//#endregion
	//#region src/lib/animations/animationRegistry.ts
	function createAnimationRegistry() {
		const handlers = /* @__PURE__ */ new Map();
		const queue = [];
		return {
			on(kind, handler) {
				if (!handlers.has(kind)) handlers.set(kind, []);
				handlers.get(kind).push(handler);
			},
			off(kind, handler) {
				const list = handlers.get(kind);
				if (!list) return;
				const idx = list.indexOf(handler);
				if (idx !== -1) list.splice(idx, 1);
			},
			clear(kind) {
				handlers.delete(kind);
			},
			_enqueue(entry) {
				queue.push(entry);
			},
			async _flush() {
				const pending = queue.splice(0);
				for (const entry of pending) {
					const list = handlers.get(entry.kind);
					if (!list || list.length === 0) continue;
					for (const handler of list) await handler(entry);
				}
			}
		};
	}
	//#endregion
	//#region src/lib/api/createGame.ts
	function toPublicRoom(id, info) {
		return {
			id,
			type: info.type,
			x: info.rect.x,
			z: info.rect.y,
			w: info.rect.w,
			h: info.rect.h,
			cx: Math.floor(info.rect.x + info.rect.w / 2),
			cz: Math.floor(info.rect.y + info.rect.h / 2),
			connections: info.connections
		};
	}
	function getCellFlags(x, y, flagsData, width, height) {
		if (x < 0 || y < 0 || x >= width || y >= height) return 2;
		return flagsData[y * width + x] ?? 2;
	}
	function syncEntityFromActor(entity, actor) {
		entity.x = actor.x;
		entity.z = actor.y;
		entity.hp = actor.hp;
		entity.alive = actor.alive;
	}
	function buildPlayerActor(id, opts) {
		return {
			id,
			kind: "player",
			x: opts.x ?? 1,
			y: opts.z ?? 1,
			speed: opts.speed ?? 5,
			alive: true,
			blocksMovement: true,
			hp: opts.hp ?? 30,
			maxHp: opts.maxHp ?? opts.hp ?? 30,
			attack: opts.attack ?? 3,
			defense: opts.defense ?? 1
		};
	}
	function entityToMonsterActor(e) {
		const ev = e;
		return {
			id: e.id,
			kind: "monster",
			name: ev.type ?? e.kind,
			glyph: ev.type?.[0] ?? e.kind[0] ?? "?",
			x: e.x,
			y: e.z,
			speed: e.speed > 0 ? e.speed : 5,
			alive: e.alive,
			blocksMovement: e.blocksMove,
			hp: ev.hp ?? 0,
			maxHp: ev.maxHp ?? 0,
			attack: ev.attack ?? 0,
			defense: ev.defense ?? 0,
			xp: ev.xp ?? 0,
			danger: ev.danger ?? 1,
			alertState: "idle",
			rpsEffect: "none",
			searchTurnsLeft: 0,
			lastKnownPlayerPos: null
		};
	}
	function fallbackCombat(attacker, defender, factions) {
		if (!factions.isHostile(attacker.faction, defender.faction)) return { outcome: "blocked" };
		return { outcome: "miss" };
	}
	function makeApplyAction(internal, combatOpts, onAnimEvent) {
		return function customApplyAction(state, actorId, action, deps) {
			if (action.kind === "interact" && action.meta?.rotate !== void 0) {
				if (actorId === internal.playerActorId) internal.playerState.facing = ((internal.playerState.facing + action.meta.rotate) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
				return state;
			}
			if (action.kind === "interact") {
				const actor = state.actors[actorId];
				if (actor) {
					if (action.meta?.pickup !== void 0) {
						const itemId = action.meta.pickup;
						const actorEntity = internal.entityById.get(actorId);
						if (actorEntity) internal.events.emit("item-pickup", {
							item: { id: itemId },
							entity: actorEntity
						});
						internal.events.emit("audio", {
							name: "item-pickup",
							position: [actor.x, actor.y]
						});
					}
					if (action.targetId !== void 0) {
						const target = internal.entityById.get(action.targetId);
						if (target) {
							const targetType = target.type;
							if (targetType === "chest") {
								internal.events.emit("chest-open", {
									chest: target,
									loot: []
								});
								internal.events.emit("audio", {
									name: "chest-open",
									position: [target.x, target.z]
								});
							} else if (targetType === "door") internal.events.emit("audio", {
								name: "door-open",
								position: [target.x, target.z]
							});
						}
					}
				}
				return state;
			}
			if (action.kind !== "move" || action.dx == null || action.dy == null) return state;
			const actor = state.actors[actorId];
			if (!actor || !actor.alive) return state;
			const nx = actor.x + action.dx;
			const ny = actor.y + action.dy;
			const targetActor = Object.values(state.actors).find((a) => a.id !== actorId && a.alive && a.blocksMovement && a.x === nx && a.y === ny);
			if (targetActor) {
				const attackerEntity = internal.entityById.get(actorId);
				const defenderEntity = internal.entityById.get(targetActor.id);
				if (attackerEntity && defenderEntity) {
					const ctx = {
						emit: internal.events,
						factions: internal.factions
					};
					const result = combatOpts?.resolver ? combatOpts.resolver(attackerEntity, defenderEntity, ctx) : fallbackCombat(attackerEntity, defenderEntity, internal.factions);
					if (result.outcome === "hit") {
						const defEv = defenderEntity;
						const currentHp = defEv.hp ?? 0;
						defEv.hp = Math.max(0, currentHp - result.damage);
						if (result.defenderDied) defenderEntity.alive = false;
						onAnimEvent?.({
							kind: "attack",
							entity: attackerEntity,
							actor: defenderEntity
						});
						onAnimEvent?.({
							kind: "damage",
							entity: defenderEntity,
							actor: attackerEntity,
							amount: result.damage
						});
						combatOpts?.onDamage?.({
							attacker: attackerEntity,
							defender: defenderEntity,
							amount: result.damage
						});
						if (result.defenderDied) {
							onAnimEvent?.({
								kind: "death",
								entity: defenderEntity,
								actor: attackerEntity
							});
							combatOpts?.onDeath?.({
								entity: defenderEntity,
								killer: attackerEntity
							});
							if (actorId === internal.playerActorId) {
								const xp = defEv.xp ?? 0;
								if (xp > 0) {
									onAnimEvent?.({
										kind: "xp-gain",
										entity: attackerEntity,
										amount: xp
									});
									internal.events.emit("xp-gain", {
										amount: xp,
										x: defenderEntity.x,
										z: defenderEntity.z
									});
								}
								internal.events.emit("audio", {
									name: "xp-pickup",
									position: [defenderEntity.x, defenderEntity.z]
								});
							}
						}
						const updatedDefender = {
							...state.actors[targetActor.id],
							hp: defEv.hp ?? 0,
							alive: defenderEntity.alive
						};
						return {
							...state,
							actors: {
								...state.actors,
								[targetActor.id]: updatedDefender
							}
						};
					} else if (result.outcome === "miss") {
						onAnimEvent?.({
							kind: "miss",
							entity: defenderEntity,
							actor: attackerEntity
						});
						combatOpts?.onMiss?.({
							attacker: attackerEntity,
							defender: defenderEntity
						});
					}
				}
				return state;
			}
			if (!internal.colliderFlagsData || !internal.dungeonOutputs) return state;
			if (!isWalkableCell(getCellFlags(nx, ny, internal.colliderFlagsData, internal.dungeonOutputs.width, internal.dungeonOutputs.height))) return state;
			if (internal.decorations.some((d) => d.blocksMove && d.x === nx && d.z === ny)) return state;
			if (actorId === internal.playerActorId) internal.events.emit("audio", {
				name: "footstep",
				position: [nx, ny]
			});
			const movingEntity = internal.entityById.get(actorId);
			if (movingEntity) onAnimEvent?.({
				kind: "move",
				entity: movingEntity,
				from: {
					x: actor.x,
					z: actor.y
				},
				to: {
					x: nx,
					z: ny
				}
			});
			return {
				...state,
				actors: {
					...state.actors,
					[actorId]: {
						...actor,
						x: nx,
						y: ny
					}
				}
			};
		};
	}
	var FOV_RADIUS = 12;
	function updateFovAndMinimap(internal) {
		if (!internal.minimapState || !internal.dungeonOutputs || !internal.colliderFlagsData) return;
		const { width, height } = internal.dungeonOutputs;
		const flags = internal.colliderFlagsData;
		const player = internal.playerState.entity;
		const fovMask = new Uint8Array(width * height);
		computeFov(player.x, player.z, {
			isOpaque: (x, y) => !isLightPassableCell(getCellFlags(x, y, flags, width, height)),
			visit: (x, y) => {
				if (x >= 0 && y >= 0 && x < width && y < height) fovMask[y * width + x] = 1;
			},
			radius: FOV_RADIUS
		});
		updateExplored(internal.minimapState, fovMask);
	}
	function syncAllEntitiesFromTurnState(internal) {
		if (!internal.turnState) return;
		for (const [id, actor] of Object.entries(internal.turnState.actors)) {
			const entity = internal.entityById.get(id);
			if (entity) syncEntityFromActor(entity, actor);
		}
	}
	function makeDungeonHandle(internal) {
		let _roomsCache = null;
		return {
			get width() {
				return internal.dungeonOutputs?.width ?? 0;
			},
			get height() {
				return internal.dungeonOutputs?.height ?? 0;
			},
			get rooms() {
				if (!_roomsCache && internal.dungeonOutputs && "rooms" in internal.dungeonOutputs) {
					_roomsCache = {};
					for (const [id, info] of internal.dungeonOutputs.rooms) _roomsCache[id] = toPublicRoom(id, info);
				}
				return _roomsCache ?? {};
			},
			get outputs() {
				return internal.dungeonOutputs;
			},
			get objects() {
				return internal.objectPlacements;
			},
			decorations: {
				get list() {
					return internal.decorations;
				},
				add(decoration) {
					internal.decorations.push(decoration);
				},
				remove(id) {
					const idx = internal.decorations.findIndex((d) => d.id === id);
					if (idx !== -1) internal.decorations.splice(idx, 1);
				}
			},
			passages: {
				get list() {
					return internal.passages;
				},
				toggle(id) {
					const passage = internal.passages.find((p) => p.id === id);
					if (!passage || !internal.passageMask || !internal.dungeonOutputs) return;
					passage.enabled = !passage.enabled;
					if (passage.enabled) enablePassageInMask(internal.passageMask, internal.dungeonOutputs.width, passage);
					else disablePassageInMask(internal.passageMask, internal.dungeonOutputs.width, passage);
					internal.options.passages?.onToggle?.({
						passage,
						enabled: passage.enabled
					});
					internal.events.emit("audio", {
						name: "passage-toggle",
						position: [passage.start.x, passage.start.y]
					});
				}
			},
			passageNear(x, z, radius = 1.5) {
				let best = null;
				let bestDist = Infinity;
				for (const p of internal.passages) {
					const ds = Math.hypot(p.start.x - x, p.start.y - z);
					const de = Math.hypot(p.end.x - x, p.end.y - z);
					const d = Math.min(ds, de);
					if (d <= radius && d < bestDist) {
						bestDist = d;
						best = p;
					}
				}
				return best;
			},
			paint(x, z, layers) {
				const merged = {
					...internal.paintMap.get(`${x},${z}`) ?? {},
					...layers
				};
				internal.paintMap.set(`${x},${z}`, merged);
				writePaintToOverlayTexture(internal, x, z);
				internal.events.emit("cell-paint", {
					x,
					z,
					...layers
				});
			},
			unpaint(x, z) {
				internal.paintMap.delete(`${x},${z}`);
				writePaintToOverlayTexture(internal, x, z);
				internal.events.emit("cell-paint", {
					x,
					z,
					floor: [],
					wall: [],
					ceil: []
				});
			},
			get paintMap() {
				return internal.paintMap;
			}
		};
	}
	function writePaintToOverlayTexture(internal, x, z) {
		const dungeon = internal.dungeonOutputs;
		if (!dungeon) return;
		const { width, height } = dungeon;
		if (x < 0 || z < 0 || x >= width || z >= height) return;
		const tex = dungeon.textures.overlays;
		if (tex) tex.needsUpdate = true;
	}
	function makeTurnsHandle(internal, dungeonHandle) {
		return {
			get turn() {
				return internal.turnCounter;
			},
			async commit(action) {
				if (internal.options.transport) {
					internal.options.transport.send(action);
					return;
				}
				if (!internal.turnState || !internal.dungeonOutputs) return;
				const flags = internal.colliderFlagsData;
				const { width, height } = internal.dungeonOutputs;
				const dungOut = internal.dungeonOutputs;
				const onAnimEvent = (e) => internal.animationRegistry._enqueue(e);
				const deps = {
					isWalkable: (x, y) => isWalkableCell(getCellFlags(x, y, flags, width, height)),
					monsterDecide: (state, monsterId) => decideChasePlayer(state, monsterId, dungOut, (x, y) => isWalkableCell(getCellFlags(x, y, flags, width, height)), (x, y) => !isLightPassableCell(getCellFlags(x, y, flags, width, height))),
					computeCost: (actorId, a) => defaultComputeCost(actorId, a, internal.turnState.actors),
					applyAction: makeApplyAction(internal, internal.options.combat, onAnimEvent),
					onTimeAdvanced: ({ nextTime, prevTime, state }) => {
						if (nextTime > prevTime) {
							internal.turnCounter += 1;
							const playerActor = state.actors[internal.playerActorId];
							if (playerActor) syncEntityFromActor(internal.playerState.entity, playerActor);
							internal.events.emit("turn", { turn: internal.turnCounter });
							internal.options.turns?.onAdvance?.({
								turn: internal.turnCounter,
								dt: nextTime - prevTime
							});
						}
					}
				};
				internal.turnState = commitPlayerAction(internal.turnState, deps, action);
				await internal.animationRegistry._flush();
				syncAllEntitiesFromTurnState(internal);
				updateFovAndMinimap(internal);
			},
			addActor(entity) {
				if (!internal.turnState) {
					internal.entityById.set(entity.id, entity);
					return;
				}
				const actor = entityToMonsterActor(entity);
				internal.entityById.set(entity.id, entity);
				internal.turnState = {
					...internal.turnState,
					actors: {
						...internal.turnState.actors,
						[entity.id]: actor
					}
				};
				internal.turnState.scheduler.add(entity.id, actor.speed > 0 ? Math.floor(100 / actor.speed) : 10);
			},
			removeActor(id) {
				internal.entityById.delete(id);
				if (!internal.turnState) return;
				internal.turnState.scheduler.remove(id);
				const { [id]: _removed, ...rest } = internal.turnState.actors;
				internal.turnState = {
					...internal.turnState,
					actors: rest
				};
			}
		};
	}
	function runGenerate(internal, dungeonHandle, turnsHandle) {
		const dungeonOpts = internal.options.dungeon;
		let dungeonOut;
		if ("tiled" in dungeonOpts && dungeonOpts.tiled) {
			const tiledCfg = dungeonOpts.tiled;
			dungeonOut = loadTiledMap(tiledCfg.map, {
				layers: tiledCfg.layers ?? {},
				tilesetMap: tiledCfg.tilesetMap ?? {},
				objectTypes: tiledCfg.objectTypes ?? {},
				...tiledCfg.objectLayer !== void 0 ? { objectLayer: tiledCfg.objectLayer } : {},
				...tiledCfg.seed !== void 0 ? { seed: tiledCfg.seed } : {}
			});
		} else if ("cellular" in dungeonOpts && dungeonOpts.cellular) dungeonOut = generateCellularDungeon(dungeonOpts);
		else dungeonOut = generateBspDungeon(dungeonOpts);
		internal.dungeonOutputs = dungeonOut;
		internal.solidData = dungeonOut.textures.solid.image.data;
		internal.colliderFlagsData = dungeonOut.textures.colliderFlags.image.data;
		const playerOpts = internal.options.player ?? {};
		let playerX = playerOpts.x ?? 1;
		let playerZ = playerOpts.z ?? 1;
		if ("startRoomId" in dungeonOut && dungeonOut.rooms && playerOpts.x == null) {
			const rOut = dungeonOut;
			let spawnRoomId = rOut.startRoomId;
			const onChooseSpawn = dungeonOpts.onChooseSpawn;
			if (onChooseSpawn) {
				const roomList = [];
				for (const [id, info] of rOut.rooms) if (info.type === "room") roomList.push(toPublicRoom(id, info));
				spawnRoomId = onChooseSpawn({
					rooms: roomList,
					startRoom: toPublicRoom(rOut.startRoomId, rOut.rooms.get(rOut.startRoomId)),
					endRoom: toPublicRoom(rOut.endRoomId, rOut.rooms.get(rOut.endRoomId))
				});
			}
			const spawnRoom = rOut.rooms.get(spawnRoomId);
			if (spawnRoom) {
				playerX = Math.floor(spawnRoom.rect.x + spawnRoom.rect.w / 2);
				playerZ = Math.floor(spawnRoom.rect.y + spawnRoom.rect.h / 2);
			}
		}
		internal.playerState.entity.x = playerX;
		internal.playerState.entity.z = playerZ;
		if ("startRoomId" in dungeonOut) internal.passageMask = buildPassageMask(dungeonOut.width, dungeonOut.height, internal.passages);
		else internal.passageMask = new Uint8Array(dungeonOut.width * dungeonOut.height);
		if ("startRoomId" in dungeonOut) internal.minimapState = createMinimapState(dungeonOut);
		const playerActor = buildPlayerActor(internal.playerActorId, {
			...playerOpts,
			x: playerX,
			z: playerZ
		});
		internal.entityById.set(internal.playerActorId, internal.playerState.entity);
		const preActors = [];
		for (const [id, entity] of internal.entityById) {
			if (id === internal.playerActorId) continue;
			if (entity.alive && entity.speed > 0) preActors.push(entityToMonsterActor(entity));
		}
		internal.turnState = createTurnSystemState(playerActor, preActors);
		if ("startRoomId" in dungeonOut && dungeonOpts.onPlace) {
			const rOut = dungeonOut;
			const rngFn = makeRng(typeof rOut.seed === "number" ? rOut.seed : 305419896);
			const rng = {
				next: rngFn,
				chance: (p) => rngFn() < p
			};
			const roomList = [];
			for (const [id, info] of rOut.rooms) if (info.type === "room") roomList.push(toPublicRoom(id, info));
			const endRoom = toPublicRoom(rOut.endRoomId, rOut.rooms.get(rOut.endRoomId));
			const startRoom = toPublicRoom(rOut.startRoomId, rOut.rooms.get(rOut.startRoomId));
			dungeonOpts.onPlace({
				rooms: roomList,
				endRoom,
				startRoom,
				rng,
				place: {
					object(x, z, type, meta) {
						dungeonHandle.decorations.add({
							id: `obj_${type}_${x}_${z}`,
							kind: "decoration",
							spriteName: type,
							faction: "none",
							x,
							z,
							speed: 0,
							alive: false,
							blocksMove: false,
							tick: 0,
							type,
							...meta ?? {}
						});
					},
					billboard(x, z, type, spriteMap, opts) {
						internal.objectPlacements.push({
							x,
							z,
							type,
							spriteMap,
							...opts ?? {}
						});
					},
					npc(x, z, type, opts) {
						const entity = {
							id: `npc_${type}_${x}_${z}`,
							kind: "npc",
							spriteName: opts?.spriteName ?? type,
							faction: opts?.faction ?? "npc",
							x,
							z,
							speed: opts?.speed ?? 5,
							alive: true,
							blocksMove: true,
							tick: 0,
							type,
							...opts
						};
						turnsHandle.addActor(entity);
					},
					enemy(x, z, type, opts) {
						const entity = {
							id: `enemy_${type}_${x}_${z}`,
							kind: "enemy",
							spriteName: opts?.spriteName ?? type,
							faction: opts?.faction ?? "enemy",
							x,
							z,
							speed: opts?.speed ?? 7,
							alive: true,
							blocksMove: true,
							tick: 0,
							type,
							...opts
						};
						turnsHandle.addActor(entity);
					},
					decoration(x, z, type, opts) {
						dungeonHandle.decorations.add({
							id: `deco_${type}_${x}_${z}`,
							kind: "decoration",
							spriteName: opts?.spriteName ?? type,
							faction: "none",
							x,
							z,
							speed: 0,
							alive: false,
							blocksMove: opts?.blocksMove ?? false,
							tick: 0,
							type,
							...opts
						});
					},
					surface(x, z, layers) {
						dungeonHandle.paint(x, z, layers);
					}
				}
			});
		}
		if (internal.spawnerCb && "startRoomId" in dungeonOut) {
			const rOut = dungeonOut;
			for (const [id, info] of rOut.rooms) {
				if (info.type !== "room") continue;
				const result = internal.spawnerCb({
					dungeon: dungeonHandle,
					roomId: id,
					x: Math.floor(info.rect.x + info.rect.w / 2),
					y: Math.floor(info.rect.y + info.rect.h / 2)
				});
				if (result) {
					const entities = Array.isArray(result) ? result : [result];
					for (const e of entities) turnsHandle.addActor(e);
				}
			}
		}
		if (internal.decoratorCb && internal.solidData) {
			const { width, height } = dungeonOut;
			const solid = internal.solidData;
			for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
				if (solid[y * width + x] !== 0) continue;
				const roomId = "startRoomId" in dungeonOut ? dungeonOut.textures.regionId.image.data[y * width + x] ?? 0 : 0;
				const result = internal.decoratorCb({
					dungeon: dungeonHandle,
					roomId,
					x,
					y
				});
				if (result) {
					const decos = Array.isArray(result) ? result : [result];
					for (const d of decos) dungeonHandle.decorations.add(d);
				}
			}
		}
		if (internal.surfacePainterCb && internal.solidData) {
			const { width, height } = dungeonOut;
			const solid = internal.solidData;
			for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
				if (solid[y * width + x] !== 0) continue;
				const roomId = "startRoomId" in dungeonOut ? dungeonOut.textures.regionId.image.data[y * width + x] ?? 0 : 0;
				const layers = internal.surfacePainterCb({
					dungeon: dungeonHandle,
					roomId,
					x,
					y
				});
				if (layers && (layers.floor?.length || layers.wall?.length || layers.ceil?.length)) dungeonHandle.paint(x, y, layers);
			}
		}
		if (internal.turnState) {
			const deps = {
				isWalkable: (x, y) => isWalkableCell(getCellFlags(x, y, internal.colliderFlagsData, dungeonOut.width, dungeonOut.height)),
				monsterDecide: (state, monsterId) => decideChasePlayer(state, monsterId, dungeonOut, (x, y) => isWalkableCell(getCellFlags(x, y, internal.colliderFlagsData, dungeonOut.width, dungeonOut.height)), (x, y) => !isLightPassableCell(getCellFlags(x, y, internal.colliderFlagsData, dungeonOut.width, dungeonOut.height))),
				computeCost: (actorId, a) => defaultComputeCost(actorId, a, internal.turnState.actors),
				applyAction: makeApplyAction(internal, internal.options.combat)
			};
			internal.turnState = tickUntilPlayer(internal.turnState, deps);
		}
		updateFovAndMinimap(internal);
		internal.events.emit("turn", { turn: internal.turnCounter });
	}
	function drawMinimap(internal, canvas, opts) {
		const minimap = internal.minimapState;
		if (!minimap || !internal.dungeonOutputs) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const size = opts.size ?? 196;
		const { width, height } = minimap;
		const cellW = size / width;
		const cellH = size / height;
		const colors = opts.colors ?? {};
		const floorColor = colors.floor ?? "#aab";
		const floorDimColor = colors.floorDim ?? "#445";
		const wallColor = colors.wall ?? "#777";
		const wallDimColor = colors.wallDim ?? "#333";
		const playerColor = colors.player ?? "#0f0";
		const npcColor = colors.npc ?? "#08f";
		const enemyColor = colors.enemy ?? "#f44";
		ctx.clearRect(0, 0, size, size);
		const flags = internal.colliderFlagsData;
		for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
			const i = y * width + x;
			const isVisible = minimap.visible[i] !== 0;
			const isExplored = minimap.explored[i] !== 0;
			if (!isVisible && !isExplored) continue;
			if (!flags || isWalkableCell(flags[i] ?? 2)) ctx.fillStyle = isVisible ? floorColor : floorDimColor;
			else ctx.fillStyle = isVisible ? wallColor : wallDimColor;
			ctx.fillRect(x * cellW, y * cellH, Math.ceil(cellW), Math.ceil(cellH));
		}
		if (opts.showEntities !== false && internal.turnState) for (const actor of Object.values(internal.turnState.actors)) {
			if (!actor.alive) continue;
			const entity = internal.entityById.get(actor.id);
			if (!entity) continue;
			if (actor.id === internal.playerActorId) ctx.fillStyle = playerColor;
			else if (entity.kind === "npc") ctx.fillStyle = npcColor;
			else ctx.fillStyle = enemyColor;
			ctx.fillRect(actor.x * cellW, actor.y * cellH, Math.max(2, Math.ceil(cellW)), Math.max(2, Math.ceil(cellH)));
		}
	}
	/**
	* Create a game handle. Does not generate the dungeon — call `game.generate()`
	* after attaching callbacks.
	*/
	function createGame(canvas, options) {
		const events = createEventEmitter();
		const factions = createFactionRegistry();
		const playerOpts = options.player ?? {};
		const playerActorId = playerOpts.id ?? "player";
		const playerEntity = {
			id: playerActorId,
			kind: "player",
			spriteName: "player",
			faction: "player",
			x: playerOpts.x ?? 1,
			z: playerOpts.z ?? 1,
			speed: playerOpts.speed ?? 5,
			alive: true,
			blocksMove: true,
			tick: 0,
			hp: playerOpts.hp ?? 30,
			maxHp: playerOpts.maxHp ?? playerOpts.hp ?? 30,
			attack: playerOpts.attack ?? 3,
			defense: playerOpts.defense ?? 1
		};
		const playerState = {
			entity: playerEntity,
			facing: 0,
			inventory: []
		};
		const missionsHandle = createMissionSystem(events, options.transport);
		const animationRegistry = createAnimationRegistry();
		const internal = {
			options,
			canvas,
			events,
			factions,
			dungeonOutputs: null,
			solidData: null,
			colliderFlagsData: null,
			turnState: null,
			playerActorId,
			playerState,
			playerHandle: createPlayerHandle(playerState),
			entityById: new Map([[playerActorId, playerEntity]]),
			decorations: [],
			objectPlacements: [],
			paintMap: /* @__PURE__ */ new Map(),
			passages: [],
			passageMask: null,
			turnCounter: 0,
			minimapState: null,
			spawnerCb: null,
			decoratorCb: null,
			surfacePainterCb: null,
			keybindingsHandles: [],
			missions: missionsHandle,
			animationRegistry,
			destroyed: false
		};
		let dungeonHandle;
		let turnsHandle;
		let generated = false;
		dungeonHandle = makeDungeonHandle(internal);
		turnsHandle = makeTurnsHandle(internal, dungeonHandle);
		events.on("heal", ({ entity, amount }) => {
			if (internal.destroyed) return;
			const fullEntity = internal.entityById.get(entity.id);
			if (fullEntity) internal.animationRegistry._enqueue({
				kind: "heal",
				entity: fullEntity,
				amount
			});
		});
		events.on("turn", ({ turn }) => {
			if (internal.destroyed) return;
			missionsHandle._tick({
				turn,
				player: internal.playerHandle,
				dungeon: dungeonHandle,
				events,
				mission: null
			});
		});
		if (options.transport) {
			options.transport.onStateUpdate(async (update) => {
				if (internal.destroyed) return;
				if (internal.turnState) {
					const oldActors = internal.turnState.actors;
					for (const [pid, ps] of Object.entries(update.players)) {
						const old = oldActors[pid];
						if (!old) continue;
						const entity = internal.entityById.get(pid);
						if (!entity) continue;
						if (old.x !== ps.x || old.y !== ps.y) internal.animationRegistry._enqueue({
							kind: "move",
							entity,
							from: {
								x: old.x,
								z: old.y
							},
							to: {
								x: ps.x,
								z: ps.y
							}
						});
						if (ps.hp < old.hp) internal.animationRegistry._enqueue({
							kind: "damage",
							entity,
							amount: old.hp - ps.hp
						});
						if (old.alive && !ps.alive) internal.animationRegistry._enqueue({
							kind: "death",
							entity
						});
					}
					if (update.monsters) for (const mn of update.monsters) {
						let entity = internal.entityById.get(mn.id);
						if (!entity) {
							entity = {
								id: mn.id,
								kind: "enemy",
								spriteName: mn.sprite ?? mn.type,
								faction: mn.faction,
								x: mn.x,
								z: mn.z,
								speed: mn.speed,
								alive: mn.alive,
								blocksMove: mn.blocksMove,
								tick: mn.tick,
								type: mn.type,
								sprite: mn.sprite,
								hp: mn.hp,
								maxHp: mn.maxHp,
								attack: mn.attack,
								defense: mn.defense
							};
							if (mn.spriteMap) entity.spriteMap = mn.spriteMap;
							internal.entityById.set(mn.id, entity);
						}
						const old = oldActors[mn.id];
						if (old) {
							if (old.x !== mn.x || old.y !== mn.z) internal.animationRegistry._enqueue({
								kind: "move",
								entity,
								from: {
									x: old.x,
									z: old.y
								},
								to: {
									x: mn.x,
									z: mn.z
								}
							});
							const oldHp = old.hp;
							if (mn.hp < oldHp) internal.animationRegistry._enqueue({
								kind: "damage",
								entity,
								amount: oldHp - mn.hp
							});
							if (old.alive && !mn.alive) internal.animationRegistry._enqueue({
								kind: "death",
								entity
							});
						}
						entity.x = mn.x;
						entity.z = mn.z;
						entity.hp = mn.hp;
						entity.alive = mn.alive;
					}
					let actors = { ...oldActors };
					for (const [pid, ps] of Object.entries(update.players)) {
						const actor = actors[pid];
						if (actor) actors[pid] = {
							...actor,
							x: ps.x,
							y: ps.y,
							hp: ps.hp,
							alive: ps.alive
						};
					}
					for (const mn of update.monsters ?? []) {
						const existing = actors[mn.id];
						if (existing) actors[mn.id] = {
							...existing,
							x: mn.x,
							y: mn.z,
							hp: mn.hp,
							alive: mn.alive
						};
						else actors[mn.id] = {
							id: mn.id,
							kind: "monster",
							name: mn.type,
							glyph: mn.type[0] ?? "?",
							x: mn.x,
							y: mn.z,
							speed: mn.speed,
							alive: mn.alive,
							blocksMovement: mn.blocksMove,
							hp: mn.hp,
							maxHp: mn.maxHp,
							attack: mn.attack,
							defense: mn.defense,
							xp: 0,
							danger: 1,
							alertState: "idle",
							rpsEffect: "none",
							searchTurnsLeft: 0,
							lastKnownPlayerPos: null
						};
					}
					internal.turnState = {
						...internal.turnState,
						actors,
						awaitingPlayerInput: true
					};
				}
				await internal.animationRegistry._flush();
				const myState = update.players[internal.playerActorId];
				if (myState) {
					internal.playerState.entity.x = myState.x;
					internal.playerState.entity.z = myState.y;
					internal.playerState.entity.hp = myState.hp;
					internal.playerState.entity.alive = myState.alive;
					if (myState.facing !== void 0) internal.playerState.facing = myState.facing;
				}
				syncAllEntitiesFromTurnState(internal);
				internal.turnCounter = update.turn;
				internal.events.emit("turn", { turn: update.turn });
				internal.events.emit("network-state", update);
				updateFovAndMinimap(internal);
			});
			options.transport.onMissionComplete?.((msg) => {
				if (internal.destroyed) return;
				internal.events.emit("mission-peer-complete", {
					missionId: msg.missionId,
					name: msg.name,
					playerId: msg.playerId
				});
			});
		}
		const game = {
			get player() {
				return internal.playerHandle;
			},
			get turns() {
				return turnsHandle;
			},
			get dungeon() {
				return dungeonHandle;
			},
			get events() {
				return events;
			},
			get factions() {
				return internal.factions;
			},
			get missions() {
				return internal.missions;
			},
			get animations() {
				return internal.animationRegistry;
			},
			generate() {
				if (generated) return;
				generated = true;
				runGenerate(internal, dungeonHandle, turnsHandle);
			},
			regenerate() {
				internal.entityById.clear();
				internal.entityById.set(internal.playerActorId, internal.playerState.entity);
				internal.decorations.length = 0;
				internal.objectPlacements.length = 0;
				internal.paintMap.clear();
				internal.turnCounter = 0;
				const playerOpts = internal.options.player ?? {};
				const maxHp = playerOpts.maxHp ?? playerOpts.hp ?? 30;
				internal.playerState.entity.hp = maxHp;
				internal.playerState.entity.alive = true;
				internal.playerState.facing = 0;
				generated = false;
				generated = true;
				runGenerate(internal, dungeonHandle, turnsHandle);
			},
			destroy() {
				if (internal.destroyed) return;
				internal.destroyed = true;
				for (const h of internal.keybindingsHandles) h.destroy();
				internal.keybindingsHandles.length = 0;
			}
		};
		Object.defineProperty(game, "_internal", {
			value: internal,
			enumerable: false
		});
		return game;
	}
	/**
	* Wire up a 2D canvas minimap that redraws on every `turn` event.
	*/
	function attachMinimap(game, canvas, opts = {}) {
		const _internal = game._internal;
		if (!_internal) return;
		function redraw() {
			drawMinimap(_internal, canvas, opts);
		}
		game.events.on("turn", redraw);
	}
	/**
	* Register a spawn callback. Called per room during `generate()`.
	*/
	function attachSpawner(game, opts) {
		const _internal = game._internal;
		if (_internal) _internal.spawnerCb = opts.onSpawn;
	}
	/**
	* Register a decorator callback. Called per floor tile during `generate()`.
	*/
	function attachDecorator(game, opts) {
		const _internal = game._internal;
		if (_internal) _internal.decoratorCb = opts.onDecorate;
	}
	/**
	* Register a surface painter callback. Called per floor tile during `generate()`.
	*/
	function attachSurfacePainter(game, opts) {
		const _internal = game._internal;
		if (_internal) _internal.surfacePainterCb = opts.onPaint;
	}
	/**
	* Install keyboard bindings. Wraps `createKeybindings` and registers the
	* handle with the game so it is cleaned up on `destroy()`.
	*/
	function attachKeybindings(game, opts) {
		const handle = createKeybindings(opts);
		const _internal = game._internal;
		if (_internal) _internal.keybindingsHandles.push(handle);
	}
	//#endregion
	//#region src/lib/entities/factory.ts
	var _nextEntityId = 1;
	function nextId(prefix) {
		return `${prefix}_${_nextEntityId++}`;
	}
	/**
	* Create a game entity.
	*
	* Supply the engine-level fields via `EntityCoreOpts` plus any game-specific
	* attributes (hp, maxHp, attack, xp, …) as additional keys. All extra keys
	* are spread onto the returned entity verbatim and accessible via the index
	* signature on `EntityBase`.
	*
	* ```ts
	* const orc = createEntity({
	*   kind: "enemy", faction: "enemy", spriteName: "orc_idle", x: 8, z: 2,
	*   hp: 15, maxHp: 15, attack: 5, xp: 25,
	* });
	* ```
	*/
	function createEntity(opts) {
		const { kind, faction, spriteName, x, z, alive, blocksMove, speed, spriteMap, ...rest } = opts;
		return {
			id: nextId(kind),
			kind,
			faction,
			spriteName,
			x,
			z,
			alive: alive ?? true,
			blocksMove: blocksMove ?? false,
			speed: speed ?? 1,
			tick: 0,
			...spriteMap !== void 0 ? { spriteMap } : {},
			...rest
		};
	}
	//#endregion
	//#region src/lib/entities/inventory.ts
	var _nextItemId = 1;
	/** Create an item with an auto-generated id. */
	function createItem(opts) {
		const item = {
			id: `item_${_nextItemId++}`,
			name: opts.name,
			type: opts.type
		};
		if (opts.state !== void 0) item.state = opts.state;
		return item;
	}
	//#endregion
	//#region src/lib/rendering/basicLighting.ts
	/**
	* basicLighting.ts
	*
	* GLSL shader chunks for the dungeon atlas renderer. Two lighting passes run
	* in sequence in the fragment shader, both always active when an atlas is used:
	*
	*   1. Ambient occlusion (AO) — baked per-face corner values darken geometry
	*      where walls, floors, and ceilings meet. Intensity is controlled by the
	*      uAoIntensity uniform (0 = disabled, 1 = maximum darkening). Set via
	*      ambientOcclusion option on createDungeonRenderer.
	*
	*   2. Directional surface lighting — a per-surface brightness multiplier that
	*      makes depth and orientation readable without dynamic lights:
	*        - Walls: 0.9–1.1, scaled by abs(dot(face_normal, camera_forward)).
	*          Walls you face head-on are brighter (1.1); side walls are darker (0.9).
	*        - Floor: fixed 0.85
	*        - Ceiling: fixed 0.95
	*      This is always on; there is no runtime toggle.
	*
	* WebGL attribute slot budget: 16 total.
	*   Built-ins used by Three.js InstancedMesh:
	*     position (1) + uv (1) + instanceMatrix/mat4 (4) = 6
	*   Custom attributes: aUvRect(1) + aSurface(1) + aAoCorners(1) + aCellFace(1) = 4
	*   Total used: 10 / 16 — 6 slots remain for future attributes.
	*   Each vec2/vec3/vec4 attribute occupies exactly 1 WebGL slot regardless of component count.
	*/
	/**
	* Atlas vertex shader.
	*
	* Responsibilities (in order):
	*   1. Clip UV height for partial-height skirt panels (aSurface.z = uvHeightScale).
	*   2. Select the AO corner value for this vertex from aAoCorners.
	*   3. Rotate the tile UV in 90° steps (aSurface.y = uvRotation).
	*   4. Map local UV into the atlas rect (aUvRect.xy = origin, aUvRect.zw = size).
	*   5. Compute cell-relative overlay UV (aCellFace.xy / uDungeonSize).
	*   6. Apply height offset in world space (aSurface.x = heightOffset).
	*   7. Compute vFacingLight: fixed for floors/ceilings, dot-product for walls.
	*   8. Output fog distance as eye-space length.
	*/
	var BASIC_ATLAS_VERT = `
// ── Per-instance atlas UV rect ────────────────────────────────────────────────
// Atlas tile UV rect packed as a single vec4 (1 slot).
//   .xy = rect origin (uvX, uvY)   .zw = rect size (uvW, uvH)
// Packing four floats into one vec4 saves 3 attribute slots vs. separate floats.
attribute vec4 aUvRect;

// ── Per-instance geometry + UV transform ─────────────────────────────────────
// Three per-face scalars packed into one vec3 (1 slot, saves 2 vs. 3 floats).
//   .x = heightOffset   — world-space Y shift applied after instance matrix
//   .y = uvRotation     — UV rotation index: 0=0°, 1=90°CCW, 2=180°, 3=270°CCW
//   .z = uvHeightScale  — fraction of tile height to show, top-aligned [0,1];
//                         skirt panels use < 1 so brick rows keep aspect ratio
attribute vec3 aSurface;

// ── Per-instance overlay / lighting data ─────────────────────────────────────
// Pre-baked ambient-occlusion corner values in face-local UV order:
//   .x = top-left (uv 0,1), .y = top-right (uv 1,1)
//   .z = bot-left (uv 0,0), .w = bot-right (uv 1,0)
// Each component in [0,1]: 1 = fully lit, 0 = fully occluded.
// Computed once at dungeon-build time from the solid map; see computeFaceAO().
// Floors/ceilings use 8-neighbour sampling; walls use the two horizontal
// neighbours on each side. Skirt faces default to 1.0 (always fully lit).
attribute vec4 aAoCorners;

// Grid cell + face normal packed as a single vec4 (1 slot, saves 1 vs. 2×vec2).
//   .xy = grid cell (column, row) — used to index into uOverlayLookup
//   .zw = XZ outward face normal  — non-zero only for wall faces:
//           North (0, 1)  South (0,-1)  West (1, 0)  East (-1, 0)
//         Floor/ceiling carry (0,0) and use uSurfaceLight directly.
attribute vec4 aCellFace;

// ── Uniforms ──────────────────────────────────────────────────────────────────
// Width and height of the dungeon grid in cells. Used to normalise aCellFace.xy
// into [0,1] UV space for the overlay lookup texture.
uniform vec2 uDungeonSize;

// Camera forward direction projected onto the XZ plane, updated every RAF tick.
// Computed in dungeonRenderer.ts as (-sin(curYaw), -cos(curYaw)).
// Only read by the directional-lighting branch (uSurfaceLight < 0).
uniform vec2 uCamDir;

// Directional surface lighting mode per material:
//   >= 0 : fixed brightness multiplier applied to all pixels on this surface
//           (floor and ceiling use this path; value set via surfaceLighting option)
//    < 0 : use the camera-angle formula for walls/skirts (see uWallLightMin/Max)
uniform float uSurfaceLight;

// Wall directional lighting range. Only used when uSurfaceLight < 0.
//   uWallLightMin : brightness when wall normal is perpendicular to camera (side wall)
//   uWallLightMax : brightness when wall normal is parallel   to camera (facing wall)
// Formula: vFacingLight = uWallLightMin + abs(dot(aCellFace.zw, uCamDir)) * (uWallLightMax - uWallLightMin)
// Defaults: min=0.9, max=1.1  →  range [0.9, 1.1]
uniform float uWallLightMin;
uniform float uWallLightMax;

// ── Varyings ──────────────────────────────────────────────────────────────────
varying vec2  vAtlasUv;     // Final atlas UV after rect mapping + rotation
varying vec2  vTileOrigin;  // Top-left corner of the atlas tile rect (for clamping)
varying vec2  vTileSize;    // Width/height of the atlas tile rect (for clamping)
varying vec2  vLocalUv;     // Local UV within the tile [0,1]² after rotation
varying vec2  vOverlayUv;   // UV into the overlay lookup texture
varying float vFogDist;     // Eye-space distance used for linear fog
varying float vAo;          // Interpolated AO value for this fragment [0,1]
varying float vFacingLight; // Directional surface brightness multiplier
varying vec3  vViewPos;     // Eye-space position for scene point light attenuation

void main() {
  // ── 1. Clip UV height for partial skirt panels ─────────────────────────────
  // Scale the Y axis of the UV BEFORE any rotation so the clip always acts on
  // the physical vertical axis of the face, regardless of rotation.
  float hs = clamp(aSurface.z, 0.0, 1.0);
  vec2 localUv = vec2(uv.x, uv.y * hs);

  // ── 2. Select per-corner AO value for this vertex ─────────────────────────
  // aAoCorners stores one float per corner in face-local UV space.
  // We select by raw (pre-rotation) UV quadrant so corners stay consistent
  // across all rotation modes. The GPU then interpolates vAo between vertices.
  if      (uv.x < 0.5 && uv.y >= 0.5) vAo = aAoCorners.x; // top-left
  else if (uv.x >= 0.5 && uv.y >= 0.5) vAo = aAoCorners.y; // top-right
  else if (uv.x < 0.5 && uv.y <  0.5) vAo = aAoCorners.z; // bottom-left
  else                                  vAo = aAoCorners.w; // bottom-right

  // ── 3. Rotate UV within the tile (0=0°, 1=90°CCW, 2=180°, 3=270°CCW) ──────
  int iRot = int(floor(aSurface.y + 0.5));
  if (iRot == 1)      localUv = vec2(localUv.y, 1.0 - localUv.x);
  else if (iRot == 2) localUv = vec2(1.0 - localUv.x, 1.0 - localUv.y);
  else if (iRot == 3) localUv = vec2(1.0 - localUv.y, localUv.x);

  vLocalUv = localUv;

  // ── 4. Map local UV into the atlas rect ────────────────────────────────────
  vTileOrigin = aUvRect.xy;
  vTileSize   = aUvRect.zw;
  vAtlasUv    = vTileOrigin + localUv * vTileSize;

  // ── 5. Overlay UV: cell-centre in normalised dungeon-grid space ────────────
  // Adding 0.5 moves from corner to centre of the cell so the lookup texture
  // is sampled at the right texel for this grid cell.
  vOverlayUv = (aCellFace.xy + 0.5) / uDungeonSize;

  // ── 6. World position + height offset ─────────────────────────────────────
  vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
  worldPos.y   += aSurface.x;

  // ── 7. Fog distance (eye-space length) ────────────────────────────────────
  vec4 eyePos = viewMatrix * worldPos;
  vFogDist    = length(eyePos.xyz);
  vViewPos    = eyePos.xyz;

  // ── 8. Directional surface lighting ───────────────────────────────────────
  // For walls (uSurfaceLight < 0): brightness depends on how directly the wall
  // faces the camera. abs() makes back-facing walls identical to front-facing.
  //   dot = ±1 → wall perpendicular to view → uWallLightMax (e.g. 1.1, bright)
  //   dot =  0 → wall parallel to view      → uWallLightMin (e.g. 0.9, dim)
  // For flat surfaces (uSurfaceLight >= 0): uSurfaceLight is used directly
  // (floor=0.85, ceiling=0.95 by default; configurable via surfaceLighting option).
  if (uSurfaceLight < 0.0) {
    vFacingLight = uWallLightMin + abs(dot(aCellFace.zw, uCamDir)) * (uWallLightMax - uWallLightMin);
  } else {
    vFacingLight = uSurfaceLight;
  }

  gl_Position = projectionMatrix * eyePos;
}
`;
	/**
	* Atlas fragment shader.
	*
	* Rendering pipeline (in order):
	*   1. Base tile sample    — atlas texture at the rect mapped by the vertex shader.
	*   2. Surface-painter overlays — up to 4 overlay tile IDs blended over the base
	*      (walls, floors, ceilings separately via uOverlayLookup).
	*   3. Skirt overlays      — up to 4 additional overlay IDs for skirt/edge panels
	*      (uSkirtLookup, same RGBA encoding as the surface-painter lookup).
	*   4. Ambient occlusion   — corner-darkening via vAo × uAoIntensity.
	*   5. Directional lighting — surface-orientation brightness via vFacingLight.
	*   6. Fog                 — linear blend to uFogColor over [uFogNear, uFogFar].
	*/
	var BASIC_ATLAS_FRAG = `
#include <common>
#include <lights_pars_begin>

// ── Uniforms ──────────────────────────────────────────────────────────────────
uniform sampler2D uAtlas;
// Half-texel size of the atlas texture, used to inset UV clamp bounds and
// prevent sampling the adjacent tile across a texel boundary.
uniform vec2  uTexelSize;
uniform vec3  uFogColor;
uniform float uFogNear;
uniform float uFogFar;

// Ambient occlusion intensity in [0,1].
//   0   = AO disabled (mix term is always 1.0; zero cost).
//   0.75 = default when ambientOcclusion: true.
//   1   = fully-occluded corners go black.
// Applied as: color *= mix(1 - uAoIntensity, 1.0, vAo)
uniform float uAoIntensity;

// ── Surface-painter overlay system ───────────────────────────────────────────
// Each grid cell can have up to 4 atlas tile IDs composited over the base tile.
// uOverlayLookup: W×H Uint8 RGBA DataTexture — one texel per dungeon cell.
//   Each RGBA channel encodes one overlay tile ID (0 = empty slot).
//   Separate textures exist for floor, wall, and ceiling surfaces.
// uTileUvLookup:  1D Float RGBA DataTexture — one texel per tile ID.
//   Each texel stores (uvX, uvY, uvW, uvH) for that tile in atlas UV space.
//   Indexed by tile ID; enables the overlay system to look up any tile's UV.
// uTileUvCount:   width of uTileUvLookup (= max tile ID + 1).
uniform sampler2D uOverlayLookup;
uniform sampler2D uTileUvLookup;
uniform float     uTileUvCount;

// Per-cell skirt overlay slots — same RGBA encoding as uOverlayLookup.
// Applied only to skirt/edge panel meshes via a separate lookup texture.
// Defaults to a 1×1 zero texture (no-op) when skirt overrides are not in use.
uniform sampler2D uSkirtLookup;

// ── Varyings (from vertex shader) ─────────────────────────────────────────────
varying vec2  vAtlasUv;     // Final atlas UV after rect mapping + rotation
varying vec2  vTileOrigin;  // Top-left of the atlas tile rect (for clamping)
varying vec2  vTileSize;    // Width/height of the atlas tile rect (for clamping)
varying vec2  vLocalUv;     // Local UV within the tile [0,1]² after rotation
varying vec2  vOverlayUv;   // UV into the overlay / skirt lookup textures
varying float vFogDist;     // Eye-space distance for fog
varying float vAo;          // Interpolated AO corner value [0,1]
varying float vFacingLight; // Directional surface brightness multiplier
varying vec3  vViewPos;     // Eye-space position for scene point light attenuation

// Look up tile ID's UV rect from the 1D tileUvLookup, then sample the atlas
// at vLocalUv within that rect. Used by the overlay composite passes.
vec4 sampleOverlayTile(float id) {
  // Centre-sample the 1D texture to avoid filtering artifacts on the boundary.
  vec2 luv = vec2((id + 0.5) / uTileUvCount, 0.5);
  vec4 tr  = texture2D(uTileUvLookup, luv); // (uvX, uvY, uvW, uvH)
  // Inset by half a texel on each edge to prevent bleeding from adjacent tiles.
  vec2 ov  = clamp(
    tr.xy + vLocalUv * tr.zw,
    tr.xy + uTexelSize * 0.5,
    tr.xy + tr.zw    - uTexelSize * 0.5
  );
  return texture2D(uAtlas, ov);
}

void main() {
  // ── 1. Base tile sample ────────────────────────────────────────────────────
  // Clamp to the tile's texel-inset bounds to prevent bleed from adjacent tiles.
  vec2 uvMin   = vTileOrigin + uTexelSize * 0.5;
  vec2 uvMax   = vTileOrigin + vTileSize  - uTexelSize * 0.5;
  vec2 atlasUv = clamp(vAtlasUv, uvMin, uvMax);

  vec4 color = texture2D(uAtlas, atlasUv);
  if (color.a < 0.01) discard;

  // ── 2. Surface-painter overlays (4 slots, RGBA-packed) ────────────────────
  // Each channel of the lookup texel is a tile ID (0 = no overlay for that slot).
  // IDs are stored as uint8 [0,255] in the texture and recovered via *255+0.5.
  vec4 slots = texture2D(uOverlayLookup, vOverlayUv);

  float id0 = floor(slots.r * 255.0 + 0.5);
  if (id0 > 0.5) { vec4 oc = sampleOverlayTile(id0); color.rgb = mix(color.rgb, oc.rgb, oc.a); }

  float id1 = floor(slots.g * 255.0 + 0.5);
  if (id1 > 0.5) { vec4 oc = sampleOverlayTile(id1); color.rgb = mix(color.rgb, oc.rgb, oc.a); }

  float id2 = floor(slots.b * 255.0 + 0.5);
  if (id2 > 0.5) { vec4 oc = sampleOverlayTile(id2); color.rgb = mix(color.rgb, oc.rgb, oc.a); }

  float id3 = floor(slots.a * 255.0 + 0.5);
  if (id3 > 0.5) { vec4 oc = sampleOverlayTile(id3); color.rgb = mix(color.rgb, oc.rgb, oc.a); }

  // ── 3. Skirt overlays (4 slots, same RGBA encoding) ───────────────────────
  // A separate lookup texture targets skirt/edge panels independently from
  // the main wall/floor/ceiling overlay, so skirt tile overrides don't bleed
  // onto the base surface.
  vec4 skirtSlots = texture2D(uSkirtLookup, vOverlayUv);
  float sk0 = floor(skirtSlots.r * 255.0 + 0.5);
  if (sk0 > 0.5) { vec4 oc = sampleOverlayTile(sk0); color.rgb = mix(color.rgb, oc.rgb, oc.a); }
  float sk1 = floor(skirtSlots.g * 255.0 + 0.5);
  if (sk1 > 0.5) { vec4 oc = sampleOverlayTile(sk1); color.rgb = mix(color.rgb, oc.rgb, oc.a); }
  float sk2 = floor(skirtSlots.b * 255.0 + 0.5);
  if (sk2 > 0.5) { vec4 oc = sampleOverlayTile(sk2); color.rgb = mix(color.rgb, oc.rgb, oc.a); }
  float sk3 = floor(skirtSlots.a * 255.0 + 0.5);
  if (sk3 > 0.5) { vec4 oc = sampleOverlayTile(sk3); color.rgb = mix(color.rgb, oc.rgb, oc.a); }

  // ── 4. Ambient occlusion ──────────────────────────────────────────────────
  // vAo=1 (open corner) → multiplier = 1.0 (no change).
  // vAo=0 (fully boxed corner) → multiplier = (1 - uAoIntensity).
  // At uAoIntensity=0 the term is always 1.0; the pass costs a single multiply.
  color.rgb *= mix(1.0 - uAoIntensity, 1.0, vAo);

  // ── 5. Directional surface lighting ───────────────────────────────────────
  // vFacingLight is computed per-vertex in the vertex shader and interpolated:
  //   Floor/ceiling: fixed uSurfaceLight value (configurable via surfaceLighting option;
  //                  defaults: floor=0.85, ceiling=0.95)
  //   Walls/skirts:  uWallLightMin + abs(dot(face_normal, cam_forward))
  //                                * (uWallLightMax - uWallLightMin)
  //                  defaults: min=0.9 (side walls), max=1.1 (facing walls)
  color.rgb *= vFacingLight;

  // ── 5.5. Scene lights ──────────────────────────────────────────────────────
  // Requires lights: true on the ShaderMaterial. Three.js injects ambientLightColor
  // (sum of all AmbientLights) and pointLights[] (view-space position + color +
  // attenuation params) automatically. With the default AmbientLight(white, 1.0)
  // and no PointLights this step is a no-op — fully backward compatible.
  //
  // To use dynamic lighting: lower/remove the ambient, add THREE.PointLight objects
  // to renderer.scene. Attach a PointLight to renderer.camera for a player torch.
  {
    vec3 lightAccum = ambientLightColor;
    #if NUM_POINT_LIGHTS > 0
      for (int i = 0; i < NUM_POINT_LIGHTS; i++) {
        vec3  lVec  = pointLights[i].position - vViewPos;
        float atten = getDistanceAttenuation(
          length(lVec), pointLights[i].distance, pointLights[i].decay);
        lightAccum += pointLights[i].color * atten;
      }
    #endif
    color.rgb *= lightAccum;
  }

  // ── 6. Fog ────────────────────────────────────────────────────────────────
  float fogFactor = smoothstep(uFogNear, uFogFar, vFogDist);
  gl_FragColor = vec4(mix(color.rgb, uFogColor, fogFactor), color.a);
}
`;
	/**
	* Build the Three.js uniform map for `BASIC_ATLAS_VERT` / `BASIC_ATLAS_FRAG`.
	*
	* All overlay and skirt params are optional; when omitted a 1×1 zero-filled
	* DataTexture is substituted so the overlay pass is a no-op at zero cost.
	*
	* The `surfaceLight` and `camDir` params drive the directional surface lighting
	* pass. Pass `surfaceLight >= 0` for flat surfaces (floor = 0.85, ceil = 0.95)
	* or `surfaceLight < 0` for wall/skirt materials that need the camera-angle
	* formula. `camDir` must be updated every frame for the wall formula to track
	* player rotation; it has no effect on flat-surface materials.
	*/
	function makeBasicAtlasUniforms(params) {
		const defaultTex = makeSinglePixelTex();
		return {
			uAtlas: { value: params.atlas },
			uTexelSize: { value: params.texelSize },
			uFogColor: { value: params.fogColor },
			uFogNear: { value: params.fogNear },
			uFogFar: { value: params.fogFar },
			uAoIntensity: { value: params.aoIntensity ?? 0 },
			uCamDir: { value: params.camDir ?? new three.Vector2(0, -1) },
			uSurfaceLight: { value: params.surfaceLight ?? 1 },
			uWallLightMin: { value: params.wallLightMin ?? .9 },
			uWallLightMax: { value: params.wallLightMax ?? 1.1 },
			uTileUvLookup: { value: params.tileUvLookup ?? defaultTex },
			uTileUvCount: { value: params.tileUvCount ?? 1 },
			uOverlayLookup: { value: params.overlayLookup ?? defaultTex },
			uSkirtLookup: { value: params.skirtLookup ?? defaultTex },
			uDungeonSize: { value: params.dungeonSize ?? new three.Vector2(1, 1) }
		};
	}
	/** Returns a 1×1 transparent black DataTexture used as a no-op default. */
	function makeSinglePixelTex() {
		const tex = new three.DataTexture(new Uint8Array(4), 1, 1, three.RGBAFormat);
		tex.magFilter = three.NearestFilter;
		tex.minFilter = three.NearestFilter;
		tex.needsUpdate = true;
		return tex;
	}
	//#endregion
	//#region src/lib/rendering/tileAtlas.ts
	/**
	* Resolve a tile specifier to a numeric ID.
	* If `tile` is already a number, return it as-is.
	* If `tile` is a string, call `resolver` to look it up.
	* Returns 0 when the resolver returns undefined (safe fallback).
	*/
	function resolveTile(tile, resolver) {
		if (typeof tile === "number") return tile;
		return resolver?.(tile) ?? 0;
	}
	//#endregion
	//#region src/lib/rendering/textureLoader.ts
	/**
	* Convert a PackedSprite rotation (degrees CW) to a FaceRotation index
	* compatible with the FaceTileSpec / billboard shader pathway.
	*
	* FaceRotation: 0=0°, 1=90° CCW, 2=180°, 3=270° CCW
	* PackedSprite.rotation: 0=0°, 90=90° CW, 180=180°, 270=270° CW
	*/
	function toFaceRotation(rotation) {
		return {
			0: 0,
			90: 3,
			180: 2,
			270: 1
		}[rotation] ?? 0;
	}
	/**
	* Convert a PackedSprite's canvas UV coordinates to a GL-convention UV rect.
	* Three.js textures use flipY=true by default, so canvas y=0 (top) becomes
	* GL y=1 (top). The returned rect's y is the GL bottom-left corner of the sprite.
	*/
	function spriteToUvRect(sprite) {
		return {
			x: sprite.uvX,
			y: 1 - sprite.uvY - sprite.uvH,
			w: sprite.uvW,
			h: sprite.uvH
		};
	}
	/**
	* Create a tile-name resolver from a baked PackedAtlas.
	* Pass the returned function as `tileNameResolver` in DungeonRendererOptions.
	*
	* @example
	* const packed = await loadTextureAtlas(src, json);
	* const resolver = packedAtlasResolver(packed);
	* createDungeonRenderer(el, game, { ..., tileNameResolver: resolver });
	*/
	function packedAtlasResolver(atlas) {
		return (name) => atlas.getByName(name)?.id ?? 0;
	}
	/**
	* Resolve a sprite from a PackedAtlas by either name or insertion-order id.
	*/
	function resolveSprite(atlas, nameOrId) {
		return typeof nameOrId === "string" ? atlas.getByName(nameOrId) : atlas.getById(nameOrId);
	}
	var PADDING = 2;
	function computeLayout(frames) {
		const entries = Object.entries(frames).map(([name, af]) => ({
			name,
			frame: af,
			outW: af.sourceSize.w,
			outH: af.sourceSize.h,
			destX: 0,
			destY: 0
		}));
		const sorted = [...entries].sort((a, b) => b.outH - a.outH);
		for (let texSize = 512; texSize <= 4096; texSize *= 2) {
			let cursorX = 0;
			let cursorY = 0;
			let shelfH = 0;
			let fits = true;
			for (const e of sorted) {
				const cellW = e.outW + PADDING * 2;
				const cellH = e.outH + PADDING * 2;
				if (cellW > texSize) {
					fits = false;
					break;
				}
				if (cursorX + cellW > texSize) {
					cursorY += shelfH;
					cursorX = 0;
					shelfH = 0;
				}
				if (cursorY + cellH > texSize) {
					fits = false;
					break;
				}
				e.destX = cursorX + PADDING;
				e.destY = cursorY + PADDING;
				cursorX += cellW;
				shelfH = Math.max(shelfH, cellH);
			}
			if (fits) return {
				entries,
				texSize
			};
		}
		throw new Error("[textureLoader] Sprites cannot fit into a 4096×4096 texture.");
	}
	function blitSprite(ctx, source, e) {
		const { frame: af, destX, destY } = e;
		const src = af.frame;
		const sss = af.spriteSourceSize;
		ctx.save();
		if (af.rotated) {
			const cx = destX + sss.x + sss.w / 2;
			const cy = destY + sss.y + sss.h / 2;
			ctx.translate(cx, cy);
			ctx.rotate(-Math.PI / 2);
			ctx.drawImage(source, src.x, src.y, src.h, src.w, -src.h / 2, -src.w / 2, src.h, src.w);
		} else ctx.drawImage(source, src.x, src.y, src.w, src.h, destX + sss.x, destY + sss.y, src.w, src.h);
		ctx.restore();
	}
	function injectOverlay(text, container) {
		const el = document.createElement("div");
		el.style.cssText = "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.75);color:#fff;font-family:monospace;font-size:16px;z-index:9999;";
		el.textContent = text;
		container.appendChild(el);
		return el;
	}
	/**
	* Load multiple TexturePacker-format sprite atlases, repack all sprites from
	* every source into a single power-of-two OffscreenCanvas, and return a
	* PackedAtlas with UV data and name/id lookups.
	*
	* Frames from later sources override same-named frames from earlier ones.
	*
	* @param sources  Array of { imageUrl, atlasJson } pairs.
	* @param options  Optional loading screen and progress options.
	*/
	async function loadMultiAtlas(sources, options = {}) {
		const { showLoadingScreen = true, loadingText = "Loading...", container = typeof document !== "undefined" ? document.body : void 0, onProgress } = options;
		let overlay = null;
		if (showLoadingScreen && container) overlay = injectOverlay(loadingText, container);
		try {
			const total = sources.length + 1;
			const mergedFrames = {};
			const frameSourceIdx = {};
			for (let i = 0; i < sources.length; i++) for (const [name, frame] of Object.entries(sources[i].atlasJson.frames)) {
				mergedFrames[name] = frame;
				frameSourceIdx[name] = i;
			}
			const { entries, texSize } = computeLayout(mergedFrames);
			const imageBitmaps = await Promise.all(sources.map(async (s, i) => {
				const blob = await (await fetch(s.imageUrl)).blob();
				onProgress?.(i + 1, total);
				return createImageBitmap(blob);
			}));
			let canvas;
			let ctx;
			if (typeof OffscreenCanvas !== "undefined") {
				canvas = new OffscreenCanvas(texSize, texSize);
				ctx = canvas.getContext("2d");
			} else {
				const el = document.createElement("canvas");
				el.width = texSize;
				el.height = texSize;
				canvas = el;
				ctx = el.getContext("2d");
			}
			for (const e of entries) blitSprite(ctx, imageBitmaps[frameSourceIdx[e.name]], e);
			for (const bmp of imageBitmaps) bmp.close();
			onProgress?.(total, total);
			const sprites = /* @__PURE__ */ new Map();
			const byId = [];
			entries.forEach((e, idx) => {
				const sprite = {
					name: e.name,
					id: idx,
					uvX: e.destX / texSize,
					uvY: e.destY / texSize,
					uvW: e.outW / texSize,
					uvH: e.outH / texSize,
					pivot: e.frame.pivot ?? {
						x: .5,
						y: .5
					},
					rotation: e.frame.rotation ?? 0
				};
				sprites.set(e.name, sprite);
				byId.push(sprite);
			});
			return {
				texture: canvas,
				sprites,
				getByName: (name) => sprites.get(name),
				getById: (id) => byId[id]
			};
		} finally {
			overlay?.remove();
		}
	}
	/**
	* Load a TexturePacker-format sprite atlas, repack all sprites into a
	* power-of-two OffscreenCanvas, and return a PackedAtlas with UV data and
	* name/id lookups.
	*
	* @param imageUrl  URL of the source sprite sheet image.
	* @param atlasJson Parsed TextureAtlasJson (frames + meta).
	* @param options   Optional loading screen and progress options.
	*/
	async function loadTextureAtlas(imageUrl, atlasJson, options = {}) {
		const { showLoadingScreen = true, loadingText = "Loading...", container = typeof document !== "undefined" ? document.body : void 0, onProgress } = options;
		let overlay = null;
		if (showLoadingScreen && container) overlay = injectOverlay(loadingText, container);
		try {
			const blob = await (await fetch(imageUrl)).blob();
			const source = await createImageBitmap(blob);
			onProgress?.(1, 2);
			const { entries, texSize } = computeLayout(atlasJson.frames);
			let canvas;
			let ctx;
			if (typeof OffscreenCanvas !== "undefined") {
				canvas = new OffscreenCanvas(texSize, texSize);
				ctx = canvas.getContext("2d");
			} else {
				const el = document.createElement("canvas");
				el.width = texSize;
				el.height = texSize;
				canvas = el;
				ctx = el.getContext("2d");
			}
			for (const e of entries) blitSprite(ctx, source, e);
			source.close();
			onProgress?.(2, 2);
			const sprites = /* @__PURE__ */ new Map();
			const byId = [];
			entries.forEach((e, idx) => {
				const sprite = {
					name: e.name,
					id: idx,
					uvX: e.destX / texSize,
					uvY: e.destY / texSize,
					uvW: e.outW / texSize,
					uvH: e.outH / texSize,
					pivot: e.frame.pivot ?? {
						x: .5,
						y: .5
					},
					rotation: e.frame.rotation ?? 0
				};
				sprites.set(e.name, sprite);
				byId.push(sprite);
			});
			return {
				texture: canvas,
				sprites,
				getByName: (name) => sprites.get(name),
				getById: (id) => byId[id]
			};
		} finally {
			overlay?.remove();
		}
	}
	//#endregion
	//#region src/lib/rendering/billboardSprites.ts
	var BILLBOARD_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
	var BILLBOARD_FRAG = `
uniform sampler2D uAtlas;
uniform float uUvX;
uniform float uUvY;
uniform float uUvW;
uniform float uUvH;
uniform float uOpacity;

varying vec2 vUv;

void main() {
  vec2 atlasUv = vec2(uUvX + vUv.x * uUvW, uUvY + vUv.y * uUvH);
  vec4 color = texture2D(uAtlas, atlasUv);
  if (color.a < 0.01) discard;
  gl_FragColor = vec4(color.rgb, color.a * uOpacity);
}
`;
	var ANGLE_KEYS = [
		"N",
		"NE",
		"E",
		"SE",
		"S",
		"SW",
		"W",
		"NW"
	];
	function selectAngleKey(entityFacing, cameraYaw) {
		const rel = ((entityFacing - cameraYaw) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
		return ANGLE_KEYS[Math.round(rel / (Math.PI / 4)) % 8] ?? "N";
	}
	/**
	* Create a per-entity billboard handle. Call `handle.update()` each RAF frame.
	* The atlas texture should already be created and cached by the caller.
	*/
	function createBillboard(entity, packedAtlas, scene, resolver, expectedFrameSize = 64) {
		const { spriteMap } = entity;
		const group = new three.Group();
		scene.add(group);
		const atlasTex = new three.Texture(packedAtlas.texture);
		atlasTex.magFilter = three.NearestFilter;
		atlasTex.minFilter = three.NearestFilter;
		atlasTex.needsUpdate = true;
		function getRect(tile) {
			const id = resolveTile(tile, resolver);
			const sprite = packedAtlas.getById(id);
			return sprite ? spriteToUvRect(sprite) : {
				x: 0,
				y: 0,
				w: 0,
				h: 0
			};
		}
		function getPivot(tile) {
			const id = resolveTile(tile, resolver);
			return packedAtlas.getById(id)?.pivot ?? {
				x: .5,
				y: .5
			};
		}
		const layerEntries = spriteMap.layers.map((layer, layerIndex) => {
			const rect = getRect(layer.tile);
			const uniforms = {
				uAtlas: { value: atlasTex },
				uUvX: { value: rect.x },
				uUvY: { value: rect.y },
				uUvW: { value: rect.w },
				uUvH: { value: rect.h },
				uOpacity: { value: layer.opacity ?? 1 }
			};
			const mat = new three.ShaderMaterial({
				vertexShader: BILLBOARD_VERT,
				fragmentShader: BILLBOARD_FRAG,
				uniforms,
				transparent: true,
				depthWrite: false,
				side: three.DoubleSide
			});
			const geo = new three.PlaneGeometry(1, 1);
			const mesh = new three.Mesh(geo, mat);
			mesh.renderOrder = layerIndex + 1;
			const s = layer.scale ?? 1;
			mesh.position.set(layer.offsetX ?? 0, layer.offsetY ?? 0, layerIndex * .001);
			mesh.scale.set(s, s, 1);
			group.add(mesh);
			return {
				mesh,
				uniforms,
				baseLayer: layer,
				layerIndex
			};
		});
		return {
			update(ent, cameraYaw, tileSize, ceilingH) {
				const wx = (ent.x + .5) * tileSize;
				const wz = (ent.z + .5) * tileSize;
				const wy = (1 - (spriteMap.layers[0] ? getPivot(spriteMap.layers[0].tile) : {
					x: .5,
					y: .5
				}).y) * tileSize;
				group.position.set(wx, wy, wz);
				group.rotation.set(0, cameraYaw, 0, "YXZ");
				const sprW = tileSize * (spriteMap.frameSize.w / expectedFrameSize);
				const sprH = tileSize * (spriteMap.frameSize.h / expectedFrameSize);
				const angleKey = selectAngleKey(ent.facing ?? 0, cameraYaw);
				const overrides = spriteMap.angles?.[angleKey];
				for (const entry of layerEntries) {
					const override = overrides?.find((o) => o.layerIndex === entry.layerIndex);
					const rect = getRect(override?.tile ?? entry.baseLayer.tile);
					entry.uniforms.uUvX.value = rect.x;
					entry.uniforms.uUvY.value = rect.y;
					entry.uniforms.uUvW.value = rect.w;
					entry.uniforms.uUvH.value = rect.h;
					entry.uniforms.uOpacity.value = override?.opacity ?? entry.baseLayer.opacity ?? 1;
					const s = entry.baseLayer.scale ?? 1;
					entry.mesh.scale.set(sprW * s, sprH * s, 1);
					const bob = entry.baseLayer.bob;
					const bobTheta = bob ? performance.now() / 1e3 * (bob.speed ?? 2) + (bob.phase ?? 0) : 0;
					const bobX = bob ? (bob.amplitudeX ?? 0) * Math.sin(bobTheta) : 0;
					const bobY = bob ? (bob.amplitudeY ?? 0) * (1 + Math.sin(bobTheta)) : 0;
					entry.mesh.position.set((entry.baseLayer.offsetX ?? 0) + bobX, (entry.baseLayer.offsetY ?? 0) + bobY, entry.layerIndex * .001);
				}
			},
			dispose() {
				scene.remove(group);
				for (const entry of layerEntries) {
					entry.mesh.geometry.dispose();
					entry.mesh.material.dispose();
				}
			}
		};
	}
	//#endregion
	//#region src/lib/rendering/skybox.ts
	/**
	* Load a `THREE.CubeTexture` from 6 face image URLs and apply an optional
	* Y-axis rotation. The returned texture is ready to assign to `scene.background`.
	*/
	function loadSkybox(opts) {
		if (opts.faces instanceof three.CubeTexture) {
			const tex = opts.faces;
			if (opts.rotationY) tex.rotation = opts.rotationY;
			return Promise.resolve(tex);
		}
		return new Promise((resolve, reject) => {
			const { px, nx, py, ny, pz, nz } = opts.faces;
			new three.CubeTextureLoader().load([
				px,
				nx,
				py,
				ny,
				pz,
				nz
			], (tex) => {
				if (opts.rotationY) tex.rotation = opts.rotationY;
				resolve(tex);
			}, void 0, reject);
		});
	}
	//#endregion
	//#region src/lib/rendering/dungeonRenderer.ts
	/**
	* dungeonRenderer.ts
	*
	* Plain Three.js first-person dungeon renderer — no React or R3F required.
	* Designed for script-tag usage: create it after `game.generate()` is wired
	* up, and it will visualise the dungeon and player/entity positions.
	*
	* Usage (plain colours):
	*   const renderer = createDungeonRenderer(document.getElementById('viewport'), game);
	*
	* Usage (tile atlas):
	*   const packed = await loadTextureAtlas('sprites.png', atlasJson);
	*   const resolver = packedAtlasResolver(packed);
	*   const renderer = createDungeonRenderer(el, game, {
	*     packedAtlas: packed,
	*     tileNameResolver: resolver,
	*     floorTile: 'stone_floor',
	*     ceilTile:  'ceiling_stone',
	*     wallTile:  'brick_wall',
	*   });
	*
	*   // Pass live entity list on every turn:
	*   game.events.on('turn', () => renderer.setEntities(enemies));
	*/
	var HALF_PI = Math.PI / 2;
	/** Eye height as a fraction of ceiling height (same as PerspectiveDungeonView). */
	var EYE_HEIGHT_FACTOR = .66;
	function vertexAO(s1, s2, c) {
		if (s1 && s2) return 0;
		return 3 - ((s1 ? 1 : 0) + (s2 ? 1 : 0) + (c ? 1 : 0));
	}
	/**
	* Compute per-corner AO for one face, returned as [tl, tr, bl, br] in [0,1].
	* Corners map to face-local UV space: tl=UV(0,1), tr=UV(1,1), bl=UV(0,0), br=UV(1,0).
	* For wall faces the top and bottom of each column share the same value.
	* UV orientation per direction is derived from the face rotation used in buildDungeon.
	*/
	function computeFaceAO(isSol, cx, cz, dir) {
		const n = isSol;
		if (dir === "floor") return [
			vertexAO(n(cx - 1, cz), n(cx, cz - 1), n(cx - 1, cz - 1)) / 3,
			vertexAO(n(cx + 1, cz), n(cx, cz - 1), n(cx + 1, cz - 1)) / 3,
			vertexAO(n(cx - 1, cz), n(cx, cz + 1), n(cx - 1, cz + 1)) / 3,
			vertexAO(n(cx + 1, cz), n(cx, cz + 1), n(cx + 1, cz + 1)) / 3
		];
		if (dir === "ceil") return [
			vertexAO(n(cx - 1, cz), n(cx, cz + 1), n(cx - 1, cz + 1)) / 3,
			vertexAO(n(cx + 1, cz), n(cx, cz + 1), n(cx + 1, cz + 1)) / 3,
			vertexAO(n(cx - 1, cz), n(cx, cz - 1), n(cx - 1, cz - 1)) / 3,
			vertexAO(n(cx + 1, cz), n(cx, cz - 1), n(cx + 1, cz - 1)) / 3
		];
		if (dir === "north") {
			const aoL = vertexAO(n(cx - 1, cz), true, n(cx - 1, cz - 1)) / 3;
			const aoR = vertexAO(n(cx + 1, cz), true, n(cx + 1, cz - 1)) / 3;
			return [
				aoL,
				aoR,
				aoL,
				aoR
			];
		}
		if (dir === "south") {
			const aoR = vertexAO(n(cx + 1, cz), true, n(cx + 1, cz + 1)) / 3;
			const aoL = vertexAO(n(cx - 1, cz), true, n(cx - 1, cz + 1)) / 3;
			return [
				aoR,
				aoL,
				aoR,
				aoL
			];
		}
		if (dir === "west") {
			const aoS = vertexAO(n(cx, cz + 1), true, n(cx - 1, cz + 1)) / 3;
			const aoN = vertexAO(n(cx, cz - 1), true, n(cx - 1, cz - 1)) / 3;
			return [
				aoS,
				aoN,
				aoS,
				aoN
			];
		}
		if (dir === "east") {
			const aoN = vertexAO(n(cx, cz - 1), true, n(cx + 1, cz - 1)) / 3;
			const aoS = vertexAO(n(cx, cz + 1), true, n(cx + 1, cz + 1)) / 3;
			return [
				aoN,
				aoS,
				aoN,
				aoS
			];
		}
		return [
			1,
			1,
			1,
			1
		];
	}
	function makeFaceMatrix(x, y, z, rx, ry, rz, w, h) {
		return new three.Matrix4().compose(new three.Vector3(x, y, z), new three.Quaternion().setFromEuler(new three.Euler(rx, ry, rz)), new three.Vector3(w, h, 1));
	}
	/**
	* Build a PlaneGeometry with a pre-allocated aTileId InstancedBufferAttribute,
	* and an InstancedMesh using either a ShaderMaterial (atlas) or a plain material.
	*/
	function buildInstancedMesh(matrices, uvRects, material, useAtlas, heightOffsets, uvRotations, uvHeightScales, cellX, cellZ, aoCorners, faceNormals) {
		const geo = new three.PlaneGeometry(1, 1);
		if (useAtlas) {
			const n = matrices.length;
			const uvRectArr = new Float32Array(n * 4);
			uvRects.forEach((r, i) => {
				uvRectArr[i * 4] = r.x;
				uvRectArr[i * 4 + 1] = r.y;
				uvRectArr[i * 4 + 2] = r.w;
				uvRectArr[i * 4 + 3] = r.h;
			});
			geo.setAttribute("aUvRect", new three.InstancedBufferAttribute(uvRectArr, 4));
			const surfaceArr = new Float32Array(n * 3);
			for (let i = 0; i < n; i++) {
				surfaceArr[i * 3] = heightOffsets ? heightOffsets[i] ?? 0 : 0;
				surfaceArr[i * 3 + 1] = uvRotations ? uvRotations[i] ?? 0 : 0;
				surfaceArr[i * 3 + 2] = uvHeightScales ? uvHeightScales[i] ?? 1 : 1;
			}
			geo.setAttribute("aSurface", new three.InstancedBufferAttribute(surfaceArr, 3));
			const aoArr = aoCorners ?? new Float32Array(n * 4).fill(1);
			geo.setAttribute("aAoCorners", new three.InstancedBufferAttribute(aoArr, 4));
			const cellFaceArr = new Float32Array(n * 4);
			for (let i = 0; i < n; i++) {
				cellFaceArr[i * 4] = cellX ? cellX[i] ?? 0 : 0;
				cellFaceArr[i * 4 + 1] = cellZ ? cellZ[i] ?? 0 : 0;
				cellFaceArr[i * 4 + 2] = faceNormals ? faceNormals[i * 2] ?? 0 : 0;
				cellFaceArr[i * 4 + 3] = faceNormals ? faceNormals[i * 2 + 1] ?? 0 : 0;
			}
			geo.setAttribute("aCellFace", new three.InstancedBufferAttribute(cellFaceArr, 4));
		}
		const mesh = new three.InstancedMesh(geo, material, matrices.length);
		matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
		mesh.instanceMatrix.needsUpdate = true;
		return mesh;
	}
	/**
	* Mount a Three.js first-person dungeon renderer into `element`.
	*
	* Call after `game.generate()` is wired up. The renderer reads dungeon geometry
	* from the game handle and re-renders whenever the player moves. Pass an
	* `options.packedAtlas` + `options.tileNameResolver` pair to enable textured
	* walls/floors/ceilings; omit them for flat-colour geometry.
	*
	* @param element  Container element — the renderer fills it entirely.
	* @param game     Live `GameHandle` returned by `createGame()`.
	* @param options  Optional renderer configuration (fog, atlas, skirt tiles, etc.).
	* @returns        A `DungeonRenderer` handle with `setEntities`, `addLayer`, etc.
	*
	* @example
	* const packed = await loadTextureAtlas('sprites.png', atlasJson);
	* const renderer = createDungeonRenderer(document.getElementById('viewport'), game, {
	*   packedAtlas: packed,
	*   tileNameResolver: packedAtlasResolver(packed),
	*   floorTile: 'stone_floor',
	*   wallTile:  'brick_wall',
	*   ceilTile:  'ceiling_stone',
	* });
	* game.events.on('turn', () => renderer.setEntities([...enemies]));
	*/
	function createDungeonRenderer(element, game, options = {}) {
		const tileSize = options.tileSize ?? 3;
		const ceilingH = options.ceilingHeight ?? 3;
		const eyeHeightFactor = options.eyeHeightFactor ?? EYE_HEIGHT_FACTOR;
		const fov = options.fov ?? 75;
		const fogNear = options.fogNear ?? 5;
		const fogFar = options.fogFar ?? 24;
		const fogHex = options.fogColor ?? "#000000";
		const lerpFactor = options.lerpFactor ?? .18;
		const fogColor = new three.Color(fogHex);
		const packedAtlas = options.packedAtlas;
		const resolver = options.tileNameResolver;
		let aoIntensity = options.ambientOcclusion === true ? .75 : typeof options.ambientOcclusion === "number" ? Math.max(0, Math.min(1, options.ambientOcclusion)) : 0;
		const aoEnabled = aoIntensity > 0;
		const sl = options.surfaceLighting ?? {};
		const floorLight = sl.floor ?? .85;
		const ceilLight = sl.ceiling ?? .95;
		const wallLightMin = sl.wallMin ?? .9;
		const wallLightMax = sl.wallMax ?? 1.1;
		const atlasMaterials = [];
		function getUvRect(id) {
			const sprite = packedAtlas?.getById(id);
			return sprite ? spriteToUvRect(sprite) : {
				x: 0,
				y: 0,
				w: 0,
				h: 0
			};
		}
		const floorId = resolveTile(options.floorTile ?? 0, resolver);
		const ceilId = resolveTile(options.ceilTile ?? 0, resolver);
		const wallId = resolveTile(options.wallTile ?? 0, resolver);
		const wallTiles = options.wallTiles;
		const floorSkirtTiles = options.floorSkirtTiles;
		const ceilSkirtTiles = options.ceilSkirtTiles;
		const glRenderer = new three.WebGLRenderer({ antialias: false });
		glRenderer.setPixelRatio(window.devicePixelRatio);
		glRenderer.setClearColor(fogColor);
		const canvas = glRenderer.domElement;
		canvas.style.cssText = "width:100%;height:100%;display:block;";
		element.appendChild(canvas);
		const scene = new three.Scene();
		scene.fog = new three.Fog(fogColor, fogNear, fogFar);
		let skyboxTex = null;
		let skyboxOwned = false;
		function applySkybox(tex, owned) {
			if (skyboxTex && skyboxOwned) skyboxTex.dispose();
			skyboxTex = tex;
			skyboxOwned = owned;
			scene.background = tex;
		}
		function clearSkybox() {
			if (skyboxTex && skyboxOwned) skyboxTex.dispose();
			skyboxTex = null;
			skyboxOwned = false;
			scene.background = fogColor;
		}
		if (options.skybox) {
			const opts = options.skybox;
			if (opts.faces instanceof three.CubeTexture) {
				if (opts.rotationY) opts.faces.rotation = opts.rotationY;
				applySkybox(opts.faces, false);
			} else loadSkybox(opts).then((tex) => applySkybox(tex, true)).catch(console.error);
		}
		const camera = new three.PerspectiveCamera(fov, 1, .05, fogFar * 2);
		scene.add(camera);
		scene.add(new three.AmbientLight(16777215, 1));
		const dirLight = new three.DirectionalLight(16777215, .6);
		dirLight.position.set(.5, 1, .75);
		scene.add(dirLight);
		let sharedAtlasTex = null;
		if (packedAtlas) {
			sharedAtlasTex = new three.Texture(packedAtlas.texture);
			sharedAtlasTex.magFilter = three.NearestFilter;
			sharedAtlasTex.minFilter = three.NearestFilter;
			sharedAtlasTex.needsUpdate = true;
		}
		let tileUvLookupTex = null;
		let tileUvCount = 1;
		if (packedAtlas) {
			let maxId = 0;
			for (const sp of packedAtlas.sprites.values()) if (sp.id > maxId) maxId = sp.id;
			tileUvCount = maxId + 1;
			const uvData = new Float32Array(tileUvCount * 4);
			for (const sp of packedAtlas.sprites.values()) {
				const uv = spriteToUvRect(sp);
				const i = sp.id * 4;
				uvData[i] = uv.x;
				uvData[i + 1] = uv.y;
				uvData[i + 2] = uv.w;
				uvData[i + 3] = uv.h;
			}
			tileUvLookupTex = new three.DataTexture(uvData, tileUvCount, 1, three.RGBAFormat, three.FloatType);
			tileUvLookupTex.magFilter = three.NearestFilter;
			tileUvLookupTex.minFilter = three.NearestFilter;
			tileUvLookupTex.needsUpdate = true;
		}
		const _defaultOverlayTex = new three.DataTexture(new Uint8Array(4), 1, 1, three.RGBAFormat);
		_defaultOverlayTex.magFilter = three.NearestFilter;
		_defaultOverlayTex.minFilter = three.NearestFilter;
		_defaultOverlayTex.needsUpdate = true;
		const defSurf = {
			tex: _defaultOverlayTex,
			data: new Uint8Array(4)
		};
		let overlayFloor = defSurf;
		let overlayWall = defSurf;
		let overlayCeil = defSurf;
		function makeOverlayTex(data, width, height) {
			const t = new three.DataTexture(data, width, height, three.RGBAFormat, three.UnsignedByteType);
			t.magFilter = three.NearestFilter;
			t.minFilter = three.NearestFilter;
			t.flipY = false;
			t.needsUpdate = true;
			return t;
		}
		/** Rebuild all three per-surface overlay textures from the current paintMap. */
		function rebuildOverlayTexture(width, height) {
			if (!resolver) return;
			const n = width * height * 4;
			const fd = new Uint8Array(n);
			const wd = new Uint8Array(n);
			const cd = new Uint8Array(n);
			for (const [key, paint] of game.dungeon.paintMap) {
				const comma = key.indexOf(",");
				const x = parseInt(key.slice(0, comma), 10);
				const z = parseInt(key.slice(comma + 1), 10);
				if (x < 0 || z < 0 || x >= width || z >= height) continue;
				const idx = (z * width + x) * 4;
				const write = (arr, layers) => {
					if (!layers) return;
					for (let i = 0; i < Math.min(layers.length, 4); i++) arr[idx + i] = resolver(layers[i]) & 255;
				};
				write(fd, paint.floor);
				write(wd, paint.wall);
				write(cd, paint.ceil);
			}
			if (overlayFloor !== defSurf) overlayFloor.tex.dispose();
			if (overlayWall !== defSurf) overlayWall.tex.dispose();
			if (overlayCeil !== defSurf) overlayCeil.tex.dispose();
			overlayFloor = {
				tex: makeOverlayTex(fd, width, height),
				data: fd
			};
			overlayWall = {
				tex: makeOverlayTex(wd, width, height),
				data: wd
			};
			overlayCeil = {
				tex: makeOverlayTex(cd, width, height),
				data: cd
			};
		}
		/** Update one cell in-place across all three overlay textures. */
		function updateOverlayCell(x, z, paint) {
			if (!resolver) return;
			const outputs = game.dungeon.outputs;
			if (!outputs || overlayFloor === defSurf) return;
			const { width, height } = outputs;
			if (x < 0 || z < 0 || x >= width || z >= height) return;
			const idx = (z * width + x) * 4;
			const write = (surf, layers) => {
				if (layers === void 0) return;
				surf.data[idx] = surf.data[idx + 1] = surf.data[idx + 2] = surf.data[idx + 3] = 0;
				for (let i = 0; i < Math.min(layers.length, 4); i++) surf.data[idx + i] = resolver(layers[i]) & 255;
				surf.tex.needsUpdate = true;
			};
			write(overlayFloor, paint.floor);
			write(overlayWall, paint.wall);
			write(overlayCeil, paint.ceil);
		}
		function setSkirtLookupUniform(mat, tex) {
			if (!(mat instanceof three.ShaderMaterial)) return;
			const u = mat.uniforms;
			if (u["uSkirtLookup"]) u["uSkirtLookup"].value = tex;
		}
		function syncSkirtLookupUniforms() {
			const outputs = game.dungeon.outputs;
			if (!outputs) return;
			setSkirtLookupUniform(floorEdgeMat, outputs.textures.floorSkirtType);
			setSkirtLookupUniform(ceilEdgeMat, outputs.textures.ceilSkirtType);
			setSkirtLookupUniform(floorWallSkirtMat, outputs.textures.floorSkirtType);
			setSkirtLookupUniform(ceilWallSkirtMat, outputs.textures.ceilSkirtType);
		}
		/** Push per-surface overlay textures into their respective atlas materials. */
		function syncOverlayUniforms(width, height) {
			const size = new three.Vector2(width, height);
			const set = (mat, overlayTex) => {
				if (!(mat instanceof three.ShaderMaterial)) return;
				const u = mat.uniforms;
				if (u["uOverlayLookup"]) u["uOverlayLookup"].value = overlayTex;
				if (u["uTileUvLookup"]) u["uTileUvLookup"].value = tileUvLookupTex;
				if (u["uTileUvCount"]) u["uTileUvCount"].value = tileUvCount;
				if (u["uDungeonSize"]) u["uDungeonSize"].value = size;
			};
			set(floorMat, overlayFloor.tex);
			set(floorEdgeMat, overlayFloor.tex);
			set(wallMat, overlayWall.tex);
			set(ceilMat, overlayCeil.tex);
			set(ceilEdgeMat, overlayCeil.tex);
			set(floorWallSkirtMat, overlayWall.tex);
			set(ceilWallSkirtMat, overlayWall.tex);
		}
		function makeAtlasMaterial(surfaceLight = 1) {
			const canvas = packedAtlas.texture;
			const mat = new three.ShaderMaterial({
				vertexShader: BASIC_ATLAS_VERT,
				fragmentShader: BASIC_ATLAS_FRAG,
				lights: true,
				uniforms: three.UniformsUtils.merge([three.UniformsLib.lights, makeBasicAtlasUniforms({
					atlas: sharedAtlasTex,
					texelSize: new three.Vector2(1 / canvas.width, 1 / canvas.height),
					fogColor,
					fogNear,
					fogFar,
					...tileUvLookupTex ? {
						tileUvLookup: tileUvLookupTex,
						tileUvCount
					} : {},
					overlayLookup: overlayFloor.tex,
					dungeonSize: new three.Vector2(1, 1),
					aoIntensity,
					surfaceLight,
					wallLightMin,
					wallLightMax
				})]),
				side: three.FrontSide
			});
			atlasMaterials.push(mat);
			return mat;
		}
		function makeAtlasMaterialDoubleSide(surfaceLight = 1) {
			const mat = makeAtlasMaterial(surfaceLight);
			mat.side = three.DoubleSide;
			return mat;
		}
		const floorMat = packedAtlas ? makeAtlasMaterial(floorLight) : new three.MeshStandardMaterial({ color: 5592422 });
		const ceilMat = packedAtlas ? makeAtlasMaterial(ceilLight) : new three.MeshStandardMaterial({ color: 2236979 });
		const wallMat = packedAtlas ? makeAtlasMaterial(-1) : new three.MeshStandardMaterial({ color: 7037040 });
		const floorEdgeMat = packedAtlas ? makeAtlasMaterial(-1) : new three.MeshStandardMaterial({ color: 5592422 });
		const ceilEdgeMat = packedAtlas ? makeAtlasMaterialDoubleSide(-1) : new three.MeshStandardMaterial({
			color: 2236979,
			side: three.DoubleSide
		});
		const floorWallSkirtMat = packedAtlas ? makeAtlasMaterial(-1) : new three.MeshStandardMaterial({ color: 7037040 });
		const ceilWallSkirtMat = packedAtlas ? makeAtlasMaterial(-1) : new three.MeshStandardMaterial({ color: 7037040 });
		let floorMesh = null;
		let ceilMesh = null;
		let wallMesh = null;
		let floorEdgeMesh = null;
		let ceilEdgeMesh = null;
		let floorWallSkirtMesh = null;
		let ceilWallSkirtMesh = null;
		let dungeonBuilt = false;
		let floorCellMap = [];
		let ceilCellMap = [];
		let wallCellMap = [];
		let floorEdgeCellMap = [];
		let ceilEdgeCellMap = [];
		let floorWallSkirtCellMap = [];
		let ceilWallSkirtCellMap = [];
		const meshToCellMap = /* @__PURE__ */ new Map();
		const managedLights = /* @__PURE__ */ new Set();
		const layerEntries = [];
		/** Build an instanced mesh for a single LayerSpec by scanning the dungeon map. */
		function buildLayerMesh(spec) {
			const outputs = game.dungeon.outputs;
			if (!outputs) return null;
			const { width, height } = outputs;
			const solid = outputs.textures.solid.image.data;
			const floorOffData = outputs.textures.floorHeightOffset?.image.data;
			const ceilOffData = outputs.textures.ceilingHeightOffset?.image.data;
			const wallMidY = ceilingH / 2;
			const offsetStep = tileSize * (options.offsetFactor ?? .5);
			const matrices = [];
			const uvRects = [];
			const rotations = [];
			const offsets = [];
			const heightScales = [];
			const cellXs = [];
			const cellZs = [];
			const aoCornerArr = [];
			const faceNormals = [];
			const filter = spec.filter ?? (() => ({ tile: 0 }));
			function isSolid(cx, cz) {
				if (cx < 0 || cz < 0 || cx >= width || cz >= height) return true;
				return (solid[cz * width + cx] ?? 0) > 0;
			}
			function openFloorVal(ncx, ncz) {
				if (ncx < 0 || ncz < 0 || ncx >= width || ncz >= height) return null;
				if (isSolid(ncx, ncz)) return null;
				return floorOffData ? floorOffData[ncz * width + ncx] ?? 128 : 128;
			}
			function openCeilVal(ncx, ncz) {
				if (ncx < 0 || ncz < 0 || ncx >= width || ncz >= height) return null;
				if (isSolid(ncx, ncz)) return null;
				return ceilOffData ? ceilOffData[ncz * width + ncx] ?? 128 : 128;
			}
			function tryAdd(result, matrix, offset = 0, hs = 1, faceCx = 0, faceCz = 0, aoDir, normalX = 0, normalZ = 0) {
				if (!result) return;
				matrices.push(matrix);
				const id = result.tile !== void 0 ? resolveTile(result.tile, resolver) : 0;
				uvRects.push(getUvRect(id));
				rotations.push(result.rotation ?? 0);
				offsets.push(offset);
				heightScales.push(hs);
				cellXs.push(faceCx);
				cellZs.push(faceCz);
				if (aoEnabled && aoDir) {
					const v = computeFaceAO(isSolid, faceCx, faceCz, aoDir);
					aoCornerArr.push(v[0], v[1], v[2], v[3]);
				} else aoCornerArr.push(1, 1, 1, 1);
				faceNormals.push(normalX, normalZ);
			}
			for (let cz = 0; cz < height; cz++) for (let cx = 0; cx < width; cx++) {
				if (isSolid(cx, cz)) continue;
				const idx = cz * width + cx;
				const wx = (cx + .5) * tileSize;
				const wz = (cz + .5) * tileSize;
				const floorVal = floorOffData ? floorOffData[idx] ?? 128 : 128;
				const ceilVal = ceilOffData ? ceilOffData[idx] ?? 128 : 128;
				if (spec.target === "floor" && floorVal !== 0) tryAdd(filter(cx, cz, void 0), makeFaceMatrix(wx, 0, wz, -HALF_PI, 0, 0, tileSize, tileSize), (floorVal - 128) * offsetStep, 1, cx, cz, "floor");
				if (spec.target === "ceil" && ceilVal !== 0) tryAdd(filter(cx, cz, void 0), makeFaceMatrix(wx, ceilingH, wz, HALF_PI, 0, 0, tileSize, tileSize), -(ceilVal - 128) * offsetStep, 1, cx, cz, "ceil");
				if (spec.target === "wall") {
					if (isSolid(cx, cz - 1)) tryAdd(filter(cx, cz, "north"), makeFaceMatrix(wx, wallMidY, cz * tileSize, 0, 0, 0, tileSize, ceilingH), 0, 1, cx, cz, "north", 0, 1);
					if (isSolid(cx, cz + 1)) tryAdd(filter(cx, cz, "south"), makeFaceMatrix(wx, wallMidY, (cz + 1) * tileSize, 0, Math.PI, 0, tileSize, ceilingH), 0, 1, cx, cz, "south", 0, -1);
					if (isSolid(cx - 1, cz)) tryAdd(filter(cx, cz, "west"), makeFaceMatrix(cx * tileSize, wallMidY, wz, 0, HALF_PI, 0, tileSize, ceilingH), 0, 1, cx, cz, "west", 1, 0);
					if (isSolid(cx + 1, cz)) tryAdd(filter(cx, cz, "east"), makeFaceMatrix((cx + 1) * tileSize, wallMidY, wz, 0, -HALF_PI, 0, tileSize, ceilingH), 0, 1, cx, cz, "east", -1, 0);
				}
				if (spec.target === "floorSkirt" && floorVal !== 0) {
					const currentFloorY = (floorVal - 128) * offsetStep;
					function tryAddFloorSkirtTiled(nfVal, mx, mz, ry, dir) {
						const result = filter(cx, cz, dir);
						if (!result) return;
						const neighborFloorY = (nfVal - 128) * offsetStep;
						const stepH = currentFloorY - neighborFloorY;
						const fullPanels = Math.floor(stepH / tileSize);
						const rem = stepH - fullPanels * tileSize;
						for (let i = 0; i < fullPanels; i++) tryAdd(result, makeFaceMatrix(mx, neighborFloorY + i * tileSize + tileSize / 2, mz, 0, ry, 0, tileSize, tileSize), 0, 1, cx, cz);
						if (rem > .001) tryAdd(result, makeFaceMatrix(mx, neighborFloorY + fullPanels * tileSize + rem / 2, mz, 0, ry, 0, tileSize, rem), 0, rem / tileSize, cx, cz);
					}
					const nfN = openFloorVal(cx, cz - 1);
					if (nfN !== null && nfN < floorVal) tryAddFloorSkirtTiled(nfN, wx, cz * tileSize, Math.PI, "north");
					const nfS = openFloorVal(cx, cz + 1);
					if (nfS !== null && nfS < floorVal) tryAddFloorSkirtTiled(nfS, wx, (cz + 1) * tileSize, 0, "south");
					const nfW = openFloorVal(cx - 1, cz);
					if (nfW !== null && nfW < floorVal) tryAddFloorSkirtTiled(nfW, cx * tileSize, wz, -HALF_PI, "west");
					const nfE = openFloorVal(cx + 1, cz);
					if (nfE !== null && nfE < floorVal) tryAddFloorSkirtTiled(nfE, (cx + 1) * tileSize, wz, HALF_PI, "east");
				}
				if (spec.target === "ceilSkirt") {
					const yCurrent = ceilingH - (ceilVal - 128) * offsetStep;
					const addCS = (ncVal, mx, mz, ry, dir) => {
						if (ncVal === null || ncVal === 0 || ncVal <= ceilVal) return;
						const h = (ncVal - ceilVal) * offsetStep;
						const result = filter(cx, cz, dir);
						if (!result) return;
						const fullPanels = Math.floor(h / tileSize);
						const rem = h - fullPanels * tileSize;
						for (let i = 0; i < fullPanels; i++) tryAdd(result, makeFaceMatrix(mx, yCurrent - i * tileSize - tileSize / 2, mz, 0, ry, 0, tileSize, tileSize), 0, 1, cx, cz);
						if (rem > .001) tryAdd(result, makeFaceMatrix(mx, yCurrent - fullPanels * tileSize - rem / 2, mz, 0, ry, 0, tileSize, rem), 0, rem / tileSize, cx, cz);
					};
					addCS(openCeilVal(cx, cz - 1), wx, cz * tileSize, Math.PI, "north");
					addCS(openCeilVal(cx, cz + 1), wx, (cz + 1) * tileSize, 0, "south");
					addCS(openCeilVal(cx - 1, cz), cx * tileSize, wz, -HALF_PI, "west");
					addCS(openCeilVal(cx + 1, cz), (cx + 1) * tileSize, wz, HALF_PI, "east");
				}
			}
			if (matrices.length === 0) return null;
			const useAtlas = spec.useAtlas ?? !!packedAtlas;
			const mesh = buildInstancedMesh(matrices, uvRects, spec.material, useAtlas, new Float32Array(offsets), rotations, spec.target === "ceilSkirt" || spec.target === "floorSkirt" ? heightScales : void 0, new Float32Array(cellXs), new Float32Array(cellZs), aoCornerArr.length ? new Float32Array(aoCornerArr) : void 0, faceNormals.length ? new Float32Array(faceNormals) : void 0);
			if (spec.polygonOffset !== false) {
				spec.material.polygonOffset = true;
				spec.material.polygonOffsetFactor = -1;
				spec.material.polygonOffsetUnits = -1;
			}
			mesh.renderOrder = 1;
			return mesh;
		}
		function buildDungeon() {
			if (dungeonBuilt) return;
			const outputs = game.dungeon.outputs;
			if (!outputs) return;
			dungeonBuilt = true;
			const { width, height } = outputs;
			const solid = outputs.textures.solid.image.data;
			const wallMidY = ceilingH / 2;
			const offsetStep = tileSize * (options.offsetFactor ?? .5);
			const floorOffData = outputs.textures.floorHeightOffset?.image.data;
			const ceilOffData = outputs.textures.ceilingHeightOffset?.image.data;
			function spec(map, dir, fallbackId) {
				return map?.[dir] ?? {
					tile: fallbackId,
					rotation: 0
				};
			}
			floorCellMap = [];
			ceilCellMap = [];
			wallCellMap = [];
			floorEdgeCellMap = [];
			ceilEdgeCellMap = [];
			floorWallSkirtCellMap = [];
			ceilWallSkirtCellMap = [];
			const floors = [];
			const ceils = [];
			const walls = [];
			const floorEdges = [];
			const ceilEdges = [];
			const floorRects = [];
			const ceilRects = [];
			const wallRects = [];
			const floorEdgeRects = [];
			const ceilEdgeRects = [];
			const floorOffsets = [];
			const ceilOffsets = [];
			const floorsAo = [];
			const ceilsAo = [];
			const wallsAo = [];
			const wallNormals = [];
			const wallRots = [];
			const floorEdgeRots = [];
			const ceilEdgeRots = [];
			const floorEdgeHeightScales = [];
			const ceilEdgeHeightScales = [];
			const floorWallSkirtEdges = [];
			const floorWallSkirtRects = [];
			const floorWallSkirtRots = [];
			const floorWallSkirtHeightScales = [];
			const ceilWallSkirtEdges = [];
			const ceilWallSkirtRects = [];
			const ceilWallSkirtRots = [];
			const ceilWallSkirtHeightScales = [];
			function isSolid(cx, cz) {
				if (cx < 0 || cz < 0 || cx >= width || cz >= height) return true;
				return (solid[cz * width + cx] ?? 0) > 0;
			}
			function openFloorVal(ncx, ncz) {
				if (ncx < 0 || ncz < 0 || ncx >= width || ncz >= height) return null;
				if (isSolid(ncx, ncz)) return null;
				const nidx = ncz * width + ncx;
				return floorOffData ? floorOffData[nidx] ?? 128 : 128;
			}
			function openCeilVal(ncx, ncz) {
				if (ncx < 0 || ncz < 0 || ncx >= width || ncz >= height) return null;
				if (isSolid(ncx, ncz)) return null;
				const nidx = ncz * width + ncx;
				return ceilOffData ? ceilOffData[nidx] ?? 128 : 128;
			}
			function isOpenSkyCeil(ncx, ncz) {
				if (ncx < 0 || ncz < 0 || ncx >= width || ncz >= height) return false;
				if (isSolid(ncx, ncz)) return false;
				return ceilOffData ? ceilOffData[ncz * width + ncx] === 0 : false;
			}
			const openSkyLighting = Math.max(0, Math.min(1, options.openSkyLighting ?? 0));
			for (let cz = 0; cz < height; cz++) for (let cx = 0; cx < width; cx++) {
				if (isSolid(cx, cz)) continue;
				const idx = cz * width + cx;
				const wx = (cx + .5) * tileSize;
				const wz = (cz + .5) * tileSize;
				const floorVal = floorOffData ? floorOffData[idx] ?? 128 : 128;
				const ceilVal = ceilOffData ? ceilOffData[idx] ?? 128 : 128;
				const isOpenSky = ceilVal === 0;
				if (floorVal !== 0) {
					floors.push(makeFaceMatrix(wx, 0, wz, -HALF_PI, 0, 0, tileSize, tileSize));
					floorRects.push(getUvRect(floorId));
					floorOffsets.push((floorVal - 128) * offsetStep);
					floorCellMap.push({
						cx,
						cz
					});
					if (aoEnabled) {
						const v = computeFaceAO(isSolid, cx, cz, "floor");
						if (openSkyLighting > 0) {
							const adj = !isOpenSky && (isOpenSkyCeil(cx, cz - 1) || isOpenSkyCeil(cx, cz + 1) || isOpenSkyCeil(cx - 1, cz) || isOpenSkyCeil(cx + 1, cz));
							const boost = isOpenSky ? openSkyLighting : adj ? openSkyLighting * .5 : 0;
							if (boost > 0) {
								v[0] += (1 - v[0]) * boost;
								v[1] += (1 - v[1]) * boost;
								v[2] += (1 - v[2]) * boost;
								v[3] += (1 - v[3]) * boost;
							}
						}
						floorsAo.push(v[0], v[1], v[2], v[3]);
					}
				}
				if (!isOpenSky) {
					ceils.push(makeFaceMatrix(wx, ceilingH, wz, HALF_PI, 0, 0, tileSize, tileSize));
					ceilRects.push(getUvRect(ceilId));
					ceilOffsets.push(-(ceilVal - 128) * offsetStep);
					ceilCellMap.push({
						cx,
						cz
					});
					if (aoEnabled) {
						const v = computeFaceAO(isSolid, cx, cz, "ceil");
						ceilsAo.push(v[0], v[1], v[2], v[3]);
					}
				}
				if (isSolid(cx, cz - 1)) {
					const s = spec(wallTiles, "north", wallId);
					walls.push(makeFaceMatrix(wx, wallMidY, cz * tileSize, 0, 0, 0, tileSize, ceilingH));
					wallRects.push(getUvRect(resolveTile(s.tile, resolver)));
					wallRots.push(s.rotation ?? 0);
					wallNormals.push(0, 1);
					wallCellMap.push({
						cx,
						cz
					});
					if (aoEnabled) {
						const v = computeFaceAO(isSolid, cx, cz, "north");
						wallsAo.push(v[0], v[1], v[2], v[3]);
					}
				}
				if (isSolid(cx, cz + 1)) {
					const s = spec(wallTiles, "south", wallId);
					walls.push(makeFaceMatrix(wx, wallMidY, (cz + 1) * tileSize, 0, Math.PI, 0, tileSize, ceilingH));
					wallRects.push(getUvRect(resolveTile(s.tile, resolver)));
					wallRots.push(s.rotation ?? 0);
					wallNormals.push(0, -1);
					wallCellMap.push({
						cx,
						cz
					});
					if (aoEnabled) {
						const v = computeFaceAO(isSolid, cx, cz, "south");
						wallsAo.push(v[0], v[1], v[2], v[3]);
					}
				}
				if (isSolid(cx - 1, cz)) {
					const s = spec(wallTiles, "west", wallId);
					walls.push(makeFaceMatrix(cx * tileSize, wallMidY, wz, 0, HALF_PI, 0, tileSize, ceilingH));
					wallRects.push(getUvRect(resolveTile(s.tile, resolver)));
					wallRots.push(s.rotation ?? 0);
					wallNormals.push(1, 0);
					wallCellMap.push({
						cx,
						cz
					});
					if (aoEnabled) {
						const v = computeFaceAO(isSolid, cx, cz, "west");
						wallsAo.push(v[0], v[1], v[2], v[3]);
					}
				}
				if (isSolid(cx + 1, cz)) {
					const s = spec(wallTiles, "east", wallId);
					walls.push(makeFaceMatrix((cx + 1) * tileSize, wallMidY, wz, 0, -HALF_PI, 0, tileSize, ceilingH));
					wallRects.push(getUvRect(resolveTile(s.tile, resolver)));
					wallRots.push(s.rotation ?? 0);
					wallNormals.push(-1, 0);
					wallCellMap.push({
						cx,
						cz
					});
					if (aoEnabled) {
						const v = computeFaceAO(isSolid, cx, cz, "east");
						wallsAo.push(v[0], v[1], v[2], v[3]);
					}
				}
				if (floorVal !== 0) {
					const currentFloorY = (floorVal - 128) * offsetStep;
					function addFloorSkirt(nfVal, mx, mz, ry, dir) {
						const s = spec(floorSkirtTiles, dir, floorId);
						const neighborFloorY = (nfVal - 128) * offsetStep;
						const stepH = currentFloorY - neighborFloorY;
						const fullPanels = Math.floor(stepH / tileSize);
						const rem = stepH - fullPanels * tileSize;
						for (let i = 0; i < fullPanels; i++) {
							const midY = neighborFloorY + i * tileSize + tileSize / 2;
							floorEdges.push(makeFaceMatrix(mx, midY, mz, 0, ry, 0, tileSize, tileSize));
							floorEdgeRects.push(getUvRect(resolveTile(s.tile, resolver)));
							floorEdgeRots.push(s.rotation ?? 0);
							floorEdgeHeightScales.push(1);
							floorEdgeCellMap.push({
								cx,
								cz
							});
						}
						if (rem > .001) {
							const midY = neighborFloorY + fullPanels * tileSize + rem / 2;
							floorEdges.push(makeFaceMatrix(mx, midY, mz, 0, ry, 0, tileSize, rem));
							floorEdgeRects.push(getUvRect(resolveTile(s.tile, resolver)));
							floorEdgeRots.push(s.rotation ?? 0);
							floorEdgeHeightScales.push(rem / tileSize);
							floorEdgeCellMap.push({
								cx,
								cz
							});
						}
					}
					const nfN = openFloorVal(cx, cz - 1);
					if (nfN !== null && nfN < floorVal) addFloorSkirt(nfN, wx, cz * tileSize, Math.PI, "north");
					const nfS = openFloorVal(cx, cz + 1);
					if (nfS !== null && nfS < floorVal) addFloorSkirt(nfS, wx, (cz + 1) * tileSize, 0, "south");
					const nfW = openFloorVal(cx - 1, cz);
					if (nfW !== null && nfW < floorVal) addFloorSkirt(nfW, cx * tileSize, wz, -HALF_PI, "west");
					const nfE = openFloorVal(cx + 1, cz);
					if (nfE !== null && nfE < floorVal) addFloorSkirt(nfE, (cx + 1) * tileSize, wz, HALF_PI, "east");
				}
				if (floorVal < 128 && floorVal !== 0) {
					const gapH = (128 - floorVal) * offsetStep;
					function addWallFloorSkirt(mx, mz, ry, dir) {
						const s = spec(wallTiles, dir, wallId);
						const fullPanels = Math.floor(gapH / tileSize);
						const rem = gapH - fullPanels * tileSize;
						for (let i = 0; i < fullPanels; i++) {
							const midY = -(i * tileSize + tileSize / 2);
							floorWallSkirtEdges.push(makeFaceMatrix(mx, midY, mz, 0, ry, 0, tileSize, tileSize));
							floorWallSkirtRects.push(getUvRect(resolveTile(s.tile, resolver)));
							floorWallSkirtRots.push(s.rotation ?? 0);
							floorWallSkirtHeightScales.push(1);
							floorWallSkirtCellMap.push({
								cx,
								cz
							});
						}
						if (rem > .001) {
							const midY = -(fullPanels * tileSize + rem / 2);
							floorWallSkirtEdges.push(makeFaceMatrix(mx, midY, mz, 0, ry, 0, tileSize, rem));
							floorWallSkirtRects.push(getUvRect(resolveTile(s.tile, resolver)));
							floorWallSkirtRots.push(s.rotation ?? 0);
							floorWallSkirtHeightScales.push(rem / tileSize);
							floorWallSkirtCellMap.push({
								cx,
								cz
							});
						}
					}
					if (isSolid(cx, cz - 1)) addWallFloorSkirt(wx, cz * tileSize, 0, "north");
					if (isSolid(cx, cz + 1)) addWallFloorSkirt(wx, (cz + 1) * tileSize, Math.PI, "south");
					if (isSolid(cx - 1, cz)) addWallFloorSkirt(cx * tileSize, wz, HALF_PI, "west");
					if (isSolid(cx + 1, cz)) addWallFloorSkirt((cx + 1) * tileSize, wz, -HALF_PI, "east");
				}
				if (!isOpenSky) {
					const yCurrent = ceilingH - (ceilVal - 128) * offsetStep;
					function addCeilSkirt(ncVal, mx, mz, ry, dir) {
						const s = spec(ceilSkirtTiles, dir, ceilId);
						const h = (ncVal - ceilVal) * offsetStep;
						const fullPanels = Math.floor(h / tileSize);
						const rem = h - fullPanels * tileSize;
						for (let i = 0; i < fullPanels; i++) {
							const midY = yCurrent - i * tileSize - tileSize / 2;
							ceilEdges.push(makeFaceMatrix(mx, midY, mz, 0, ry, 0, tileSize, tileSize));
							ceilEdgeRects.push(getUvRect(resolveTile(s.tile, resolver)));
							ceilEdgeRots.push(s.rotation ?? 0);
							ceilEdgeHeightScales.push(1);
							ceilEdgeCellMap.push({
								cx,
								cz
							});
						}
						if (rem > .001) {
							const midY = yCurrent - fullPanels * tileSize - rem / 2;
							ceilEdges.push(makeFaceMatrix(mx, midY, mz, 0, ry, 0, tileSize, rem));
							ceilEdgeRects.push(getUvRect(resolveTile(s.tile, resolver)));
							ceilEdgeRots.push(s.rotation ?? 0);
							ceilEdgeHeightScales.push(rem / tileSize);
							ceilEdgeCellMap.push({
								cx,
								cz
							});
						}
					}
					const ncN = openCeilVal(cx, cz - 1);
					if (ncN !== null && ncN !== 0 && ncN > ceilVal) addCeilSkirt(ncN, wx, cz * tileSize, Math.PI, "north");
					const ncS = openCeilVal(cx, cz + 1);
					if (ncS !== null && ncS !== 0 && ncS > ceilVal) addCeilSkirt(ncS, wx, (cz + 1) * tileSize, 0, "south");
					const ncW = openCeilVal(cx - 1, cz);
					if (ncW !== null && ncW !== 0 && ncW > ceilVal) addCeilSkirt(ncW, cx * tileSize, wz, -HALF_PI, "west");
					const ncE = openCeilVal(cx + 1, cz);
					if (ncE !== null && ncE !== 0 && ncE > ceilVal) addCeilSkirt(ncE, (cx + 1) * tileSize, wz, HALF_PI, "east");
					if (ceilVal < 128) {
						const gapH = (128 - ceilVal) * offsetStep;
						function addWallCeilSkirt(mx, mz, ry, dir) {
							const s = spec(wallTiles, dir, wallId);
							const fullPanels = Math.floor(gapH / tileSize);
							const rem = gapH - fullPanels * tileSize;
							for (let i = 0; i < fullPanels; i++) {
								const midY = ceilingH + i * tileSize + tileSize / 2;
								ceilWallSkirtEdges.push(makeFaceMatrix(mx, midY, mz, 0, ry, 0, tileSize, tileSize));
								ceilWallSkirtRects.push(getUvRect(resolveTile(s.tile, resolver)));
								ceilWallSkirtRots.push(s.rotation ?? 0);
								ceilWallSkirtHeightScales.push(1);
								ceilWallSkirtCellMap.push({
									cx,
									cz
								});
							}
							if (rem > .001) {
								const midY = ceilingH + fullPanels * tileSize + rem / 2;
								ceilWallSkirtEdges.push(makeFaceMatrix(mx, midY, mz, 0, ry, 0, tileSize, rem));
								ceilWallSkirtRects.push(getUvRect(resolveTile(s.tile, resolver)));
								ceilWallSkirtRots.push(s.rotation ?? 0);
								ceilWallSkirtHeightScales.push(rem / tileSize);
								ceilWallSkirtCellMap.push({
									cx,
									cz
								});
							}
						}
						if (isSolid(cx, cz - 1)) addWallCeilSkirt(wx, cz * tileSize, 0, "north");
						if (isSolid(cx, cz + 1)) addWallCeilSkirt(wx, (cz + 1) * tileSize, Math.PI, "south");
						if (isSolid(cx - 1, cz)) addWallCeilSkirt(cx * tileSize, wz, HALF_PI, "west");
						if (isSolid(cx + 1, cz)) addWallCeilSkirt((cx + 1) * tileSize, wz, -HALF_PI, "east");
					}
				}
			}
			meshToCellMap.clear();
			function cellArrays(map) {
				const xs = new Float32Array(map.length);
				const zs = new Float32Array(map.length);
				map.forEach((c, i) => {
					xs[i] = c.cx;
					zs[i] = c.cz;
				});
				return [xs, zs];
			}
			const [floorCX, floorCZ] = cellArrays(floorCellMap);
			const [ceilCX, ceilCZ] = cellArrays(ceilCellMap);
			const [wallCX, wallCZ] = cellArrays(wallCellMap);
			const [fEdgeCX, fEdgeCZ] = cellArrays(floorEdgeCellMap);
			const [cEdgeCX, cEdgeCZ] = cellArrays(ceilEdgeCellMap);
			floorMesh = buildInstancedMesh(floors, floorRects, floorMat, !!packedAtlas, new Float32Array(floorOffsets), void 0, void 0, floorCX, floorCZ, aoEnabled && floorsAo.length ? new Float32Array(floorsAo) : void 0);
			scene.add(floorMesh);
			meshToCellMap.set(floorMesh, floorCellMap);
			ceilMesh = buildInstancedMesh(ceils, ceilRects, ceilMat, !!packedAtlas, new Float32Array(ceilOffsets), void 0, void 0, ceilCX, ceilCZ, aoEnabled && ceilsAo.length ? new Float32Array(ceilsAo) : void 0);
			scene.add(ceilMesh);
			meshToCellMap.set(ceilMesh, ceilCellMap);
			wallMesh = buildInstancedMesh(walls, wallRects, wallMat, !!packedAtlas, void 0, wallRots, void 0, wallCX, wallCZ, aoEnabled && wallsAo.length ? new Float32Array(wallsAo) : void 0, new Float32Array(wallNormals));
			scene.add(wallMesh);
			meshToCellMap.set(wallMesh, wallCellMap);
			floorEdgeMesh = buildInstancedMesh(floorEdges, floorEdgeRects, floorEdgeMat, !!packedAtlas, void 0, floorEdgeRots, floorEdgeHeightScales, fEdgeCX, fEdgeCZ);
			scene.add(floorEdgeMesh);
			meshToCellMap.set(floorEdgeMesh, floorEdgeCellMap);
			ceilEdgeMesh = buildInstancedMesh(ceilEdges, ceilEdgeRects, ceilEdgeMat, !!packedAtlas, void 0, ceilEdgeRots, ceilEdgeHeightScales, cEdgeCX, cEdgeCZ);
			scene.add(ceilEdgeMesh);
			meshToCellMap.set(ceilEdgeMesh, ceilEdgeCellMap);
			if (floorWallSkirtEdges.length > 0) {
				const [fwsCX, fwsCZ] = cellArrays(floorWallSkirtCellMap);
				floorWallSkirtMesh = buildInstancedMesh(floorWallSkirtEdges, floorWallSkirtRects, floorWallSkirtMat, !!packedAtlas, void 0, floorWallSkirtRots, floorWallSkirtHeightScales, fwsCX, fwsCZ);
				scene.add(floorWallSkirtMesh);
				meshToCellMap.set(floorWallSkirtMesh, floorWallSkirtCellMap);
			}
			if (ceilWallSkirtEdges.length > 0) {
				const [cwsCX, cwsCZ] = cellArrays(ceilWallSkirtCellMap);
				ceilWallSkirtMesh = buildInstancedMesh(ceilWallSkirtEdges, ceilWallSkirtRects, ceilWallSkirtMat, !!packedAtlas, void 0, ceilWallSkirtRots, ceilWallSkirtHeightScales, cwsCX, cwsCZ);
				scene.add(ceilWallSkirtMesh);
				meshToCellMap.set(ceilWallSkirtMesh, ceilWallSkirtCellMap);
			}
			rebuildOverlayTexture(width, height);
			syncOverlayUniforms(width, height);
			syncSkirtLookupUniforms();
			for (const entry of layerEntries) if (!entry.holder.mesh) {
				entry.holder.mesh = buildLayerMesh(entry.spec);
				if (entry.holder.mesh) scene.add(entry.holder.mesh);
			}
		}
		const appearances = options.entityAppearances ?? {};
		const entityGeoCache = /* @__PURE__ */ new Map();
		const entityMatCache = /* @__PURE__ */ new Map();
		function resolveAppearanceKey(e) {
			const type = e.type;
			if (type && appearances[type]) return type;
			if (appearances[e.kind]) return e.kind;
			return "__default__";
		}
		function getEntityGeo(key) {
			if (!entityGeoCache.has(key)) {
				const spec = appearances[key] ?? {};
				const wf = spec.widthFactor ?? .35;
				const hf = spec.heightFactor ?? .55;
				const df = spec.depthFactor ?? wf;
				entityGeoCache.set(key, new three.BoxGeometry(tileSize * wf, ceilingH * hf, tileSize * df));
			}
			return entityGeoCache.get(key);
		}
		function getEntityMat(key) {
			if (!entityMatCache.has(key)) {
				const spec = appearances[key] ?? {};
				entityMatCache.set(key, new three.MeshStandardMaterial({ color: spec.color ?? 13378082 }));
			}
			return entityMatCache.get(key);
		}
		const entityMeshMap = /* @__PURE__ */ new Map();
		const billboardMap = /* @__PURE__ */ new Map();
		const objectBillboardMap = /* @__PURE__ */ new Map();
		let currentObjects = [];
		function syncObjects(objects) {
			const activeKeys = new Set(objects.filter((o) => o.spriteMap).map((o) => `${o.type}_${o.x}_${o.z}`));
			for (const [id, handle] of objectBillboardMap) if (!activeKeys.has(id)) {
				handle.dispose();
				objectBillboardMap.delete(id);
			}
			for (const obj of objects) {
				if (!obj.spriteMap) continue;
				const key = `${obj.type}_${obj.x}_${obj.z}`;
				if (!objectBillboardMap.has(key) && packedAtlas) {
					const fakeEntity = {
						id: key,
						kind: "decoration",
						spriteName: obj.type,
						faction: "none",
						x: obj.x,
						z: obj.z,
						speed: 0,
						alive: true,
						blocksMove: false,
						tick: 0,
						spriteMap: obj.spriteMap,
						type: obj.type
					};
					objectBillboardMap.set(key, createBillboard(fakeEntity, packedAtlas, scene, resolver));
				}
			}
		}
		function syncEntities(entities) {
			const aliveIds = new Set(entities.filter((e) => e.alive).map((e) => e.id));
			for (const [id, mesh] of entityMeshMap) if (!aliveIds.has(id)) {
				scene.remove(mesh);
				entityMeshMap.delete(id);
			}
			for (const [id, handle] of billboardMap) if (!aliveIds.has(id)) {
				handle.dispose();
				billboardMap.delete(id);
			}
			for (const e of entities) {
				if (!e.alive) continue;
				if (e.spriteMap) {
					if (!billboardMap.has(e.id) && packedAtlas) {
						const handle = createBillboard(e, packedAtlas, scene, resolver);
						billboardMap.set(e.id, handle);
					}
				} else {
					const key = resolveAppearanceKey(e);
					if (!entityMeshMap.has(e.id)) {
						const mesh = new three.Mesh(getEntityGeo(key), getEntityMat(key));
						entityMeshMap.set(e.id, mesh);
						scene.add(mesh);
					}
					const hf = (appearances[key] ?? {}).heightFactor ?? .55;
					entityMeshMap.get(e.id).position.set((e.x + .5) * tileSize, ceilingH * hf / 2, (e.z + .5) * tileSize);
				}
			}
		}
		let currentEntities = [];
		let tgtX = 0, tgtZ = 0, tgtYaw = 0;
		let curX = 0, curZ = 0, curYaw = 0;
		let initialized = false;
		const onTurn = () => {
			buildDungeon();
			tgtX = (game.player.x + .5) * tileSize;
			tgtZ = (game.player.z + .5) * tileSize;
			tgtYaw = game.player.facing;
			if (!initialized) {
				curX = tgtX;
				curZ = tgtZ;
				curYaw = tgtYaw;
				initialized = true;
			}
		};
		game.events.on("turn", onTurn);
		let rafId = 0;
		let lastT = 0;
		function tick(t) {
			rafId = requestAnimationFrame(tick);
			const dt = Math.min((t - lastT) / 1e3, .1);
			lastT = t;
			if (initialized) {
				const k = 1 - Math.pow(1 - lerpFactor, dt * 60);
				curX += (tgtX - curX) * k;
				curZ += (tgtZ - curZ) * k;
				let dy = tgtYaw - curYaw;
				if (dy > Math.PI) dy -= 2 * Math.PI;
				if (dy < -Math.PI) dy += 2 * Math.PI;
				curYaw += dy * k;
				camera.position.set(curX, ceilingH * eyeHeightFactor, curZ);
				camera.rotation.set(0, curYaw, 0, "YXZ");
				const cfx = -Math.sin(curYaw);
				const cfz = -Math.cos(curYaw);
				for (const mat of atlasMaterials) {
					const u = mat.uniforms["uCamDir"];
					if (u) u.value.set(cfx, cfz);
				}
				for (const e of currentEntities) {
					if (!e.alive || !e.spriteMap) continue;
					const handle = billboardMap.get(e.id);
					if (handle) handle.update(e, curYaw, tileSize, ceilingH);
				}
				for (const obj of currentObjects) {
					if (!obj.spriteMap) continue;
					const handle = objectBillboardMap.get(`${obj.type}_${obj.x}_${obj.z}`);
					if (handle) handle.update(obj, curYaw, tileSize, ceilingH);
				}
			}
			glRenderer.render(scene, camera);
		}
		function resize() {
			const w = element.clientWidth || 1;
			const h = element.clientHeight || 1;
			glRenderer.setSize(w, h, false);
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
		}
		const ro = new ResizeObserver(resize);
		ro.observe(element);
		resize();
		rafId = requestAnimationFrame(tick);
		const raycaster = new three.Raycaster();
		const _mouseNdc = new three.Vector2();
		function getCellAtPointer(clientX, clientY) {
			const outputs = game.dungeon.outputs;
			if (!outputs) return null;
			const rect = canvas.getBoundingClientRect();
			_mouseNdc.x = (clientX - rect.left) / rect.width * 2 - 1;
			_mouseNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
			raycaster.setFromCamera(_mouseNdc, camera);
			const pickable = [
				floorMesh,
				ceilMesh,
				wallMesh,
				floorEdgeMesh,
				ceilEdgeMesh,
				floorWallSkirtMesh,
				ceilWallSkirtMesh
			].filter((m) => m !== null);
			if (pickable.length === 0) return null;
			const hit = raycaster.intersectObjects(pickable, false)[0];
			if (!hit) return null;
			const cellArray = meshToCellMap.get(hit.object);
			if (!cellArray || hit.instanceId == null) return null;
			const cell = cellArray[hit.instanceId];
			if (!cell) return null;
			const { cx, cz } = cell;
			const { width } = outputs;
			const regionData = outputs.textures.regionId?.image.data;
			return {
				cx,
				cz,
				regionId: regionData ? regionData[cz * width + cx] ?? 0 : 0
			};
		}
		let _lastHoverKey = null;
		function onCanvasClick(e) {
			if (!options.onCellClick) return;
			const info = getCellAtPointer(e.clientX, e.clientY);
			if (info) options.onCellClick(info);
		}
		function onCanvasPointerMove(e) {
			if (!options.onCellHover) return;
			const info = getCellAtPointer(e.clientX, e.clientY);
			const key = info ? `${info.cx},${info.cz}` : null;
			if (key === _lastHoverKey) return;
			_lastHoverKey = key;
			options.onCellHover(info);
		}
		function onCanvasPointerLeave() {
			if (!options.onCellHover) return;
			if (_lastHoverKey !== null) {
				_lastHoverKey = null;
				options.onCellHover(null);
			}
		}
		if (options.onCellClick) canvas.addEventListener("click", onCanvasClick);
		if (options.onCellHover) {
			canvas.addEventListener("pointermove", onCanvasPointerMove);
			canvas.addEventListener("pointerleave", onCanvasPointerLeave);
		}
		function onCellPaint(e) {
			updateOverlayCell(e.x, e.z, e);
		}
		game.events.on("cell-paint", onCellPaint);
		function internalAddLayer(spec) {
			const holder = { mesh: null };
			if (dungeonBuilt) {
				holder.mesh = buildLayerMesh(spec);
				if (holder.mesh) scene.add(holder.mesh);
			}
			const entry = {
				spec,
				holder
			};
			layerEntries.push(entry);
			return { remove() {
				if (holder.mesh) {
					scene.remove(holder.mesh);
					holder.mesh.geometry.dispose();
					holder.mesh = null;
				}
				const i = layerEntries.indexOf(entry);
				if (i !== -1) layerEntries.splice(i, 1);
			} };
		}
		return {
			scene,
			camera,
			addLight(light) {
				scene.add(light);
				managedLights.add(light);
				return light;
			},
			removeLight(light) {
				light.removeFromParent();
				managedLights.delete(light);
			},
			setEntities(entities) {
				currentEntities = entities;
				syncEntities(entities);
			},
			setObjects(objects) {
				currentObjects = objects;
				syncObjects(objects);
			},
			worldToScreen(gridX, gridZ, worldY) {
				const wx = (gridX + .5) * tileSize;
				const wy = worldY ?? ceilingH * .4;
				const wz = (gridZ + .5) * tileSize;
				const v = new three.Vector3(wx, wy, wz).project(camera);
				if (v.z > 1) return null;
				const w = element.clientWidth || 1;
				const h = element.clientHeight || 1;
				const sx = (v.x * .5 + .5) * w;
				const sy = (-v.y * .5 + .5) * h;
				if (sx < 0 || sx > w || sy < 0 || sy > h) return null;
				return {
					x: sx,
					y: sy
				};
			},
			createAtlasMaterial() {
				return packedAtlas ? makeAtlasMaterial() : null;
			},
			addLayer(spec) {
				return internalAddLayer(spec);
			},
			highlightCells(filter) {
				const outputs = game.dungeon.outputs;
				const regionData = outputs?.textures.regionId?.image.data;
				const solid = outputs?.textures.solid?.image.data;
				const width = outputs?.width ?? 0;
				const height = outputs?.height ?? 0;
				const colorGroups = /* @__PURE__ */ new Map();
				for (let cz = 0; cz < height; cz++) for (let cx = 0; cx < width; cx++) {
					const idx = cz * width + cx;
					if (solid && (solid[idx] ?? 1) > 0) continue;
					const regionId = regionData ? regionData[idx] ?? 0 : 0;
					const color = filter(cx, cz, regionId);
					if (!color) continue;
					let group = colorGroups.get(color);
					if (!group) {
						group = /* @__PURE__ */ new Set();
						colorGroups.set(color, group);
					}
					group.add(idx);
				}
				const subHandles = [];
				const subMaterials = [];
				for (const [color, cellIdxSet] of colorGroups) {
					const mat = new three.MeshBasicMaterial({
						color: new three.Color(color),
						transparent: true,
						opacity: .4,
						depthWrite: false,
						side: three.DoubleSide
					});
					subMaterials.push(mat);
					const cellFilter = (cx, cz) => cellIdxSet.has(cz * width + cx) ? {} : false;
					for (const target of [
						"floor",
						"ceil",
						"wall"
					]) subHandles.push(internalAddLayer({
						target,
						material: mat,
						useAtlas: false,
						polygonOffset: true,
						filter: cellFilter
					}));
				}
				return { remove() {
					for (const h of subHandles) h.remove();
					for (const m of subMaterials) m.dispose();
				} };
			},
			setAmbientOcclusion(intensity) {
				aoIntensity = Math.max(0, Math.min(1, intensity));
				for (const mat of atlasMaterials) mat.uniforms["uAoIntensity"].value = aoIntensity;
			},
			setSurfaceLighting(opts) {
				if (opts.floor !== void 0 && floorMat instanceof three.ShaderMaterial) floorMat.uniforms["uSurfaceLight"].value = opts.floor;
				if (opts.ceiling !== void 0 && ceilMat instanceof three.ShaderMaterial) ceilMat.uniforms["uSurfaceLight"].value = opts.ceiling;
				if (opts.wallMin !== void 0 || opts.wallMax !== void 0) for (const mat of atlasMaterials) {
					if (opts.wallMin !== void 0) mat.uniforms["uWallLightMin"].value = opts.wallMin;
					if (opts.wallMax !== void 0) mat.uniforms["uWallLightMax"].value = opts.wallMax;
				}
			},
			rebuild() {
				for (const mesh of [
					floorMesh,
					ceilMesh,
					wallMesh,
					floorEdgeMesh,
					ceilEdgeMesh,
					floorWallSkirtMesh,
					ceilWallSkirtMesh
				]) if (mesh) {
					scene.remove(mesh);
					mesh.geometry.dispose();
				}
				floorMesh = ceilMesh = wallMesh = floorEdgeMesh = ceilEdgeMesh = floorWallSkirtMesh = ceilWallSkirtMesh = null;
				meshToCellMap.clear();
				for (const entry of layerEntries) if (entry.holder.mesh) {
					scene.remove(entry.holder.mesh);
					entry.holder.mesh.geometry.dispose();
					entry.holder.mesh = null;
				}
				if (overlayFloor !== defSurf) {
					overlayFloor.tex.dispose();
					overlayFloor = defSurf;
				}
				if (overlayWall !== defSurf) {
					overlayWall.tex.dispose();
					overlayWall = defSurf;
				}
				if (overlayCeil !== defSurf) {
					overlayCeil.tex.dispose();
					overlayCeil = defSurf;
				}
				dungeonBuilt = false;
				buildDungeon();
			},
			setSkybox(opts) {
				if (opts === null) {
					clearSkybox();
					return Promise.resolve();
				}
				if (opts.faces instanceof three.CubeTexture) {
					if (opts.rotationY) opts.faces.rotation = opts.rotationY;
					applySkybox(opts.faces, false);
					return Promise.resolve();
				}
				return loadSkybox(opts).then((tex) => applySkybox(tex, true));
			},
			destroy() {
				cancelAnimationFrame(rafId);
				ro.disconnect();
				game.events.off("turn", onTurn);
				game.events.off("cell-paint", onCellPaint);
				canvas.removeEventListener("click", onCanvasClick);
				canvas.removeEventListener("pointermove", onCanvasPointerMove);
				canvas.removeEventListener("pointerleave", onCanvasPointerLeave);
				for (const geo of entityGeoCache.values()) geo.dispose();
				for (const mat of entityMatCache.values()) mat.dispose();
				for (const handle of billboardMap.values()) handle.dispose();
				for (const handle of objectBillboardMap.values()) handle.dispose();
				sharedAtlasTex?.dispose();
				tileUvLookupTex?.dispose();
				if (overlayFloor !== defSurf) overlayFloor.tex.dispose();
				if (overlayWall !== defSurf) overlayWall.tex.dispose();
				if (overlayCeil !== defSurf) overlayCeil.tex.dispose();
				_defaultOverlayTex.dispose();
				for (const light of managedLights) light.removeFromParent();
				managedLights.clear();
				if (skyboxTex && skyboxOwned) skyboxTex.dispose();
				glRenderer.dispose();
				canvas.remove();
			}
		};
	}
	//#endregion
	//#region src/lib/dungeon/themes.ts
	var registry = /* @__PURE__ */ new Map();
	/** Built-in themes — available without calling registerTheme(). */
	var THEMES = {
		dungeon: {
			floorType: "Cobblestone",
			wallType: "Cobblestone",
			ceilingType: "Cobblestone"
		},
		crypt: {
			floorType: "Flagstone",
			wallType: "Concrete",
			ceilingType: "Flagstone"
		},
		catacomb: {
			floorType: "Cobblestone",
			wallType: "Plaster",
			ceilingType: "Concrete"
		},
		industrial: {
			floorType: "Steel",
			wallType: "Concrete",
			ceilingType: "Steel"
		},
		ruins: {
			floorType: "Dirt",
			wallType: "Cobblestone",
			ceilingType: "Cobblestone"
		}
	};
	for (const [name, def] of Object.entries(THEMES)) registry.set(name, def);
	var THEME_KEYS = Object.keys(THEMES);
	/**
	* Register a custom theme (or override a built-in).
	* The `name` becomes a valid key for `ThemeSelector` string values.
	*/
	function registerTheme(name, def) {
		registry.set(name, def);
	}
	/**
	* Retrieve a theme definition by name.
	* Returns `undefined` if the name is not registered.
	*/
	function getTheme(name) {
		return registry.get(name);
	}
	/**
	* Resolve a ThemeSelector to a theme name for a given room.
	* Falls back to "dungeon" if the resolved key is not in the registry.
	*/
	function resolveTheme(selector, ctx) {
		let key;
		if (typeof selector === "function") key = selector(ctx);
		else if (typeof selector === "string") key = selector;
		else if (selector.length === 0) key = "dungeon";
		else if (typeof selector[0] === "string") {
			const arr = selector;
			key = arr[Math.floor(ctx.rng() * arr.length)] ?? "dungeon";
		} else {
			const weighted = selector;
			const total = weighted.reduce((s, [, w]) => s + w, 0);
			let r = ctx.rng() * total;
			key = weighted[weighted.length - 1][0];
			for (const [k, w] of weighted) {
				r -= w;
				if (r <= 0) {
					key = k;
					break;
				}
			}
		}
		return registry.get(key) ?? registry.get("dungeon") ?? {
			floorType: "Cobblestone",
			wallType: "Cobblestone",
			ceilingType: "Cobblestone"
		};
	}
	//#endregion
	//#region src/lib/transport/websocket.ts
	/**
	* Create a browser-side WebSocket transport for multiplayer.
	* Pass the returned `ActionTransport` to `createGame()` via `GameOptions.transport`.
	*
	* @param url  WebSocket server URL (e.g. `"ws://localhost:3001"`).
	*/
	function createWebSocketTransport(url) {
		let ws = null;
		let _playerId = null;
		const updateHandlers = [];
		const chatHandlers = [];
		const missionCompleteHandlers = [];
		const bufferedUpdates = [];
		function dispatch(raw) {
			let msg;
			try {
				msg = JSON.parse(raw);
			} catch {
				return;
			}
			if (msg.type === "state") {
				const update = msg;
				if (updateHandlers.length > 0) for (const h of updateHandlers) h(update);
				else bufferedUpdates.push(update);
			}
			if (msg.type === "chat") {
				const payload = {
					playerId: msg.playerId,
					text: msg.text
				};
				for (const h of chatHandlers) h(payload);
			}
			if (msg.type === "mission_complete") {
				const payload = {
					playerId: msg.playerId,
					missionId: msg.missionId,
					name: msg.name
				};
				for (const h of missionCompleteHandlers) h(payload);
			}
		}
		return {
			get playerId() {
				return _playerId;
			},
			connect(meta) {
				return new Promise((resolve, reject) => {
					ws = new WebSocket(url);
					ws.onopen = () => {
						ws.send(JSON.stringify({
							type: "join",
							roomId: "default",
							meta: meta ?? {}
						}));
					};
					ws.onmessage = (evt) => {
						let msg;
						try {
							msg = JSON.parse(evt.data);
						} catch {
							return;
						}
						if (msg.type === "welcome") {
							_playerId = msg.playerId;
							const resolved = {
								playerId: msg.playerId,
								isHost: msg.isHost
							};
							const cfg = msg.dungeonConfig;
							if (cfg !== void 0) resolved.dungeonConfig = cfg;
							resolve(resolved);
							return;
						}
						dispatch(evt.data);
					};
					ws.onerror = (e) => reject(e);
					ws.onclose = () => {};
				});
			},
			send(action) {
				if (!ws || !_playerId) return;
				ws.send(JSON.stringify({
					type: "action",
					action
				}));
			},
			onStateUpdate(handler) {
				updateHandlers.push(handler);
				for (const u of bufferedUpdates) handler(u);
				bufferedUpdates.length = 0;
			},
			initDungeon(payload) {
				if (!ws || !_playerId) return;
				ws.send(JSON.stringify({
					type: "dungeon_init",
					...payload
				}));
			},
			disconnect() {
				ws?.close();
				ws = null;
			},
			sendChat(text) {
				if (!ws || !_playerId) return;
				ws.send(JSON.stringify({
					type: "chat",
					text
				}));
			},
			sendMeta(meta) {
				if (!ws || !_playerId) return;
				ws.send(JSON.stringify({
					type: "player_meta",
					meta
				}));
			},
			sendMonsterState(monsters) {
				if (!ws || !_playerId) return;
				ws.send(JSON.stringify({
					type: "monster_state",
					monsters
				}));
			},
			onChat(handler) {
				chatHandlers.push(handler);
			},
			sendMissionComplete(missionId, name) {
				if (!ws || !_playerId) return;
				ws.send(JSON.stringify({
					type: "mission_complete",
					missionId,
					name
				}));
			},
			onMissionComplete(handler) {
				missionCompleteHandlers.push(handler);
			}
		};
	}
	//#endregion
	//#region src/lib/ui/inventoryDialog.ts
	var DEFAULT_EQUIP_SLOTS = [
		{
			key: "head",
			label: "Head",
			top: "12%",
			left: "50%"
		},
		{
			key: "neck",
			label: "Neck",
			top: "22%",
			left: "22%"
		},
		{
			key: "ring",
			label: "Ring",
			top: "22%",
			left: "78%"
		},
		{
			key: "chest",
			label: "Chest",
			top: "40%",
			left: "50%"
		},
		{
			key: "hand",
			label: "Hand",
			top: "55%",
			left: "18%"
		},
		{
			key: "offhand",
			label: "Offhand",
			top: "55%",
			left: "82%"
		},
		{
			key: "weapon",
			label: "Weapon",
			top: "72%",
			left: "22%"
		},
		{
			key: "shield",
			label: "Shield",
			top: "72%",
			left: "78%"
		},
		{
			key: "legs",
			label: "Legs",
			top: "72%",
			left: "50%"
		},
		{
			key: "boots",
			label: "Boots",
			top: "88%",
			left: "50%"
		}
	];
	/**
	* Build and open an RPG-style inventory dialog.
	*
	* Default behaviour (`customLayout: false`) renders a two-column layout:
	* left column has a character profile + item grid; right column has an equipment
	* paper-doll, optional indicator strip, and action buttons. Full drag-and-drop
	* is supported between inventory slots and equip slots.
	*
	* Pass `customLayout: true` to receive a bare `<dialog>` element and populate it
	* yourself via `handle.getElement()`.
	*
	* @param opts  Configuration options — all fields are optional.
	* @returns     An `InventoryHandle` for programmatic updates and close control.
	*
	* @example
	* const handle = showInventory({
	*   inventory: player.inventory,
	*   equippedItems: player.equipped,
	*   stats: [{ label: 'HP', value: player.hp, max: player.maxHp }],
	*   onClose: () => resumeGame(),
	*   onUseItem: (slot) => useItem(slot.item),
	* });
	*/
	function showInventory(opts = {}) {
		const o = {
			customLayout: false,
			inventory: [],
			equippedItems: {},
			characterName: "PLAYER",
			portrait: null,
			stats: [],
			gridCols: 2,
			gridRows: 7,
			equipSlots: null,
			indicators: [],
			actions: [],
			resolveIcon: null,
			dragIcon: null,
			keybindings: {},
			className: "",
			background: void 0,
			onClose: null,
			onSelectSlot: null,
			onUseItem: null,
			onDropItem: null,
			onEquip: null,
			onUnequip: null,
			onDragStart: null,
			onDragEnter: null,
			onDrop: null,
			...opts
		};
		const equipSlots = o.equipSlots ?? DEFAULT_EQUIP_SLOTS;
		const dialog = document.createElement("dialog");
		dialog.className = "inv-dialog" + (o.className ? " " + o.className : "");
		let currentInventory = o.inventory.slice();
		let currentEquipped = { ...o.equippedItems };
		let rafId = null;
		function stopBgLoop() {
			if (rafId !== null) {
				cancelAnimationFrame(rafId);
				rafId = null;
			}
		}
		const mergedBindings = {
			close: ["Escape"],
			navUp: ["ArrowUp"],
			navDown: ["ArrowDown"],
			navLeft: ["ArrowLeft"],
			navRight: ["ArrowRight"],
			useSelected: ["Enter"],
			dropSelected: ["Delete", "Backspace"]
		};
		for (const [action, keys] of Object.entries(o.keybindings)) mergedBindings[action] = keys;
		const keyToAction = /* @__PURE__ */ new Map();
		for (const [action, keys] of Object.entries(mergedBindings)) for (const key of keys) keyToAction.set(key, action);
		let selectedSlotIndex = -1;
		let renderGrid = null;
		function handleDialogKey(e) {
			const action = keyToAction.get(e.key);
			if (!action) return;
			e.preventDefault();
			switch (action) {
				case "close":
					closeDialog();
					break;
				case "navRight":
					selectedSlotIndex = Math.min(selectedSlotIndex + 1, o.gridCols * o.gridRows - 1);
					renderGrid?.(currentInventory);
					break;
				case "navLeft":
					selectedSlotIndex = Math.max(selectedSlotIndex - 1, 0);
					renderGrid?.(currentInventory);
					break;
				case "navDown":
					selectedSlotIndex = Math.min(selectedSlotIndex + o.gridCols, o.gridCols * o.gridRows - 1);
					renderGrid?.(currentInventory);
					break;
				case "navUp":
					selectedSlotIndex = Math.max(selectedSlotIndex - o.gridCols, 0);
					renderGrid?.(currentInventory);
					break;
				case "useSelected": {
					const slot = currentInventory[selectedSlotIndex];
					if (slot?.item) o.onUseItem?.(slot);
					break;
				}
				case "dropSelected": {
					const slot = currentInventory[selectedSlotIndex];
					if (slot?.item) o.onDropItem?.(slot);
					break;
				}
			}
		}
		function closeDialog() {
			stopBgLoop();
			document.removeEventListener("keydown", handleDialogKey);
			dialog.close();
			o.onClose?.();
			dialog.addEventListener("animationend", () => dialog.remove(), { once: true });
			setTimeout(() => {
				if (dialog.parentNode) dialog.remove();
			}, 300);
		}
		const handle = {
			close: closeDialog,
			isOpen: () => dialog.open,
			getElement: () => dialog,
			on(event, cb) {
				dialog.addEventListener("inv:" + event, cb);
			},
			off(event, cb) {
				dialog.removeEventListener("inv:" + event, cb);
			}
		};
		if (!o.customLayout) {
			const inner = document.createElement("div");
			inner.className = "inv-inner";
			const bgCanvas = document.createElement("canvas");
			bgCanvas.className = "inv-bg-canvas";
			const layout = document.createElement("div");
			layout.className = "inv-layout";
			const colLeft = document.createElement("div");
			colLeft.className = "inv-col-left";
			const colRight = document.createElement("div");
			colRight.className = "inv-col-right";
			const profile = document.createElement("div");
			profile.className = "inv-profile";
			const portraitEl = document.createElement("div");
			portraitEl.className = "inv-portrait";
			if (o.portrait) {
				const img = document.createElement("img");
				img.src = o.portrait;
				portraitEl.appendChild(img);
			} else portraitEl.textContent = "?";
			const charInfo = document.createElement("div");
			charInfo.className = "inv-char-info";
			const nameEl = document.createElement("div");
			nameEl.className = "inv-char-name";
			nameEl.textContent = o.characterName;
			charInfo.appendChild(nameEl);
			const statBarEls = {};
			const allStats = o.stats.length ? o.stats : [{
				label: "HP",
				value: 10,
				max: 10
			}];
			for (const stat of allStats) {
				const row = document.createElement("div");
				row.className = "inv-stat-bar";
				const lbl = document.createElement("div");
				lbl.className = "inv-stat-label";
				lbl.textContent = stat.label;
				const track = document.createElement("div");
				track.className = "inv-stat-track";
				const fill = document.createElement("div");
				fill.className = "inv-stat-fill";
				fill.style.width = stat.max > 0 ? stat.value / stat.max * 100 + "%" : "0%";
				if (stat.color) fill.style.background = stat.color;
				track.appendChild(fill);
				row.appendChild(lbl);
				row.appendChild(track);
				charInfo.appendChild(row);
				statBarEls[stat.label] = {
					fill,
					stat: { ...stat }
				};
			}
			profile.appendChild(portraitEl);
			profile.appendChild(charInfo);
			function applyRot(ctx, size, rot, drawFn) {
				if (!rot) {
					drawFn();
					return;
				}
				ctx.save();
				ctx.translate(size / 2, size / 2);
				ctx.rotate(rot * Math.PI / 2);
				ctx.translate(-size / 2, -size / 2);
				drawFn();
				ctx.restore();
			}
			function renderItemIcon(item) {
				if (!item) return null;
				const descriptor = o.resolveIcon ? o.resolveIcon(item) : null;
				if (!descriptor) {
					const badge = document.createElement("div");
					badge.style.cssText = "width:80%;height:80%;display:flex;align-items:center;justify-content:center;font-size:14px;color:var(--inv-text-dim)";
					badge.textContent = (item.name || item.type || "?").charAt(0).toUpperCase();
					return badge;
				}
				const cvs = document.createElement("canvas");
				cvs.className = "inv-slot-icon";
				cvs.width = 32;
				cvs.height = 32;
				const ctx = cvs.getContext("2d");
				if (typeof descriptor === "string") {
					const img = new Image();
					img.onload = () => applyRot(ctx, 32, 0, () => ctx.drawImage(img, 0, 0, 32, 32));
					img.src = descriptor;
				} else if ("url" in descriptor) {
					const img = new Image();
					img.onload = () => applyRot(ctx, 32, descriptor.rot ?? 0, () => ctx.drawImage(img, 0, 0, 32, 32));
					img.src = descriptor.url;
				} else if ("atlasCanvas" in descriptor) applyRot(ctx, 32, descriptor.rot ?? 0, () => {
					ctx.drawImage(descriptor.atlasCanvas, descriptor.sx, descriptor.sy, descriptor.sw, descriptor.sh, 0, 0, 32, 32);
				});
				return cvs;
			}
			const grid = document.createElement("div");
			grid.className = "inv-grid";
			grid.style.gridTemplateColumns = `repeat(${o.gridCols}, var(--inv-slot-size))`;
			const slotEls = [];
			renderGrid = function(inventory) {
				grid.innerHTML = "";
				slotEls.length = 0;
				const totalSlots = o.gridCols * o.gridRows;
				for (let i = 0; i < totalSlots; i++) {
					const slot = inventory[i] ?? {
						index: i,
						item: null,
						quantity: 0
					};
					const cell = document.createElement("div");
					cell.className = "inv-slot" + (i === selectedSlotIndex ? " selected" : "");
					cell.dataset.index = String(i);
					if (slot.item) {
						cell.draggable = true;
						const icon = renderItemIcon(slot.item);
						if (icon) cell.appendChild(icon);
						if (slot.quantity > 1) {
							const qty = document.createElement("div");
							qty.className = "inv-slot-qty";
							qty.textContent = String(slot.quantity);
							cell.appendChild(qty);
						}
						cell.addEventListener("dragstart", (e) => {
							e.dataTransfer.setData("text/plain", JSON.stringify({
								fromSlot: i,
								kind: "inventory"
							}));
							if (o.dragIcon && slot.item) {
								const ghost = o.dragIcon(slot.item, cell);
								if (ghost) {
									const el = typeof ghost === "string" ? Object.assign(new Image(), { src: ghost }) : ghost;
									e.dataTransfer.setDragImage(el, 24, 24);
								}
							}
							if (slot.item) o.onDragStart?.(slot.item, slot, e);
						});
					}
					cell.addEventListener("click", () => {
						selectedSlotIndex = i;
						renderGrid(currentInventory);
						if (slot.item) o.onSelectSlot?.(slot);
					});
					cell.addEventListener("dblclick", () => {
						if (slot.item) o.onUseItem?.(slot);
					});
					cell.addEventListener("dragover", (e) => {
						e.preventDefault();
						cell.classList.add("drag-over");
						o.onDragEnter?.(null, slot, e);
					});
					cell.addEventListener("dragleave", () => cell.classList.remove("drag-over"));
					cell.addEventListener("drop", (e) => {
						e.preventDefault();
						cell.classList.remove("drag-over");
						const data = JSON.parse(e.dataTransfer.getData("text/plain") || "{}");
						const fromSlot = currentInventory[data.fromSlot] ?? null;
						if ((o.onDrop && fromSlot?.item ? o.onDrop(fromSlot.item, fromSlot, slot, e) : true) === false) return;
						const fromIdx = data.fromSlot;
						if (fromIdx !== void 0 && fromIdx !== i) {
							currentInventory[fromIdx] ??= {
								index: fromIdx,
								item: null,
								quantity: 0
							};
							currentInventory[i] ??= {
								index: i,
								item: null,
								quantity: 0
							};
							const fromEntry = currentInventory[fromIdx];
							const toEntry = currentInventory[i];
							const tmpItem = fromEntry.item;
							const tmpQty = fromEntry.quantity;
							fromEntry.item = toEntry.item;
							fromEntry.quantity = toEntry.quantity ?? 0;
							toEntry.item = tmpItem;
							toEntry.quantity = tmpQty;
							renderGrid(currentInventory);
						}
					});
					slotEls.push(cell);
					grid.appendChild(cell);
				}
			};
			const equipPanel = document.createElement("div");
			equipPanel.className = "inv-equipment";
			equipPanel.innerHTML = `
      <svg class="inv-silhouette" viewBox="0 0 100 200" fill="none"
           stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="50" cy="18" rx="14" ry="16"/>
        <rect x="44" y="32" width="12" height="8" rx="2"/>
        <path d="M28 40 Q24 60 26 90 L36 90 L36 130 L64 130 L64 90 L74 90 Q76 60 72 40 Z"/>
        <path d="M28 42 Q14 55 16 80 L26 78 Q24 58 36 48"/>
        <path d="M72 42 Q86 55 84 80 L74 78 Q76 58 64 48"/>
        <path d="M36 130 L32 170 L42 170 L46 130"/>
        <path d="M64 130 L68 170 L58 170 L54 130"/>
      </svg>
    `;
			const equipSlotEls = {};
			for (const def of equipSlots) {
				const cell = document.createElement("div");
				cell.className = "inv-equip-slot";
				cell.title = def.label;
				cell.style.top = def.top;
				cell.style.left = def.left;
				const initial = o.equippedItems[def.key];
				if (initial) {
					const icon = renderItemIcon(initial);
					if (icon) cell.appendChild(icon);
				}
				cell.addEventListener("click", () => {
					const equipped = currentEquipped[def.key];
					if (!equipped) return;
					const totalSlots = o.gridCols * o.gridRows;
					let emptyIdx = -1;
					for (let i = 0; i < totalSlots; i++) if (!currentInventory[i]?.item) {
						emptyIdx = i;
						break;
					}
					if (emptyIdx === -1) return;
					o.onUnequip?.(def.key, equipped);
					currentInventory[emptyIdx] ??= {
						index: emptyIdx,
						item: null,
						quantity: 0
					};
					const emptySlot = currentInventory[emptyIdx];
					emptySlot.item = equipped;
					emptySlot.quantity = 1;
					currentEquipped[def.key] = null;
					cell.innerHTML = "";
					renderGrid(currentInventory);
				});
				cell.addEventListener("dragover", (e) => {
					e.preventDefault();
					cell.classList.add("drag-over");
				});
				cell.addEventListener("dragleave", () => cell.classList.remove("drag-over"));
				cell.addEventListener("drop", (e) => {
					e.preventDefault();
					cell.classList.remove("drag-over");
					const data = JSON.parse(e.dataTransfer.getData("text/plain") || "{}");
					if (data.kind === "inventory" && data.fromSlot !== void 0) {
						const slot = currentInventory[data.fromSlot];
						if (!slot?.item) return;
						if ((o.onDrop ? o.onDrop(slot.item, slot, { equipKey: def.key }, e) : true) === false) return;
						o.onEquip?.(def.key, slot);
						const equippedItem = slot.item;
						currentEquipped[def.key] = equippedItem;
						slot.item = null;
						slot.quantity = 0;
						cell.innerHTML = "";
						const icon = renderItemIcon(equippedItem);
						if (icon) cell.appendChild(icon);
						renderGrid(currentInventory);
					}
				});
				equipSlotEls[def.key] = cell;
				equipPanel.appendChild(cell);
			}
			const indicatorsEl = document.createElement("div");
			indicatorsEl.className = "inv-indicators";
			const indicatorEls = {};
			for (const ind of o.indicators) {
				const wrap = document.createElement("div");
				wrap.className = "inv-indicator";
				if (ind.icon) {
					const iconEl = document.createElement("span");
					iconEl.className = "inv-indicator-icon";
					iconEl.textContent = ind.icon;
					wrap.appendChild(iconEl);
				}
				const lbl = document.createElement("span");
				lbl.textContent = ind.label + ":";
				const val = document.createElement("span");
				val.className = "inv-indicator-val";
				val.textContent = String(ind.value ?? "—");
				wrap.appendChild(lbl);
				wrap.appendChild(val);
				ind.render?.(wrap, ind.value);
				indicatorEls[ind.key] = val;
				indicatorsEl.appendChild(wrap);
			}
			const actionsEl = document.createElement("div");
			actionsEl.className = "inv-actions";
			const trashBtn = document.createElement("button");
			trashBtn.className = "inv-action-btn";
			trashBtn.title = "Drag item here to drop it";
			trashBtn.textContent = "🗑";
			trashBtn.addEventListener("dragover", (e) => {
				e.preventDefault();
				trashBtn.classList.add("drag-over");
			});
			trashBtn.addEventListener("dragleave", () => trashBtn.classList.remove("drag-over"));
			trashBtn.addEventListener("drop", (e) => {
				e.preventDefault();
				trashBtn.classList.remove("drag-over");
				const data = JSON.parse(e.dataTransfer.getData("text/plain") || "{}");
				if (data.kind === "inventory" && data.fromSlot !== void 0) {
					const slot = currentInventory[data.fromSlot];
					if (!slot?.item) return;
					o.onDropItem?.(slot);
					slot.item = null;
					slot.quantity = 0;
					renderGrid(currentInventory);
				}
			});
			const closeBtn = document.createElement("button");
			closeBtn.className = "inv-action-btn";
			closeBtn.title = "Close (Escape)";
			closeBtn.textContent = "✕";
			closeBtn.addEventListener("click", () => closeDialog());
			actionsEl.appendChild(trashBtn);
			actionsEl.appendChild(closeBtn);
			for (const action of o.actions) {
				const btn = document.createElement("button");
				btn.className = "inv-action-btn";
				btn.title = action.label;
				btn.textContent = action.icon ?? action.label.charAt(0);
				btn.addEventListener("click", () => action.onClick(handle));
				actionsEl.appendChild(btn);
			}
			const pageCurl = document.createElement("div");
			pageCurl.className = "inv-pagecurl";
			pageCurl.innerHTML = `
      <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 4 H24 V20 L20 28 H4 Z" fill="rgba(30,30,58,0.9)" stroke="#5a5a8a" stroke-width="1.5"/>
        <path d="M20 20 L28 20 L20 28 Z" fill="#3a3a6a" stroke="#5a5a8a" stroke-width="1.5"/>
        <path d="M20 20 Q22 22 20 28 Q18 24 20 20 Z" fill="#2a2a4a"/>
        <text x="8" y="14" font-family="monospace" font-size="8" fill="#9a9acc">▶</text>
      </svg>
    `;
			actionsEl.appendChild(pageCurl);
			function startBgLoop() {
				if (!o.background?.canvas) return;
				let prev = performance.now();
				function frame(now) {
					const dt = now - prev;
					prev = now;
					bgCanvas.width = inner.offsetWidth;
					bgCanvas.height = inner.offsetHeight;
					o.background.canvas(bgCanvas.getContext("2d"), bgCanvas.width, bgCanvas.height, dt);
					rafId = requestAnimationFrame(frame);
				}
				rafId = requestAnimationFrame(frame);
			}
			function applyBackground(bg) {
				if (!bg) return;
				if (bg.image) dialog.style.background = bg.image;
				if (bg.nineSlice) dialog.style.borderImage = `url(${bg.nineSlice.url}) ${bg.nineSlice.top} stretch`;
			}
			colLeft.appendChild(profile);
			colLeft.appendChild(grid);
			colRight.appendChild(equipPanel);
			if (o.indicators.length) colRight.appendChild(indicatorsEl);
			colRight.appendChild(actionsEl);
			layout.appendChild(colLeft);
			layout.appendChild(colRight);
			inner.appendChild(bgCanvas);
			inner.appendChild(layout);
			dialog.appendChild(inner);
			applyBackground(o.background);
			renderGrid(currentInventory);
			startBgLoop();
			handle.setInventory = (slots) => {
				currentInventory = slots.slice();
				renderGrid(currentInventory);
			};
			handle.setEquipped = (equipped) => {
				currentEquipped = { ...equipped };
				for (const def of equipSlots) {
					const cell = equipSlotEls[def.key];
					if (!cell) continue;
					cell.innerHTML = "";
					const item = currentEquipped[def.key];
					if (item) {
						const icon = renderItemIcon(item);
						if (icon) cell.appendChild(icon);
					}
				}
			};
			handle.setStat = (label, value, max) => {
				const entry = statBarEls[label];
				if (!entry) return;
				if (max !== void 0) entry.stat.max = max;
				entry.stat.value = value;
				entry.fill.style.width = (entry.stat.max > 0 ? value / entry.stat.max * 100 : 0) + "%";
			};
			handle.setIndicator = (key, value) => {
				const el = indicatorEls[key];
				if (el) el.textContent = String(value ?? "—");
			};
			handle.setBackground = (bg) => {
				stopBgLoop();
				applyBackground(bg);
				if (bg?.canvas) startBgLoop();
			};
			handle.getCanvas = () => bgCanvas;
			handle.getRegion = (name) => {
				return {
					left: colLeft,
					right: colRight,
					profile,
					grid,
					equipment: equipPanel,
					indicators: indicatorsEl,
					actions: actionsEl
				}[name] ?? null;
			};
		}
		document.body.appendChild(dialog);
		dialog.showModal();
		document.addEventListener("keydown", handleDialogKey);
		return handle;
	}
	//#endregion
	//#region src/lib/dungeon/serialize.ts
	function uint8ToBase64(data) {
		let binary = "";
		for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]);
		return btoa(binary);
	}
	function base64ToUint8(str) {
		const binary = atob(str);
		const out = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
		return out;
	}
	function textureData(tex) {
		return tex.image.data;
	}
	function makeDataTexture(data, W, H, name) {
		const tex = new three.DataTexture(data, W, H, three.RedFormat, three.UnsignedByteType);
		tex.name = name;
		tex.needsUpdate = true;
		tex.magFilter = three.NearestFilter;
		tex.minFilter = three.NearestFilter;
		tex.generateMipmaps = false;
		tex.wrapS = three.ClampToEdgeWrapping;
		tex.wrapT = three.ClampToEdgeWrapping;
		tex.colorSpace = three.NoColorSpace;
		tex.flipY = false;
		return tex;
	}
	function makeDataTextureRGBA(data, W, H, name) {
		const tex = new three.DataTexture(data, W, H, three.RGBAFormat, three.UnsignedByteType);
		tex.name = name;
		tex.needsUpdate = true;
		tex.magFilter = three.NearestFilter;
		tex.minFilter = three.NearestFilter;
		tex.generateMipmaps = false;
		tex.wrapS = three.ClampToEdgeWrapping;
		tex.wrapT = three.ClampToEdgeWrapping;
		tex.colorSpace = three.NoColorSpace;
		tex.flipY = false;
		return tex;
	}
	/**
	* Snapshot all mutable texture data into a JSON-safe object.
	* Call after generateContent() to capture placed content (doors, hazards, etc.).
	*
	* Pass paintMap (from game.dungeon.paintMap) to include surface-painter overlays.
	* Height offset textures are read directly from the dungeon when present.
	*/
	function serializeDungeon(dungeon, paintMap) {
		const out = {
			version: 1,
			width: dungeon.width,
			height: dungeon.height,
			seed: dungeon.seed,
			startRoomId: dungeon.startRoomId,
			endRoomId: dungeon.endRoomId,
			firstCorridorRegionId: dungeon.firstCorridorRegionId,
			solid: uint8ToBase64(textureData(dungeon.textures.solid)),
			regionId: uint8ToBase64(textureData(dungeon.textures.regionId)),
			distanceToWall: uint8ToBase64(textureData(dungeon.textures.distanceToWall)),
			hazards: uint8ToBase64(textureData(dungeon.textures.hazards)),
			colliderFlags: uint8ToBase64(textureData(dungeon.textures.colliderFlags)),
			floorSkirtType: uint8ToBase64(textureData(dungeon.textures.floorSkirtType)),
			ceilSkirtType: uint8ToBase64(textureData(dungeon.textures.ceilSkirtType))
		};
		if (dungeon.textures.floorHeightOffset?.image.data) out.floorHeightOffset = uint8ToBase64(dungeon.textures.floorHeightOffset.image.data);
		if (dungeon.textures.ceilingHeightOffset?.image.data) out.ceilingHeightOffset = uint8ToBase64(dungeon.textures.ceilingHeightOffset.image.data);
		if (paintMap && paintMap.size > 0) out.paintMap = Object.fromEntries(paintMap);
		if (dungeon.rooms && dungeon.rooms.size > 0) {
			const roomsObj = {};
			for (const [id, info] of dungeon.rooms) roomsObj[id] = {
				type: info.type,
				rect: info.rect,
				connections: info.connections
			};
			out.rooms = roomsObj;
		}
		return out;
	}
	/**
	* Reconstruct a BspDungeonOutputs from a snapshot.
	* The returned object is fully usable with generateContent, aStar8, computeFov, etc.
	* The `rooms` map is empty - call rehydrateDungeon() if room graph data is needed.
	*/
	function deserializeDungeon(data) {
		const { width: W, height: H } = data;
		const solidData = base64ToUint8(data.solid);
		const regionIdData = base64ToUint8(data.regionId);
		const rooms = /* @__PURE__ */ new Map();
		if (data.rooms) for (const [idStr, info] of Object.entries(data.rooms)) {
			const id = Number(idStr);
			rooms.set(id, {
				id,
				type: info.type,
				rect: info.rect,
				connections: info.connections
			});
		}
		const { firstCorridorRegionId } = data;
		const fullRegionIds = regionIdData;
		const temperature = new Uint8Array(W * H);
		for (let i = 0; i < W * H; i++) if (solidData[i] === 0) temperature[i] = 127;
		return {
			width: W,
			height: H,
			seed: data.seed,
			startRoomId: data.startRoomId,
			endRoomId: data.endRoomId,
			rooms,
			fullRegionIds,
			firstCorridorRegionId,
			textures: {
				solid: makeDataTexture(solidData, W, H, "bsp_dungeon_solid"),
				regionId: makeDataTexture(regionIdData, W, H, "bsp_dungeon_region_id"),
				distanceToWall: makeDataTexture(base64ToUint8(data.distanceToWall), W, H, "bsp_dungeon_distance_to_wall"),
				hazards: makeDataTexture(base64ToUint8(data.hazards), W, H, "bsp_dungeon_hazards"),
				temperature: makeDataTexture(temperature, W, H, "bsp_dungeon_temperature"),
				floorType: makeDataTexture(new Uint8Array(W * H), W, H, "bsp_dungeon_floor_type"),
				overlays: makeDataTextureRGBA(new Uint8Array(4 * W * H), W, H, "bsp_dungeon_overlays"),
				wallType: makeDataTexture(new Uint8Array(W * H), W, H, "bsp_dungeon_wall_type"),
				wallOverlays: makeDataTextureRGBA(new Uint8Array(4 * W * H), W, H, "bsp_dungeon_wall_overlays"),
				ceilingType: makeDataTexture(new Uint8Array(W * H), W, H, "bsp_dungeon_ceiling_type"),
				ceilingOverlays: makeDataTextureRGBA(new Uint8Array(4 * W * H), W, H, "bsp_dungeon_ceiling_overlays"),
				colliderFlags: makeDataTexture(base64ToUint8(data.colliderFlags), W, H, "bsp_dungeon_collider_flags"),
				floorSkirtType: makeDataTextureRGBA(data.floorSkirtType ? base64ToUint8(data.floorSkirtType) : new Uint8Array(4 * W * H), W, H, "bsp_dungeon_floor_skirt_type"),
				ceilSkirtType: makeDataTextureRGBA(data.ceilSkirtType ? base64ToUint8(data.ceilSkirtType) : new Uint8Array(4 * W * H), W, H, "bsp_dungeon_ceil_skirt_type"),
				...data.floorHeightOffset !== void 0 ? { floorHeightOffset: makeDataTexture(base64ToUint8(data.floorHeightOffset), W, H, "bsp_dungeon_floor_height_offset") } : {},
				...data.ceilingHeightOffset !== void 0 ? { ceilingHeightOffset: makeDataTexture(base64ToUint8(data.ceilingHeightOffset), W, H, "bsp_dungeon_ceiling_height_offset") } : {}
			}
		};
	}
	//#endregion
	//#region src/lib/dungeon/mapFile.ts
	function stripNonSerializable(opts) {
		const { packedAtlas: _pa, tileNameResolver: _tnr, onCellClick: _occ, onCellHover: _och, ...rest } = opts;
		return rest;
	}
	/**
	* Snapshot a dungeon and all settings needed to reproduce it into a
	* plain, JSON-safe DungeonMapFile object.
	*
	* Pass `generatorOptions` with the same values used in generateBspDungeon,
	* including the resolved numeric seed so the room graph can be reconstructed.
	*/
	function exportDungeonMap(dungeon, options) {
		return {
			version: "0.8.3",
			exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
			...options.meta !== void 0 ? { meta: options.meta } : {},
			generatorOptions: options.generatorOptions,
			rendererOptions: options.rendererOptions ? stripNonSerializable(options.rendererOptions) : {},
			dungeon: serializeDungeon(dungeon, options.paintMap),
			...options.objectPlacements && options.objectPlacements.length > 0 ? { objectPlacements: options.objectPlacements } : {}
		};
	}
	/**
	* Serialize a dungeon and its settings to a JSON string.
	*/
	function dungeonMapToJson(dungeon, options) {
		return JSON.stringify(exportDungeonMap(dungeon, options));
	}
	/**
	* Reconstruct a dungeon from a DungeonMapFile.
	*
	* The returned `dungeon` is ready to pass to buildDungeon / syncEntities.
	* Note: surface-painter overlays are zeroed on import (not serialized) —
	* call game.dungeon.paint() to reapply them.
	* Re-supply packedAtlas and tileNameResolver when creating the renderer.
	*/
	function importDungeonMap(data) {
		return {
			dungeon: deserializeDungeon(data.dungeon),
			generatorOptions: data.generatorOptions,
			rendererOptions: data.rendererOptions,
			meta: data.meta,
			version: data.version,
			...data.dungeon.paintMap !== void 0 ? { paintMap: data.dungeon.paintMap } : {},
			...data.objectPlacements !== void 0 ? { objectPlacements: data.objectPlacements } : {}
		};
	}
	/**
	* Parse a JSON string produced by dungeonMapToJson and reconstruct the dungeon.
	*/
	function dungeonMapFromJson(json) {
		return importDungeonMap(JSON.parse(json));
	}
	//#endregion
	exports.IS_BLOCKED = IS_BLOCKED;
	exports.IS_LIGHT_PASSABLE = IS_LIGHT_PASSABLE;
	exports.IS_WALKABLE = IS_WALKABLE;
	exports.THEMES = THEMES;
	exports.THEME_KEYS = THEME_KEYS;
	exports.attachDecorator = attachDecorator;
	exports.attachKeybindings = attachKeybindings;
	exports.attachMinimap = attachMinimap;
	exports.attachSpawner = attachSpawner;
	exports.attachSurfacePainter = attachSurfacePainter;
	exports.buildColliderFlags = buildColliderFlags;
	exports.colliderFlagsFromSolid = colliderFlagsFromSolid;
	exports.createDungeonRenderer = createDungeonRenderer;
	exports.createEntity = createEntity;
	exports.createFactionRegistry = createFactionRegistry;
	exports.createFactionRegistryFromTable = createFactionRegistryFromTable;
	exports.createGame = createGame;
	exports.createItem = createItem;
	exports.createWebSocketTransport = createWebSocketTransport;
	exports.dungeonMapFromJson = dungeonMapFromJson;
	exports.dungeonMapToJson = dungeonMapToJson;
	exports.exportDungeonMap = exportDungeonMap;
	exports.generateCellularDungeon = generateCellularDungeon;
	exports.getTheme = getTheme;
	exports.importDungeonMap = importDungeonMap;
	exports.isBlockedCell = isBlockedCell;
	exports.isLightPassableCell = isLightPassableCell;
	exports.isWalkableCell = isWalkableCell;
	exports.loadMultiAtlas = loadMultiAtlas;
	exports.loadSkybox = loadSkybox;
	exports.loadTextureAtlas = loadTextureAtlas;
	exports.loadTiledMap = loadTiledMap;
	exports.packedAtlasResolver = packedAtlasResolver;
	exports.registerTheme = registerTheme;
	exports.resolveSprite = resolveSprite;
	exports.resolveTheme = resolveTheme;
	exports.setCeilSkirtTiles = setCeilSkirtTiles;
	exports.setFloorSkirtTiles = setFloorSkirtTiles;
	exports.showInventory = showInventory;
	exports.spriteToUvRect = spriteToUvRect;
	exports.toFaceRotation = toFaceRotation;
});

//# sourceMappingURL=atomic-core.umd.cjs.map