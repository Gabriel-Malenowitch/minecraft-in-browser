import { CHUNK_SIZE, CHUNK_HEIGHT } from './world-types'
import { BlockId } from './blocks'
import { DEFAULT_TERRAIN_SEED } from './terrain-params'

export const TREE_CHANCE = 0.07
const WORLD_TREE_CHANCE = 0.05
const BASE_CLEAR_RADIUS = 4

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
  if (y < 1) {
    return false
  }
  return (
    volume[getIndex(x, y, z)] === BlockId.GRASS_BLOCK &&
    volume[getIndex(x, y - 1, z)] === BlockId.DIRT &&
    (volume[getIndex(x, y + 1, z)] === BlockId.AIR ||
      volume[getIndex(x, y + 1, z)] === BlockId.GRASS)
  )
}

interface TreeType {
  woodId: number
  leavesId: number
  minHeight: number
  maxHeight: number
  clearRadius: number
  /** 2 = dark oak 2x2 trunk */
  trunkWidth: number
}

const TREE_TYPES: TreeType[] = [
  {
    woodId: BlockId.WOOD,
    leavesId: BlockId.LEAVES,
    minHeight: 4,
    maxHeight: 6,
    clearRadius: BASE_CLEAR_RADIUS,
    trunkWidth: 1,
  },
  {
    woodId: BlockId.BIRCH_WOOD,
    leavesId: BlockId.BIRCH_LEAVES,
    minHeight: 5,
    maxHeight: 7,
    clearRadius: BASE_CLEAR_RADIUS,
    trunkWidth: 1,
  },
  {
    woodId: BlockId.SPRUCE_WOOD,
    leavesId: BlockId.SPRUCE_LEAVES,
    minHeight: 6,
    maxHeight: 9,
    clearRadius: BASE_CLEAR_RADIUS,
    trunkWidth: 1,
  },
  {
    woodId: BlockId.JUNGLE_WOOD,
    leavesId: BlockId.JUNGLE_LEAVES,
    minHeight: 8,
    maxHeight: 11,
    clearRadius: BASE_CLEAR_RADIUS + 1,
    trunkWidth: 1,
  },
  {
    woodId: BlockId.ACACIA_WOOD,
    leavesId: BlockId.ACACIA_LEAVES,
    minHeight: 6,
    maxHeight: 8,
    clearRadius: BASE_CLEAR_RADIUS,
    trunkWidth: 1,
  },
  {
    woodId: BlockId.DARK_OAK_WOOD,
    leavesId: BlockId.DARK_OAK_LEAVES,
    minHeight: 5,
    maxHeight: 6,
    clearRadius: 6,
    trunkWidth: 2,
  },
  {
    woodId: BlockId.CHERRY_WOOD,
    leavesId: BlockId.CHERRY_LEAVES,
    minHeight: 5,
    maxHeight: 7,
    clearRadius: BASE_CLEAR_RADIUS,
    trunkWidth: 1,
  },
  {
    woodId: BlockId.SPRUCE_WOOD,
    leavesId: BlockId.SPRUCE_LEAVES,
    minHeight: 20,
    maxHeight: 26,
    clearRadius: 7,
    trunkWidth: 3,
  },
]

function hasClearSpace(
  volume: Uint8Array,
  x: number,
  y: number,
  z: number,
  tree: TreeType,
): boolean {
  const r = tree.clearRadius
  const maxH = tree.maxHeight + 6
  for (let dx = -r; dx <= r + tree.trunkWidth - 1; dx++) {
    for (let dz = -r; dz <= r + tree.trunkWidth - 1; dz++) {
      for (let dy = 1; dy <= maxH; dy++) {
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

function placeTrunk(
  volume: Uint8Array,
  x: number,
  y: number,
  z: number,
  height: number,
  woodId: number,
  width: number,
): void {
  for (let dy = 1; dy <= height; dy++) {
    for (let dw = 0; dw < width; dw++) {
      for (let dz = 0; dz < width; dz++) {
        const bx = x + dw
        const bz = z + dz
        if (bx >= 0 && bx < CHUNK_SIZE && bz >= 0 && bz < CHUNK_SIZE) {
          volume[getIndex(bx, y + dy, bz)] = woodId
        }
      }
    }
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
  leavesId: number,
  trunkHeight: number,
  trunkWidth: number,
): void {
  const bx = x + dx
  const bz = z + dz
  const by = y + dy
  if (bx < 0 || bx >= CHUNK_SIZE || bz < 0 || bz >= CHUNK_SIZE || by >= CHUNK_HEIGHT) {
    return
  }
  if (dx >= 0 && dx < trunkWidth && dz >= 0 && dz < trunkWidth && dy >= 1 && dy <= trunkHeight) {
    return
  }
  volume[getIndex(bx, by, bz)] = leavesId
}

function placeLeavesOak(
  volume: Uint8Array,
  x: number,
  y: number,
  z: number,
  leavesId: number,
  trunkH: number,
  trunkW: number,
): void {
  for (let dy = 3; dy <= 6; dy++) {
    const r = dy <= 5 ? 2 : 0
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        setLeaf(volume, x, y, z, dx, dy, dz, leavesId, trunkH, trunkW)
      }
    }
  }
}

function placeLeavesBirch(
  volume: Uint8Array,
  x: number,
  y: number,
  z: number,
  leavesId: number,
  trunkH: number,
  trunkW: number,
): void {
  for (let dy = 4; dy <= 7; dy++) {
    const r = dy <= 6 ? 1 : 0
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        setLeaf(volume, x, y, z, dx, dy, dz, leavesId, trunkH, trunkW)
      }
    }
  }
}

function placeLeavesSpruce(
  volume: Uint8Array,
  x: number,
  y: number,
  z: number,
  leavesId: number,
  trunkH: number,
  trunkW: number,
): void {
  for (let dy = 2; dy <= 8; dy++) {
    const layer = dy - 2
    const r = layer <= 2 ? 2 : layer <= 5 ? 1 : 0
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        setLeaf(volume, x, y, z, dx, dy, dz, leavesId, trunkH, trunkW)
      }
    }
  }
}

function placeLeavesJungle(
  volume: Uint8Array,
  x: number,
  y: number,
  z: number,
  leavesId: number,
  trunkH: number,
  trunkW: number,
): void {
  for (let dy = 6; dy <= 12; dy++) {
    const r = dy <= 8 ? 3 : dy <= 10 ? 2 : 1
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        setLeaf(volume, x, y, z, dx, dy, dz, leavesId, trunkH, trunkW)
      }
    }
  }
}

function placeLeavesAcacia(
  volume: Uint8Array,
  x: number,
  y: number,
  z: number,
  leavesId: number,
  trunkH: number,
  trunkW: number,
): void {
  for (let dy = 5; dy <= 8; dy++) {
    const r = dy <= 6 ? 2 : 1
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        setLeaf(volume, x, y, z, dx, dy, dz, leavesId, trunkH, trunkW)
      }
    }
  }
}

function placeLeavesDarkOak(
  volume: Uint8Array,
  x: number,
  y: number,
  z: number,
  leavesId: number,
  trunkH: number,
  trunkW: number,
): void {
  for (let dy = 3; dy <= 7; dy++) {
    const r = dy <= 5 ? 3 : dy === 6 ? 2 : 1
    for (let dx = -r; dx <= r + 1; dx++) {
      for (let dz = -r; dz <= r + 1; dz++) {
        setLeaf(volume, x, y, z, dx, dy, dz, leavesId, trunkH, trunkW)
      }
    }
  }
}

function placeLeavesCherry(
  volume: Uint8Array,
  x: number,
  y: number,
  z: number,
  leavesId: number,
  trunkH: number,
  trunkW: number,
): void {
  for (let dy = 3; dy <= 7; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        const dist = dx * dx + dz * dz + (dy - 5) * (dy - 5)
        if (dist <= 8 || (dy === 7 && Math.abs(dx) <= 1 && Math.abs(dz) <= 1)) {
          setLeaf(volume, x, y, z, dx, dy, dz, leavesId, trunkH, trunkW)
        }
      }
    }
  }
}

function placeLeavesWorldTree(
  volume: Uint8Array,
  x: number,
  y: number,
  z: number,
  leavesId: number,
  trunkH: number,
  trunkW: number,
): void {
  const base = trunkH - 8
  for (let dy = base; dy <= trunkH + 6; dy++) {
    const layer = dy - base
    const r = layer <= 4 ? 6 : layer <= 8 ? 5 : layer <= 12 ? 4 : layer <= 16 ? 3 : 2
    for (let dx = -r; dx <= r + trunkW - 1; dx++) {
      for (let dz = -r; dz <= r + trunkW - 1; dz++) {
        setLeaf(volume, x, y, z, dx, dy, dz, leavesId, trunkH, trunkW)
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
  for (let x = BASE_CLEAR_RADIUS; x < CHUNK_SIZE - BASE_CLEAR_RADIUS; x++) {
    for (let z = BASE_CLEAR_RADIUS; z < CHUNK_SIZE - BASE_CLEAR_RADIUS; z++) {
      for (let y = 0; y < CHUNK_HEIGHT - 12; y++) {
        if (!canPlaceTree(volume, x, y, z)) {
          continue
        }

        const h = hash(x, y, z, offsetX, offsetZ, seed)
        const isWorldTree = random01(h) < WORLD_TREE_CHANCE
        const typeIdx = isWorldTree ? TREE_TYPES.length - 1 : (h >>> 8) % (TREE_TYPES.length - 1)
        const tree = TREE_TYPES[typeIdx]

        if (!isWorldTree && random01(h >>> 4) >= TREE_CHANCE) {
          continue
        }

        if (isWorldTree && (x < 8 || x > 23 || z < 8 || z > 23)) {
          continue
        }

        if (!hasClearSpace(volume, x, y, z, tree)) {
          continue
        }

        const heightRange = tree.maxHeight - tree.minHeight + 1
        const height = tree.minHeight + ((h >>> 16) % heightRange)

        placeTrunk(volume, x, y, z, height, tree.woodId, tree.trunkWidth)

        switch (typeIdx) {
          case 0:
            placeLeavesOak(volume, x, y, z, tree.leavesId, height, tree.trunkWidth)
            break
          case 1:
            placeLeavesBirch(volume, x, y, z, tree.leavesId, height, tree.trunkWidth)
            break
          case 2:
            placeLeavesSpruce(volume, x, y, z, tree.leavesId, height, tree.trunkWidth)
            break
          case 3:
            placeLeavesJungle(volume, x, y, z, tree.leavesId, height, tree.trunkWidth)
            break
          case 4:
            placeLeavesAcacia(volume, x, y, z, tree.leavesId, height, tree.trunkWidth)
            break
          case 5:
            placeLeavesDarkOak(volume, x, y, z, tree.leavesId, height, tree.trunkWidth)
            break
          case 6:
            placeLeavesCherry(volume, x, y, z, tree.leavesId, height, tree.trunkWidth)
            break
          case 7:
            placeLeavesWorldTree(volume, x, y, z, tree.leavesId, height, tree.trunkWidth)
            break
          default:
            placeLeavesOak(volume, x, y, z, tree.leavesId, height, tree.trunkWidth)
        }
      }
    }
  }
}
