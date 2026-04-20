//#region src/server/three-shim.js
var DataTexture = class {
	constructor(data, width, height) {
		this.image = {
			data,
			width,
			height
		};
		this.needsUpdate = false;
		this.name = "";
		this.magFilter = 0;
		this.minFilter = 0;
		this.generateMipmaps = false;
		this.wrapS = 0;
		this.wrapT = 0;
		this.colorSpace = "";
		this.flipY = false;
	}
};
var RedFormat = 1028;
var RGBAFormat = 1023;
var UnsignedByteType = 1009;
var NearestFilter = 1003;
var ClampToEdgeWrapping = 1001;
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
function makeRng(seedU32) {
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
function idx(x, y, w) {
	return y * w + x;
}
function carveRect(solid, W, H, r, keepOuterWalls) {
	for (let y = r.y; y <= r.y + r.h - 1; y++) for (let x = r.x; x <= r.x + r.w - 1; x++) {
		if (!inBounds(x, y, W, H)) continue;
		if (keepOuterWalls && (x === 0 || y === 0 || x === W - 1 || y === H - 1)) continue;
		solid[idx(x, y, W)] = 0;
	}
}
function carvePoint(solid, W, H, p, keepOuterWalls) {
	if (!inBounds(p.x, p.y, W, H)) return;
	if (keepOuterWalls && (p.x === 0 || p.y === 0 || p.x === W - 1 || p.y === H - 1)) return;
	solid[idx(p.x, p.y, W)] = 0;
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
		regionId[idx(x, y, W)] = idVal;
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
			floorType[idx(x, y, W)] = 1;
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
function computeDistanceToWall(solid, W, H) {
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
			const ni = idx(nx, ny, W);
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
function maskToDataTextureR8(mask, W, H, name) {
	const tex = new DataTexture(mask, W, H, RedFormat, UnsignedByteType);
	tex.name = name;
	tex.needsUpdate = true;
	tex.magFilter = NearestFilter;
	tex.minFilter = NearestFilter;
	tex.generateMipmaps = false;
	tex.wrapS = ClampToEdgeWrapping;
	tex.wrapT = ClampToEdgeWrapping;
	tex.colorSpace = "";
	tex.flipY = false;
	return tex;
}
function maskToDataTextureRGBA(mask, W, H, name) {
	const tex = new DataTexture(mask, W, H, RGBAFormat, UnsignedByteType);
	tex.name = name;
	tex.needsUpdate = true;
	tex.magFilter = NearestFilter;
	tex.minFilter = NearestFilter;
	tex.generateMipmaps = false;
	tex.wrapS = ClampToEdgeWrapping;
	tex.wrapT = ClampToEdgeWrapping;
	tex.colorSpace = "";
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
	const rng = makeRng(seedUsed);
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
	const { startRoomId, endRoomId } = pickStartEndRooms(adjacency);
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
	const distanceToWall = computeDistanceToWall(solid, W, H);
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
			solid: maskToDataTextureR8(solid, W, H, "bsp_dungeon_solid"),
			regionId: maskToDataTextureR8(regionId, W, H, "bsp_dungeon_region_id"),
			distanceToWall: maskToDataTextureR8(distanceToWall, W, H, "bsp_dungeon_distance_to_wall"),
			hazards: maskToDataTextureR8(hazards, W, H, "bsp_dungeon_hazards"),
			temperature: maskToDataTextureR8(temperature, W, H, "bsp_dungeon_temperature"),
			floorType: maskToDataTextureR8(floorType, W, H, "bsp_dungeon_floor_type"),
			overlays: maskToDataTextureRGBA(overlays, W, H, "bsp_dungeon_overlays"),
			wallType: maskToDataTextureR8(wallType, W, H, "bsp_dungeon_wall_type"),
			wallOverlays: maskToDataTextureRGBA(wallOverlays, W, H, "bsp_dungeon_wall_overlays"),
			ceilingType: maskToDataTextureR8(ceilingType, W, H, "bsp_dungeon_ceiling_type"),
			ceilingOverlays: maskToDataTextureRGBA(ceilingOverlays, W, H, "bsp_dungeon_ceiling_overlays"),
			floorHeightOffset: maskToDataTextureR8(floorHeightOffset, W, H, "bsp_dungeon_floor_height_offset"),
			ceilingHeightOffset: maskToDataTextureR8(ceilingHeightOffset, W, H, "bsp_dungeon_ceiling_height_offset"),
			colliderFlags: maskToDataTextureR8(colliderFlagsArr, W, H, "bsp_dungeon_collider_flags")
		}
	};
}
//#endregion
export { generateBspDungeon };

//# sourceMappingURL=dungeon.js.map