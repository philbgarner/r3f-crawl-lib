import * as THREE from "three";
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
function makeRng$1(seedU32) {
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
	const tex = new THREE.DataTexture(mask, W, H, THREE.RedFormat, THREE.UnsignedByteType);
	tex.name = name;
	tex.needsUpdate = true;
	tex.magFilter = THREE.NearestFilter;
	tex.minFilter = THREE.NearestFilter;
	tex.generateMipmaps = false;
	tex.wrapS = THREE.ClampToEdgeWrapping;
	tex.wrapT = THREE.ClampToEdgeWrapping;
	tex.colorSpace = THREE.NoColorSpace;
	tex.flipY = false;
	return tex;
}
function maskToDataTextureRGBA(mask, W, H, name) {
	const tex = new THREE.DataTexture(mask, W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
	tex.name = name;
	tex.needsUpdate = true;
	tex.magFilter = THREE.NearestFilter;
	tex.minFilter = THREE.NearestFilter;
	tex.generateMipmaps = false;
	tex.wrapS = THREE.ClampToEdgeWrapping;
	tex.wrapT = THREE.ClampToEdgeWrapping;
	tex.colorSpace = THREE.NoColorSpace;
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
	const rng = makeRng$1(seedUsed);
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
			ceilingOverlays: maskToDataTextureRGBA(ceilingOverlays, W, H, "bsp_dungeon_ceiling_overlays")
		}
	};
}
//#endregion
//#region src/lib/dungeon/tiled.ts
function r8Texture(data, W, H, name) {
	const tex = new THREE.DataTexture(data, W, H, THREE.RedFormat, THREE.UnsignedByteType);
	tex.name = name;
	tex.needsUpdate = true;
	tex.magFilter = THREE.NearestFilter;
	tex.minFilter = THREE.NearestFilter;
	tex.generateMipmaps = false;
	tex.wrapS = THREE.ClampToEdgeWrapping;
	tex.wrapT = THREE.ClampToEdgeWrapping;
	tex.colorSpace = THREE.NoColorSpace;
	tex.flipY = false;
	return tex;
}
function rgbaTexture(data, W, H, name) {
	const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
	tex.name = name;
	tex.needsUpdate = true;
	tex.magFilter = THREE.NearestFilter;
	tex.minFilter = THREE.NearestFilter;
	tex.generateMipmaps = false;
	tex.wrapS = THREE.ClampToEdgeWrapping;
	tex.wrapT = THREE.ClampToEdgeWrapping;
	tex.colorSpace = THREE.NoColorSpace;
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
		ceilingOverlays: rgbaTexture(buildRGBA(layerMap.ceilingOverlays), W, H, "ceilingOverlays")
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
/**
* Default three-faction combat table:
*   player  → enemy:   hostile
*   npc     → enemy:   hostile
*   enemy   → player:  hostile
*   enemy   → npc:     hostile
*
* All other relationships default to "neutral".
* Pass this to createFactionRegistryFromTable() or supply your own table
* via the `combat.factions` option in createGame().
*/
var DEFAULT_FACTION_TABLE = [
	[
		"player",
		"enemy",
		"hostile"
	],
	[
		"npc",
		"enemy",
		"hostile"
	],
	[
		"enemy",
		"player",
		"hostile"
	],
	[
		"enemy",
		"npc",
		"hostile"
	]
];
//#endregion
//#region src/lib/combat/combat.ts
/** Default formula: max(1, attacker.attack − defender.defense). Never misses. */
var defaultDamageFormula = (attacker, defender) => Math.max(1, attacker.attack - defender.defense);
/**
* Resolve one attack from `attacker` against `defender`.
*
* - If `factions` is provided and attacker is NOT hostile to defender, returns `{ outcome: "blocked" }`.
* - If the formula returns 0, emits `miss` and returns `{ outcome: "miss" }`.
* - Otherwise emits `damage` (and `death` if hp drops to 0) and returns `{ outcome: "hit", ... }`.
*
* The returned `defenderDied` flag reflects whether hp reached 0; the caller is
* responsible for updating entity state (this function is pure/side-effect-free
* aside from the EventEmitter calls).
*/
function resolveCombat({ attacker, defender, formula = defaultDamageFormula, factions, emit }) {
	if (factions && !factions.isHostile(attacker.faction, defender.faction)) return { outcome: "blocked" };
	const damage = formula(attacker, defender);
	if (damage <= 0) {
		emit.emit("miss", {
			attacker,
			defender
		});
		return { outcome: "miss" };
	}
	const defenderDied = defender.hp - damage <= 0;
	emit.emit("damage", {
		entity: defender,
		amount: damage
	});
	emit.emit("audio", {
		name: "hit",
		position: [defender.x, defender.z]
	});
	if (defenderDied) {
		emit.emit("death", {
			entity: defender,
			killer: attacker
		});
		emit.emit("audio", {
			name: "death",
			position: [defender.x, defender.z]
		});
	}
	return {
		outcome: "hit",
		damage,
		defenderDied
	};
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
	peek() {
		return this._heap[0]?.value;
	}
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
			return state.entity.hp;
		},
		get maxHp() {
			return state.entity.maxHp;
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
	function handleKeydown(event) {
		const action = keyToAction.get(event.key);
		if (action !== void 0) options.onAction(action, event);
	}
	document.addEventListener("keydown", handleKeydown);
	return { destroy() {
		document.removeEventListener("keydown", handleKeydown);
	} };
}
//#endregion
//#region src/lib/utils/rng.ts
function makeRng(seed) {
	let s = seed >>> 0;
	return () => {
		s = Math.imul(1664525, s) + 1013904223 >>> 0;
		return s / 4294967295;
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
function isSolid(x, y, solidData, width, height) {
	if (x < 0 || y < 0 || x >= width || y >= height) return true;
	return (solidData[y * width + x] ?? 0) > 0;
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
	return {
		id: e.id,
		kind: "monster",
		name: e.type,
		glyph: e.type[0] ?? "?",
		x: e.x,
		y: e.z,
		speed: e.speed > 0 ? e.speed : 5,
		alive: e.alive,
		blocksMovement: e.blocksMove,
		hp: e.hp,
		maxHp: e.maxHp,
		attack: e.attack,
		defense: e.defense,
		xp: e.xp ?? 0,
		danger: e.danger ?? 1,
		alertState: "idle",
		rpsEffect: "none",
		searchTurnsLeft: 0,
		lastKnownPlayerPos: null
	};
}
function makeApplyAction(internal, combatOpts) {
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
						if (target.type === "chest") {
							internal.events.emit("chest-open", {
								chest: target,
								loot: []
							});
							internal.events.emit("audio", {
								name: "chest-open",
								position: [target.x, target.z]
							});
						} else if (target.type === "door") internal.events.emit("audio", {
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
				const result = resolveCombat({
					attacker: attackerEntity,
					defender: defenderEntity,
					...combatOpts?.damageFormula ? { formula: combatOpts.damageFormula } : {},
					factions: internal.factions,
					emit: internal.events
				});
				if (result.outcome === "hit") {
					defenderEntity.hp = Math.max(0, defenderEntity.hp - result.damage);
					if (result.defenderDied) defenderEntity.alive = false;
					combatOpts?.onDamage?.({
						attacker: attackerEntity,
						defender: defenderEntity,
						amount: result.damage
					});
					if (result.defenderDied) {
						combatOpts?.onDeath?.({
							entity: defenderEntity,
							killer: attackerEntity
						});
						if (actorId === internal.playerActorId) {
							const xp = defenderEntity.xp ?? 0;
							if (xp > 0) internal.events.emit("xp-gain", {
								amount: xp,
								x: defenderEntity.x,
								z: defenderEntity.z
							});
							internal.events.emit("audio", {
								name: "xp-pickup",
								position: [defenderEntity.x, defenderEntity.z]
							});
						}
					}
					const updatedDefender = {
						...state.actors[targetActor.id],
						hp: defenderEntity.hp,
						alive: defenderEntity.alive
					};
					return {
						...state,
						actors: {
							...state.actors,
							[targetActor.id]: updatedDefender
						}
					};
				} else if (result.outcome === "miss") combatOpts?.onMiss?.({
					attacker: attackerEntity,
					defender: defenderEntity
				});
			}
			return state;
		}
		if (!internal.solidData || !internal.dungeonOutputs) return state;
		if (isSolid(nx, ny, internal.solidData, internal.dungeonOutputs.width, internal.dungeonOutputs.height)) return state;
		if (internal.decorations.some((d) => d.blocksMove && d.x === nx && d.z === ny)) return state;
		if (actorId === internal.playerActorId) internal.events.emit("audio", {
			name: "footstep",
			position: [nx, ny]
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
	if (!internal.minimapState || !internal.dungeonOutputs || !internal.solidData) return;
	const { width, height } = internal.dungeonOutputs;
	const solid = internal.solidData;
	const player = internal.playerState.entity;
	const fovMask = new Uint8Array(width * height);
	computeFov(player.x, player.z, {
		isOpaque: (x, y) => isSolid(x, y, solid, width, height),
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
			internal.paintMap.set(`${x},${z}`, layers);
			writePaintToOverlayTexture(internal, x, z, layers);
		},
		unpaint(x, z) {
			internal.paintMap.delete(`${x},${z}`);
			writePaintToOverlayTexture(internal, x, z, []);
		}
	};
}
function writePaintToOverlayTexture(internal, x, z, _layers) {
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
		commit(action) {
			if (internal.options.transport) {
				internal.options.transport.send(action);
				return;
			}
			if (!internal.turnState || !internal.dungeonOutputs) return;
			const solid = internal.solidData;
			const { width, height } = internal.dungeonOutputs;
			const dungOut = internal.dungeonOutputs;
			const deps = {
				isWalkable: (x, y) => !isSolid(x, y, solid, width, height),
				monsterDecide: (state, monsterId) => decideChasePlayer(state, monsterId, dungOut, (x, y) => !isSolid(x, y, solid, width, height), (x, y) => isSolid(x, y, solid, width, height)),
				computeCost: (actorId, a) => defaultComputeCost(actorId, a, internal.turnState.actors),
				applyAction: makeApplyAction(internal, internal.options.combat),
				onTimeAdvanced: ({ nextTime, prevTime }) => {
					if (nextTime > prevTime) {
						internal.turnCounter += 1;
						internal.events.emit("turn", { turn: internal.turnCounter });
						internal.options.turns?.onAdvance?.({
							turn: internal.turnCounter,
							dt: nextTime - prevTime
						});
					}
				}
			};
			internal.turnState = commitPlayerAction(internal.turnState, deps, action);
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
	} else dungeonOut = generateBspDungeon(dungeonOpts);
	internal.dungeonOutputs = dungeonOut;
	internal.solidData = dungeonOut.textures.solid.image.data;
	const playerOpts = internal.options.player ?? {};
	let playerX = playerOpts.x ?? 1;
	let playerZ = playerOpts.z ?? 1;
	if ("startRoomId" in dungeonOut && dungeonOut.rooms) {
		const bspOut = dungeonOut;
		const startRoom = bspOut.rooms.get(bspOut.startRoomId);
		if (startRoom && playerOpts.x == null) {
			playerX = Math.floor(startRoom.rect.x + startRoom.rect.w / 2);
			playerZ = Math.floor(startRoom.rect.y + startRoom.rect.h / 2);
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
		const bspOut = dungeonOut;
		const rngFn = makeRng(typeof bspOut.seed === "number" ? bspOut.seed : 305419896);
		const rng = {
			next: rngFn,
			chance: (p) => rngFn() < p
		};
		const roomList = [];
		for (const [id, info] of bspOut.rooms) if (info.type === "room") roomList.push(toPublicRoom(id, info));
		const endRoom = toPublicRoom(bspOut.endRoomId, bspOut.rooms.get(bspOut.endRoomId));
		const startRoom = toPublicRoom(bspOut.startRoomId, bspOut.rooms.get(bspOut.startRoomId));
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
						type,
						sprite: type,
						x,
						z,
						hp: 0,
						maxHp: 0,
						attack: 0,
						defense: 0,
						speed: 0,
						alive: false,
						blocksMove: false,
						faction: "none",
						tick: 0,
						yaw: 0,
						scale: 1,
						...meta ?? {}
					});
				},
				npc(x, z, type, opts) {
					const entity = {
						id: `npc_${type}_${x}_${z}`,
						kind: "npc",
						type,
						sprite: type,
						x,
						z,
						hp: opts?.hp ?? 10,
						maxHp: opts?.maxHp ?? 10,
						attack: opts?.attack ?? 0,
						defense: opts?.defense ?? 0,
						speed: opts?.speed ?? 5,
						alive: true,
						blocksMove: true,
						faction: "npc",
						tick: 0
					};
					turnsHandle.addActor(entity);
				},
				enemy(x, z, type, opts) {
					const entity = {
						id: `enemy_${type}_${x}_${z}`,
						kind: "enemy",
						type,
						sprite: type,
						x,
						z,
						hp: opts?.hp ?? 10,
						maxHp: opts?.maxHp ?? 10,
						attack: opts?.attack ?? 3,
						defense: opts?.defense ?? 0,
						speed: opts?.speed ?? 7,
						alive: true,
						blocksMove: true,
						faction: "enemy",
						tick: 0
					};
					turnsHandle.addActor(entity);
				},
				decoration(x, z, type, opts) {
					dungeonHandle.decorations.add({
						id: `deco_${type}_${x}_${z}`,
						kind: "decoration",
						type,
						sprite: type,
						x,
						z,
						hp: 0,
						maxHp: 0,
						attack: 0,
						defense: 0,
						speed: 0,
						alive: false,
						blocksMove: opts?.blocksMove ?? false,
						faction: "none",
						tick: 0,
						yaw: opts?.yaw ?? 0,
						scale: opts?.scale ?? 1
					});
				},
				surface(x, z, layers) {
					dungeonHandle.paint(x, z, layers);
				}
			}
		});
	}
	if (internal.spawnerCb && "startRoomId" in dungeonOut) {
		const bspOut = dungeonOut;
		for (const [id, info] of bspOut.rooms) {
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
			if (layers && layers.length > 0) dungeonHandle.paint(x, y, layers);
		}
	}
	if (internal.turnState) {
		const deps = {
			isWalkable: (x, y) => !isSolid(x, y, internal.solidData, dungeonOut.width, dungeonOut.height),
			monsterDecide: (state, monsterId) => decideChasePlayer(state, monsterId, dungeonOut, (x, y) => !isSolid(x, y, internal.solidData, dungeonOut.width, dungeonOut.height), (x, y) => isSolid(x, y, internal.solidData, dungeonOut.width, dungeonOut.height)),
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
	const exploredColor = colors.explored ?? "#555";
	const visibleColor = colors.visible ?? "#bbb";
	const playerColor = colors.player ?? "#0f0";
	const npcColor = colors.npc ?? "#08f";
	const enemyColor = colors.enemy ?? "#f44";
	ctx.clearRect(0, 0, size, size);
	for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
		const i = y * width + x;
		if (minimap.visible[i]) ctx.fillStyle = visibleColor;
		else if (minimap.explored[i]) ctx.fillStyle = exploredColor;
		else continue;
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
	const factions = createFactionRegistryFromTable(options.combat?.factions ?? DEFAULT_FACTION_TABLE);
	const playerOpts = options.player ?? {};
	const playerActorId = playerOpts.id ?? "player";
	const playerEntity = {
		id: playerActorId,
		kind: "player",
		type: "player",
		sprite: "player",
		x: playerOpts.x ?? 1,
		z: playerOpts.z ?? 1,
		hp: playerOpts.hp ?? 30,
		maxHp: playerOpts.maxHp ?? playerOpts.hp ?? 30,
		attack: playerOpts.attack ?? 3,
		defense: playerOpts.defense ?? 1,
		speed: playerOpts.speed ?? 5,
		alive: true,
		blocksMove: true,
		faction: "player",
		tick: 0
	};
	const playerState = {
		entity: playerEntity,
		facing: 0,
		inventory: []
	};
	const internal = {
		options,
		canvas,
		events,
		factions,
		dungeonOutputs: null,
		solidData: null,
		turnState: null,
		playerActorId,
		playerState,
		playerHandle: createPlayerHandle(playerState),
		entityById: new Map([[playerActorId, playerEntity]]),
		decorations: [],
		paintMap: /* @__PURE__ */ new Map(),
		passages: [],
		passageMask: null,
		turnCounter: 0,
		minimapState: null,
		spawnerCb: null,
		decoratorCb: null,
		surfacePainterCb: null,
		keybindingsHandles: [],
		destroyed: false
	};
	let dungeonHandle;
	let turnsHandle;
	let generated = false;
	dungeonHandle = makeDungeonHandle(internal);
	turnsHandle = makeTurnsHandle(internal, dungeonHandle);
	if (options.transport) options.transport.onStateUpdate((update) => {
		if (internal.destroyed) return;
		if (internal.turnState) {
			let actors = { ...internal.turnState.actors };
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
			internal.turnState = {
				...internal.turnState,
				actors,
				awaitingPlayerInput: true
			};
		}
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
		get combat() {
			return { factions: internal.factions };
		},
		generate() {
			if (generated) return;
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
function makeBase(kind, opts, overrides) {
	return {
		id: nextId(kind),
		kind,
		type: opts.type,
		sprite: opts.sprite,
		x: opts.x,
		z: opts.z,
		hp: 0,
		maxHp: 0,
		attack: 0,
		defense: 0,
		speed: 0,
		alive: true,
		blocksMove: false,
		faction: opts.faction ?? "none",
		tick: 0,
		...overrides
	};
}
/** Create a friendly or neutral NPC entity. */
function createNpc(opts) {
	const maxHp = opts.maxHp ?? 10;
	return makeBase("npc", opts, {
		id: nextId("npc"),
		hp: opts.hp ?? maxHp,
		maxHp,
		attack: opts.attack ?? 0,
		defense: opts.defense ?? 0,
		speed: opts.speed ?? 5,
		blocksMove: opts.blocksMove ?? true
	});
}
/** Create an enemy entity. */
function createEnemy(opts) {
	const maxHp = opts.maxHp ?? 10;
	return {
		...makeBase("enemy", opts, {
			id: nextId("enemy"),
			hp: opts.hp ?? maxHp,
			maxHp,
			attack: opts.attack ?? 3,
			defense: opts.defense ?? 0,
			speed: opts.speed ?? 7,
			blocksMove: opts.blocksMove ?? true
		}),
		danger: opts.danger ?? 1,
		xp: opts.xp ?? 10,
		rpsEffect: opts.rpsEffect ?? "none",
		alertState: "idle",
		searchTurnsLeft: 0,
		lastKnownPlayerPos: null
	};
}
/** Create a stationary decoration entity. Decorations are not alive in the turn sense. */
function createDecoration(opts) {
	return {
		...makeBase("decoration", opts, {
			id: nextId("decoration"),
			alive: false,
			blocksMove: opts.blocksMove ?? false,
			speed: 0
		}),
		yaw: opts.yaw ?? 0,
		scale: opts.scale ?? 1
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
*   const renderer = createDungeonRenderer(el, game, {
*     atlas: {
*       texture,
*       tileWidth: 16, tileHeight: 16,
*       sheetWidth: 256, sheetHeight: 256,
*       columns: 16,
*     },
*     floorTileId: 0,
*     ceilTileId: 1,
*     wallTileId: 2,
*   });
*
*   // Pass live entity list on every turn:
*   game.events.on('turn', () => renderer.setEntities(enemies));
*/
var TORCH_UNIFORMS_GLSL = `
uniform float uFogNear;
uniform float uFogFar;
uniform float uBandNear;
uniform float uTime;
uniform vec3  uTint0;
uniform vec3  uTint1;
uniform vec3  uTint2;
uniform vec3  uTint3;
uniform vec3  uTorchColor;
uniform float uTorchIntensity;
`;
var TORCH_HASH_GLSL = `
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
`;
var TORCH_FNS_GLSL = `
float torchBand(float flickerRadius) {
  float raw = sin(uTime * 7.0)  * 0.45
            + sin(uTime * 13.7) * 0.35
            + sin(uTime * 3.1)  * 0.20;
  float flicker = (floor(raw * 1.5 + 0.5)) / 6.0;
  float dist = clamp((vFogDist - uBandNear) / (uFogFar - uBandNear), 0.0, 1.0);
  float flickeredDist = clamp(dist + flicker * flickerRadius, 0.0, 1.0);
  return floor(pow(flickeredDist, 0.75) * 5.0);
}

vec3 applyTorchLighting(vec3 baseColor, float band) {
  float timeSlot = floor(uTime * 1.5);
  vec2 cell = floor(vWorldPos * 0.5);
  float spatialNoise = hash(cell + vec2(timeSlot * 7.3, timeSlot * 3.1));
  float turb = (floor(spatialNoise * 3.0) / 3.0) * 0.18;

  float brightness;
  vec3  tint;
  if (band < 1.0) {
    brightness = 1.00 - turb; tint = uTint0;
  } else if (band < 2.0) {
    brightness = 0.55;        tint = uTint1;
  } else if (band < 3.0) {
    brightness = 0.22;        tint = uTint2;
  } else if (band < 4.0) {
    brightness = 0.10;        tint = uTint3;
  } else {
    brightness = 0.00;        tint = vec3(1.0);
  }

  vec3 lit = baseColor * tint * brightness;
  float torchAdd = (band < 1.0) ? 0.250 :
                   (band < 2.0) ? 0.200 : 0.0;
  lit += uTorchColor * (torchAdd * uTorchIntensity);
  return lit;
}
`;
var FLICKER_RADIUS = .03;
var BUMP_DEPTH = .3;
var ATLAS_VERT = `
attribute float aTileId;
uniform vec2  uTileSize;
uniform float uColumns;

varying vec2  vAtlasUv;
varying vec2  vTileOrigin;
varying float vFogDist;
varying vec2  vWorldPos;
varying vec3  vWorldPos3D;
varying vec3  vFaceNormal;
varying vec2  vTileUv;

void main() {
  float id  = floor(aTileId + 0.5);
  float col = mod(id, uColumns);
  float row = floor(id / uColumns);

  vec2 offset = vec2(col * uTileSize.x, 1.0 - (row + 1.0) * uTileSize.y);
  vAtlasUv    = offset + uv * uTileSize;
  vTileOrigin = offset;
  vTileUv     = uv;

  vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vWorldPos    = worldPos.xz;
  vWorldPos3D  = worldPos.xyz;
  vFaceNormal  = normalize(mat3(modelMatrix * instanceMatrix) * vec3(0.0, 0.0, 1.0));

  vec4 eyePos = viewMatrix * worldPos;
  vFogDist = length(eyePos.xyz);

  gl_Position = projectionMatrix * eyePos;
}
`;
var ATLAS_FRAG = `
uniform sampler2D uAtlas;
uniform vec2  uTileSize;
uniform float uColumns;
uniform vec3  uFogColor;
uniform float uFlickerRadius;
uniform vec2  uTexelSize;
${TORCH_UNIFORMS_GLSL}

varying vec2  vAtlasUv;
varying vec2  vTileOrigin;
varying float vFogDist;
varying vec2  vWorldPos;
varying vec3  vWorldPos3D;
varying vec3  vFaceNormal;
varying vec2  vTileUv;

${TORCH_HASH_GLSL}
${TORCH_FNS_GLSL}

void main() {
  // Clamp to tile texel bounds to prevent atlas bleed from perspective interpolation.
  vec2 uvMin = vTileOrigin + uTexelSize * 0.5;
  vec2 uvMax = vTileOrigin + uTileSize  - uTexelSize * 0.5;
  vec2 atlasUv = clamp(vAtlasUv, uvMin, uvMax);

  vec4 color = texture2D(uAtlas, atlasUv);
  if (color.a < 0.01) discard;

  // Bump from intensity gradient: derive tangent normal from neighbouring texels.
  vec3 luma = vec3(0.299, 0.587, 0.114);
  float l0 = dot(color.rgb, luma);
  float lR = dot(texture2D(uAtlas, clamp(atlasUv + vec2(uTexelSize.x, 0.0), uvMin, uvMax)).rgb, luma);
  float lU = dot(texture2D(uAtlas, clamp(atlasUv + vec2(0.0, uTexelSize.y), uvMin, uvMax)).rgb, luma);
  vec3 bumpN = normalize(vec3(l0 - lR, l0 - lU, ${BUMP_DEPTH}));
  float bumpShade = clamp(dot(bumpN, normalize(vec3(0.5, 0.5, 1.0))), 0.0, 1.0);
  bumpShade = 0.8 + 0.35 * bumpShade;

  float band = torchBand(uFlickerRadius);
  vec3 lit = applyTorchLighting(color.rgb * bumpShade, band);

  gl_FragColor = vec4(mix(lit, uFogColor, step(4.0, band)), color.a);
}
`;
var HALF_PI = Math.PI / 2;
/** Eye height as a fraction of ceiling height (same as PerspectiveDungeonView). */
var EYE_HEIGHT_FACTOR = .4;
var DEFAULT_BAND_NEAR = 8;
function makeFaceMatrix(x, y, z, rx, ry, rz, w, h) {
	return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(w, h, 1));
}
/**
* Build a PlaneGeometry with a pre-allocated aTileId InstancedBufferAttribute,
* and an InstancedMesh using either a ShaderMaterial (atlas) or a plain material.
*/
function buildInstancedMesh(matrices, tileIds, material, useAtlas) {
	const geo = new THREE.PlaneGeometry(1, 1);
	if (useAtlas) {
		const tileIdArr = new Float32Array(matrices.length);
		tileIds.forEach((id, i) => {
			tileIdArr[i] = id;
		});
		geo.setAttribute("aTileId", new THREE.InstancedBufferAttribute(tileIdArr, 1));
	}
	const mesh = new THREE.InstancedMesh(geo, material, matrices.length);
	matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
	mesh.instanceMatrix.needsUpdate = true;
	return mesh;
}
function createDungeonRenderer(element, game, options = {}) {
	const tileSize = options.tileSize ?? 3;
	const ceilingH = options.ceilingHeight ?? 3;
	const fov = options.fov ?? 75;
	const fogNear = options.fogNear ?? 5;
	const fogFar = options.fogFar ?? 24;
	const fogHex = options.fogColor ?? "#000000";
	const lerpFactor = options.lerpFactor ?? .18;
	const fogColor = new THREE.Color(fogHex);
	const atlas = options.atlas;
	const floorTileId = options.floorTileId ?? 0;
	const ceilTileId = options.ceilTileId ?? 0;
	const wallTileId = options.wallTileId ?? 0;
	const bandNear = options.bandNear ?? DEFAULT_BAND_NEAR;
	const torchColor = options.torchColor ?? new THREE.Color(1, .85, .4);
	const torchIntensity = options.torchIntensity ?? .33;
	const glRenderer = new THREE.WebGLRenderer({ antialias: false });
	glRenderer.setPixelRatio(window.devicePixelRatio);
	glRenderer.setClearColor(fogColor);
	const canvas = glRenderer.domElement;
	canvas.style.cssText = "width:100%;height:100%;display:block;";
	element.appendChild(canvas);
	const scene = new THREE.Scene();
	scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);
	const camera = new THREE.PerspectiveCamera(fov, 1, .05, fogFar * 2);
	scene.add(new THREE.AmbientLight(16777215, .06));
	const torchLight = new THREE.PointLight(16771264, 3, tileSize * 5, 2);
	scene.add(torchLight);
	const atlasMaterials = [];
	function makeAtlasMaterial(atlasConfig) {
		const tex = new THREE.Texture(atlasConfig.image);
		tex.magFilter = THREE.NearestFilter;
		tex.minFilter = THREE.NearestFilter;
		tex.needsUpdate = true;
		const mat = new THREE.ShaderMaterial({
			vertexShader: ATLAS_VERT,
			fragmentShader: ATLAS_FRAG,
			uniforms: {
				uAtlas: { value: tex },
				uTileSize: { value: new THREE.Vector2(atlasConfig.tileWidth / atlasConfig.sheetWidth, atlasConfig.tileHeight / atlasConfig.sheetHeight) },
				uColumns: { value: atlasConfig.columns },
				uTexelSize: { value: new THREE.Vector2(1 / atlasConfig.sheetWidth, 1 / atlasConfig.sheetHeight) },
				uFogColor: { value: fogColor },
				uFogNear: { value: fogNear },
				uFogFar: { value: fogFar },
				uFlickerRadius: { value: FLICKER_RADIUS },
				uTime: { value: 0 },
				uBandNear: { value: bandNear },
				uTint0: { value: new THREE.Color(1, 1, 1) },
				uTint1: { value: new THREE.Color(.67, .67, .67) },
				uTint2: { value: new THREE.Color(.33, .33, .33) },
				uTint3: { value: new THREE.Color(.25, .25, .25) },
				uTorchColor: { value: torchColor },
				uTorchIntensity: { value: torchIntensity }
			},
			side: THREE.FrontSide
		});
		atlasMaterials.push(mat);
		return mat;
	}
	const floorMat = atlas ? makeAtlasMaterial(atlas) : new THREE.MeshStandardMaterial({ color: 5592422 });
	const ceilMat = atlas ? makeAtlasMaterial(atlas) : new THREE.MeshStandardMaterial({ color: 2236979 });
	const wallMat = atlas ? makeAtlasMaterial(atlas) : new THREE.MeshStandardMaterial({ color: 7037040 });
	let floorMesh = null;
	let ceilMesh = null;
	let wallMesh = null;
	let dungeonBuilt = false;
	function buildDungeon() {
		if (dungeonBuilt) return;
		const outputs = game.dungeon.outputs;
		if (!outputs) return;
		dungeonBuilt = true;
		const { width, height } = outputs;
		const solid = outputs.textures.solid.image.data;
		const wallMidY = ceilingH / 2;
		const floors = [];
		const ceils = [];
		const walls = [];
		const floorIds = [];
		const ceilIds = [];
		const wallIds = [];
		function isSolid(cx, cz) {
			if (cx < 0 || cz < 0 || cx >= width || cz >= height) return true;
			return (solid[cz * width + cx] ?? 0) > 0;
		}
		for (let cz = 0; cz < height; cz++) for (let cx = 0; cx < width; cx++) {
			if (isSolid(cx, cz)) continue;
			const wx = (cx + .5) * tileSize;
			const wz = (cz + .5) * tileSize;
			floors.push(makeFaceMatrix(wx, 0, wz, -HALF_PI, 0, 0, tileSize, tileSize));
			floorIds.push(floorTileId);
			ceils.push(makeFaceMatrix(wx, ceilingH, wz, HALF_PI, 0, 0, tileSize, tileSize));
			ceilIds.push(ceilTileId);
			if (isSolid(cx, cz - 1)) {
				walls.push(makeFaceMatrix(wx, wallMidY, cz * tileSize, 0, 0, 0, tileSize, ceilingH));
				wallIds.push(wallTileId);
			}
			if (isSolid(cx, cz + 1)) {
				walls.push(makeFaceMatrix(wx, wallMidY, (cz + 1) * tileSize, 0, Math.PI, 0, tileSize, ceilingH));
				wallIds.push(wallTileId);
			}
			if (isSolid(cx - 1, cz)) {
				walls.push(makeFaceMatrix(cx * tileSize, wallMidY, wz, 0, HALF_PI, 0, tileSize, ceilingH));
				wallIds.push(wallTileId);
			}
			if (isSolid(cx + 1, cz)) {
				walls.push(makeFaceMatrix((cx + 1) * tileSize, wallMidY, wz, 0, -HALF_PI, 0, tileSize, ceilingH));
				wallIds.push(wallTileId);
			}
		}
		floorMesh = buildInstancedMesh(floors, floorIds, floorMat, !!atlas);
		scene.add(floorMesh);
		ceilMesh = buildInstancedMesh(ceils, ceilIds, ceilMat, !!atlas);
		scene.add(ceilMesh);
		wallMesh = buildInstancedMesh(walls, wallIds, wallMat, !!atlas);
		scene.add(wallMesh);
	}
	const entityGeo = new THREE.BoxGeometry(tileSize * .35, ceilingH * .55, tileSize * .35);
	const entityMat = new THREE.MeshStandardMaterial({ color: 13378082 });
	const entityMeshMap = /* @__PURE__ */ new Map();
	function syncEntities(entities) {
		const aliveIds = new Set(entities.filter((e) => e.alive).map((e) => e.id));
		for (const [id, mesh] of entityMeshMap) if (!aliveIds.has(id)) {
			scene.remove(mesh);
			entityMeshMap.delete(id);
		}
		for (const e of entities) {
			if (!e.alive) continue;
			if (!entityMeshMap.has(e.id)) {
				const newMesh = new THREE.Mesh(entityGeo, entityMat);
				entityMeshMap.set(e.id, newMesh);
				scene.add(newMesh);
			}
			entityMeshMap.get(e.id).position.set((e.x + .5) * tileSize, ceilingH * EYE_HEIGHT_FACTOR, (e.z + .5) * tileSize);
		}
	}
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
		const tSec = t / 1e3;
		for (const mat of atlasMaterials) if (mat.uniforms.uTime) mat.uniforms.uTime.value = tSec;
		if (initialized) {
			const k = 1 - Math.pow(1 - lerpFactor, dt * 60);
			curX += (tgtX - curX) * k;
			curZ += (tgtZ - curZ) * k;
			let dy = tgtYaw - curYaw;
			if (dy > Math.PI) dy -= 2 * Math.PI;
			if (dy < -Math.PI) dy += 2 * Math.PI;
			curYaw += dy * k;
			camera.position.set(curX, ceilingH * EYE_HEIGHT_FACTOR, curZ);
			camera.rotation.set(0, curYaw, 0, "YXZ");
			torchLight.position.copy(camera.position);
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
	return {
		setEntities(entities) {
			syncEntities(entities);
		},
		destroy() {
			cancelAnimationFrame(rafId);
			ro.disconnect();
			game.events.off("turn", onTurn);
			glRenderer.dispose();
			canvas.remove();
		}
	};
}
//#endregion
//#region src/lib/transport/websocket.ts
function createWebSocketTransport(url) {
	let ws = null;
	let _playerId = null;
	const updateHandlers = [];
	const chatHandlers = [];
	function dispatch(raw) {
		let msg;
		try {
			msg = JSON.parse(raw);
		} catch {
			return;
		}
		if (msg.type === "state") {
			const update = msg;
			for (const h of updateHandlers) h(update);
		}
		if (msg.type === "chat") {
			const payload = {
				playerId: msg.playerId,
				text: msg.text
			};
			for (const h of chatHandlers) h(payload);
		}
	}
	return {
		get playerId() {
			return _playerId;
		},
		connect() {
			return new Promise((resolve, reject) => {
				ws = new WebSocket(url);
				ws.onopen = () => {
					ws.send(JSON.stringify({
						type: "join",
						roomId: "default"
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
		onChat(handler) {
			chatHandlers.push(handler);
		}
	};
}
//#endregion
export { attachDecorator, attachKeybindings, attachMinimap, attachSpawner, attachSurfacePainter, createDecoration, createDungeonRenderer, createEnemy, createGame, createItem, createNpc, createWebSocketTransport, loadTiledMap };

//# sourceMappingURL=r3f-crawl-lib.js.map