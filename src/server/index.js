// src/server/index.js
//
// Authoritative multiplayer server for r3f-crawl-lib.
//
// Responsibilities:
//  - Accepts WebSocket connections from browser clients.
//  - Tracks canonical player positions for each room.
//  - Generates the dungeon server-side from the config the host sends so the
//    server is the sole source of truth for the solid map and spawn point.
//    Move validation is exact from the first action — no "trust the client"
//    fallback needed.
//  - Broadcasts a state snapshot to all clients in the room after every
//    accepted action so every peer stays in sync.
//  - Serves the multiplayer example and all static assets over HTTP so a
//    single `npm run multiplayer` command starts everything.
//
// Message protocol (all JSON):
//
//   Client → Server:
//     { type: 'join', roomId: string }
//     { type: 'dungeon_init', config: object }   (host only, after generate)
//     { type: 'action', action: { kind, dx?, dy?, meta? } }
//
//   Server → Client:
//     { type: 'welcome', playerId: string, isHost: boolean,
//                        dungeonConfig?: object }
//     { type: 'state', players: Record<id,PlayerState>, turn: number }
//     { type: 'player_joined', playerId: string }
//     { type: 'player_left',   playerId: string }

import { createServer } from 'node:http'
import { WebSocketServer } from 'ws'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import os from 'node:os'
import { generateBspDungeon } from '../../dist/server/dungeon.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', '..')
const PORT = Number(process.env.PORT ?? 3001)

// ---------------------------------------------------------------------------
// Room state
// ---------------------------------------------------------------------------

/**
 * @typedef {{
 *   x: number, y: number, hp: number, maxHp: number,
 *   alive: boolean, facing: number, ws: import('ws').WebSocket
 * }} RoomPlayer
 *
 * @typedef {{
 *   players: Map<string, RoomPlayer>,
 *   solid: Uint8Array | null,
 *   width: number,
 *   height: number,
 *   dungeonConfig: object | null,
 *   spawnX: number,
 *   spawnY: number,
 *   turn: number,
 * }} Room
 */

/** @type {Map<string, Room>} */
const rooms = new Map()

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      players: new Map(),
      solid: null,
      width: 0,
      height: 0,
      dungeonConfig: null,
      spawnX: 1,
      spawnY: 1,
      turn: 0,
    })
  }
  return rooms.get(roomId)
}

// ---------------------------------------------------------------------------
// Move validation
// ---------------------------------------------------------------------------

function isWalkable(room, x, y) {
  if (!room.solid) return true  // no solid data yet — trust client
  if (x < 0 || y < 0 || x >= room.width || y >= room.height) return false
  return room.solid[y * room.width + x] === 0
}

function isOccupied(room, x, y, excludeId) {
  for (const [id, p] of room.players) {
    if (id !== excludeId && p.alive && p.x === x && p.y === y) return true
  }
  return false
}

/**
 * Return the first walkable, unoccupied cell at or adjacent to (preferX, preferY).
 * Tries the centre first, then the 4 cardinal neighbours, then the 4 diagonals.
 * Falls back to the preferred position if nothing is free (shouldn't happen in a
 * normal dungeon).
 */
function findSpawnPos(room, preferX, preferY) {
  const candidates = [
    [0, 0],
    [0, -1], [0, 1], [-1, 0], [1, 0],
    [-1, -1], [-1, 1], [1, -1], [1, 1],
  ]
  for (const [dx, dy] of candidates) {
    const x = preferX + dx
    const y = preferY + dy
    if (isWalkable(room, x, y) && !isOccupied(room, x, y, null)) {
      return { x, y }
    }
  }
  return { x: preferX, y: preferY }
}

// ---------------------------------------------------------------------------
// Broadcast helpers
// ---------------------------------------------------------------------------

function stateSnapshot(room) {
  const players = {}
  for (const [id, p] of room.players) {
    players[id] = { x: p.x, y: p.y, hp: p.hp, maxHp: p.maxHp, alive: p.alive, facing: p.facing }
  }
  return JSON.stringify({ type: 'state', players, turn: room.turn })
}

function broadcast(room, msg, excludeWs = null) {
  const str = typeof msg === 'string' ? msg : JSON.stringify(msg)
  for (const p of room.players.values()) {
    if (p.ws !== excludeWs && p.ws.readyState === 1 /* OPEN */) {
      p.ws.send(str)
    }
  }
}

function broadcastAll(room, msg) {
  broadcast(room, msg, null)
}

// ---------------------------------------------------------------------------
// Action handler
// ---------------------------------------------------------------------------

function applyAction(room, playerId, action) {
  const player = room.players.get(playerId)
  if (!player || !player.alive) return false

  const { kind, dx, dy, meta } = action

  if (kind === 'interact' && meta?.rotate !== undefined) {
    const delta = Number(meta.rotate)
    player.facing = ((player.facing + delta) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)
    return true
  }

  if (kind === 'wait') {
    return true
  }

  if (kind === 'move' && dx != null && dy != null) {
    const nx = player.x + Number(dx)
    const ny = player.y + Number(dy)
    if (!isWalkable(room, nx, ny)) return false
    if (isOccupied(room, nx, ny, playerId)) return false
    player.x = nx
    player.y = ny
    return true
  }

  return false
}

// ---------------------------------------------------------------------------
// Express static file server
// ---------------------------------------------------------------------------

const app = express()

// Serve the multiplayer example at the root
app.get('/', (_req, res) => {
  res.sendFile(path.join(ROOT, 'examples', 'multiplayer', 'index.html'))
})

// Serve all static assets (examples, dist, node_modules/three)
app.use('/examples',     express.static(path.join(ROOT, 'examples')))
app.use('/dist',         express.static(path.join(ROOT, 'dist')))
app.use('/node_modules', express.static(path.join(ROOT, 'node_modules')))

const server = createServer(app)

// ---------------------------------------------------------------------------
// WebSocket server
// ---------------------------------------------------------------------------

const wss = new WebSocketServer({ server })

let nextPlayerId = 1

wss.on('connection', (ws) => {
  let playerId = null
  let roomId = null

  ws.on('message', (raw) => {
    let msg
    try { msg = JSON.parse(raw.toString()) } catch { return }

    // ── join ──────────────────────────────────────────────────────────────
    if (msg.type === 'join') {
      roomId = String(msg.roomId ?? 'default')
      const room = getOrCreateRoom(roomId)

      playerId = `player_${nextPlayerId++}`
      const isHost = room.players.size === 0

      // Place the player at a free cell near the spawn point. If the dungeon
      // hasn't been initialised yet (host hasn't sent dungeon_init) the spawn
      // defaults to (1,1) and will be corrected when dungeon_init arrives.
      const spawnPos = findSpawnPos(room, room.spawnX, room.spawnY)
      room.players.set(playerId, {
        x: spawnPos.x, y: spawnPos.y,
        hp: 30, maxHp: 30,
        alive: true,
        facing: 0,
        ws,
      })

      // Welcome this client
      const welcome = { type: 'welcome', playerId, isHost }
      if (!isHost && room.dungeonConfig) welcome.dungeonConfig = room.dungeonConfig
      ws.send(JSON.stringify(welcome))

      // Tell everyone else a new player joined
      broadcast(room, { type: 'player_joined', playerId }, ws)

      // Broadcast full state to ALL players (including the newcomer) so every
      // renderer immediately reflects the updated player list and positions.
      broadcastAll(room, stateSnapshot(room))

      // Announce in chat so all clients can display it as a notification.
      broadcastAll(room, { type: 'chat', playerId: 'server', text: `${playerId} has entered the dungeon.` })
      return
    }

    if (!playerId || !roomId) return
    const room = rooms.get(roomId)
    if (!room) return

    // ── dungeon_init ───────────────────────────────────────────────────────
    if (msg.type === 'dungeon_init') {
      const config = msg.config ?? {}
      room.dungeonConfig = config

      // Generate the dungeon server-side so the solid map and spawn point are
      // authoritative — clients cannot send bad solid data.
      try {
        const dungeon = generateBspDungeon(config)
        room.solid  = dungeon.textures.solid.image.data
        room.width  = dungeon.width
        room.height = dungeon.height

        // Derive spawn from startRoomId centre (same logic as the client).
        const startRoom = dungeon.rooms.get(dungeon.startRoomId)
        if (startRoom) {
          room.spawnX = Math.floor(startRoom.rect.x + startRoom.rect.w / 2)
          room.spawnY = Math.floor(startRoom.rect.y + startRoom.rect.h / 2)
        }

        // Reposition any players already in the room (including the host who
        // sent this message) to a valid spawn cell.
        for (const [pid, player] of room.players) {
          const pos = findSpawnPos(room, room.spawnX, room.spawnY)
          player.x = pos.x
          player.y = pos.y
        }

        // Broadcast updated positions so clients reflect the correction.
        broadcastAll(room, stateSnapshot(room))
      } catch (err) {
        console.error('dungeon_init: failed to generate dungeon', err)
      }
      return
    }

    // ── action ─────────────────────────────────────────────────────────────
    if (msg.type === 'action') {
      const accepted = applyAction(room, playerId, msg.action ?? {})
      if (!accepted) return

      room.turn++

      // Broadcast full state to everyone in the room
      broadcastAll(room, stateSnapshot(room))
    }

    // ── chat ───────────────────────────────────────────────────────────────
    if (msg.type === 'chat') {
      const text = String(msg.text ?? '').trim().slice(0, 200)
      if (!text) return
      broadcastAll(room, { type: 'chat', playerId, text })
    }
  })

  ws.on('close', () => {
    if (!roomId || !playerId) return
    const room = rooms.get(roomId)
    if (!room) return

    room.players.delete(playerId)
    broadcastAll(room, { type: 'player_left', playerId })

    // Broadcast updated state so remaining clients remove the departed player
    // from their renderers immediately.
    if (room.players.size > 0) {
      broadcastAll(room, stateSnapshot(room))
      broadcastAll(room, { type: 'chat', playerId: 'server', text: `${playerId} has left the dungeon.` })
    }

    // Clean up empty rooms
    if (room.players.size === 0) rooms.delete(roomId)
  })
})

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

function getExternalIPs() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((n) => n.family === 'IPv4' && !n.internal)
    .map((n) => n.address)
}

server.listen(PORT, () => {
  const ips = getExternalIPs()
  console.log()
  console.log('  atomic-core multiplayer server')
  console.log()
  console.log(`  Local:    http://localhost:${PORT}`)
  for (const ip of ips) {
    console.log(`  Network:  http://${ip}:${PORT}  (share with friends)`)
  }
  console.log()
  console.log('  WebSocket endpoint: ws://localhost:' + PORT)
  console.log()
})
