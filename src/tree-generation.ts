import { CHUNK_SIZE, CHUNK_HEIGHT } from './world-types'
import { BlockId } from './blocks'
import { DEFAULT_TERRAIN_SEED } from './terrain-params'

export const TREE_CHANCE = 0.07
const TREE_CLEAR_RADIUS = 4

function getIndex(x: number, y: number, z: number): number {
  return x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE
}

function hash(
  x: number,
  y: number,
  z: number,
  offsetX: number,
  offsetZ: number,
  seed: number,
): number {
  let h = (offsetX + x) * 374761393 + (offsetZ + z) * 668265263 + y * 2147483647 + seed
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return (h ^ (h >>> 16)) >>> 0
}

function random01(h: number): number {
  return (h % 1000) / 1000
}

function canPlaceTree(volume: Uint8Array, x: number, y: number, z: number): boolean {
  return (
    volume[getIndex(x, y, z)] === BlockId.GRASS_BLOCK &&
    (volume[getIndex(x, y + 1, z)] === BlockId.AIR ||
      volume[getIndex(x, y + 1, z)] === BlockId.GRASS)
  )
}

function hasClearSpace(volume: Uint8Array, x: number, y: number, z: number): boolean {
  for (let dx = -TREE_CLEAR_RADIUS; dx <= TREE_CLEAR_RADIUS; dx++) {
    for (let dz = -TREE_CLEAR_RADIUS; dz <= TREE_CLEAR_RADIUS; dz++) {
      for (let dy = 1; dy <= 6; dy++) {
        const bx = x + dx
        const bz = z + dz
        const by = y + dy
        if (bx < 0 || bx >= CHUNK_SIZE || bz < 0 || bz >= CHUNK_SIZE || by >= CHUNK_HEIGHT) {
          return false
        }
        const bid = volume[getIndex(bx, by, bz)]
        if (bid !== BlockId.AIR && bid !== BlockId.GRASS) {
          return false
        }
      }
    }
  }
  return true
}

function placeTrunk(volume: Uint8Array, x: number, y: number, z: number, height: number): void {
  for (let dy = 1; dy <= height; dy++) {
    volume[getIndex(x, y + dy, z)] = BlockId.WOOD
  }
}

function setLeaf(
  volume: Uint8Array,
  x: number,
  y: number,
  z: number,
  dx: number,
  dy: number,
  dz: number,
): void {
  const bx = x + dx
  const bz = z + dz
  const by = y + dy
  if (bx < 0 || bx >= CHUNK_SIZE || bz < 0 || bz >= CHUNK_SIZE || by >= CHUNK_HEIGHT) {
    return
  }
  if (dx === 0 && dz === 0 && dy <= 4) {
    return
  }
  volume[getIndex(bx, by, bz)] = BlockId.LEAVES
}

function placeLeavesClassic(volume: Uint8Array, x: number, y: number, z: number): void {
  for (let dy = 3; dy <= 6; dy++) {
    const r = dy <= 5 ? 2 : 0
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        setLeaf(volume, x, y, z, dx, dy, dz)
      }
    }
  }
}

function placeLeavesRound(volume: Uint8Array, x: number, y: number, z: number): void {
  for (let dy = 3; dy <= 6; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        const dist = dx * dx + dz * dz + (dy - 4.5) * (dy - 4.5)
        if (dist <= 6 || (dy === 6 && dx === 0 && dz === 0)) {
          setLeaf(volume, x, y, z, dx, dy, dz)
        }
      }
    }
  }
}

function placeLeavesPointy(volume: Uint8Array, x: number, y: number, z: number): void {
  for (let dy = 3; dy <= 6; dy++) {
    const r = dy <= 4 ? 2 : dy === 5 ? 1 : 0
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        setLeaf(volume, x, y, z, dx, dy, dz)
      }
    }
  }
}

function placeLeavesBushy(volume: Uint8Array, x: number, y: number, z: number, h: number): void {
  for (let dy = 2; dy <= 6; dy++) {
    const r = dy <= 3 ? 1 : dy <= 5 ? 2 : 1
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (dx === 0 && dz === 0 && dy <= 4) {
          continue
        }
        const n = (h + dx * 7 + dz * 13 + dy * 31) % 3
        if (n === 0) {
          continue
        }
        setLeaf(volume, x, y, z, dx, dy, dz)
      }
    }
  }
}

export function placeTrees(
  volume: Uint8Array,
  offsetX: number,
  offsetZ: number,
  seed = DEFAULT_TERRAIN_SEED,
): void {
  for (let x = TREE_CLEAR_RADIUS; x < CHUNK_SIZE - TREE_CLEAR_RADIUS; x++) {
    for (let z = TREE_CLEAR_RADIUS; z < CHUNK_SIZE - TREE_CLEAR_RADIUS; z++) {
      for (let y = 0; y < CHUNK_HEIGHT - 7; y++) {
        if (!canPlaceTree(volume, x, y, z)) {
          continue
        }
        if (!hasClearSpace(volume, x, y, z)) {
          continue
        }

        const h = hash(x, y, z, offsetX, offsetZ, seed)
        if (random01(h) >= TREE_CHANCE) {
          continue
        }

        placeTrunk(volume, x, y, z, 4)

        const shape = (h >>> 4) % 4
        if (shape === 0) {
          placeLeavesClassic(volume, x, y, z)
        } else if (shape === 1) {
          placeLeavesRound(volume, x, y, z)
        } else if (shape === 2) {
          placeLeavesPointy(volume, x, y, z)
        } else {
          placeLeavesBushy(volume, x, y, z, h)
        }
      }
    }
  }
}
