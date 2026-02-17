import { BLOCKS, BlockId, isRenderable, isTransparent } from './blocks'
import { getTileUVs, TileId } from './texture-atlas'

const RENDER_DISTANCE = 96

const FACES: { v: number[][]; n: number[] }[] = [
  {
    v: [
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
      [1, 0, 1],
    ],
    n: [1, 0, 0],
  },
  {
    v: [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
      [0, 0, 0],
    ],
    n: [-1, 0, 0],
  },
  {
    v: [
      [0, 1, 0],
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
    ],
    n: [0, 1, 0],
  },
  {
    v: [
      [0, 0, 1],
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
    ],
    n: [0, -1, 0],
  },
  {
    v: [
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
      [0, 0, 1],
    ],
    n: [0, 0, 1],
  },
  {
    v: [
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0],
    ],
    n: [0, 0, -1],
  },
]

const OFFSETS: [number, number, number][] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
]

type GetBlockFn = (wx: number, wy: number, wz: number) => number

/* ── Mesh data containers ────────────────────────────────── */

export interface MeshData {
  positions: Float32Array
  normals: Float32Array
  uvs: Float32Array
}

export interface ChunkMeshResult {
  terrain: MeshData
  grass: MeshData
}

/* ── Build functions ─────────────────────────────────────── */

function buildGrassPlanes(w: number, h: number): { plane1: number[][]; plane2: number[][] } {
  const off = (1 - w) / 2
  return {
    plane1: [
      [off, 0, 0.5],
      [off + w, 0, 0.5],
      [off + w, h, 0.5],
      [off, h, 0.5],
    ],
    plane2: [
      [0.5, 0, off],
      [0.5, 0, off + w],
      [0.5, h, off + w],
      [0.5, h, off],
    ],
  }
}

function buildMesh(
  getBlock: GetBlockFn,
  center: { x: number; y: number; z: number },
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
): ChunkMeshResult {
  const { x: cx, y: cy, z: cz } = center
  const maxDistSq = RENDER_DISTANCE * RENDER_DISTANCE

  // Terrain buffers (positions: 3 floats, normals: 3 floats, uvs: 2 floats per vertex)
  const tCap = 4_000_000
  const tPos = new Float32Array(tCap)
  const tNor = new Float32Array(tCap)
  const tUv = new Float32Array((tCap / 3) * 2) // 2 floats per vertex
  let ti = 0
  let tui = 0

  // Grass buffers
  const gCap = 1_000_000
  const gPos = new Float32Array(gCap)
  const gNor = new Float32Array(gCap)
  const gUv = new Float32Array((gCap / 3) * 2)
  let gi = 0
  let gui = 0

  for (let wy = 0; wy < 32; wy++) {
    for (let wz = minZ; wz < maxZ; wz++) {
      for (let wx = minX; wx < maxX; wx++) {
        const dx = wx + 0.5 - cx
        const dy = wy + 0.5 - cy
        const dz = wz + 0.5 - cz
        if (dx * dx + dy * dy + dz * dz > maxDistSq) {
          continue
        }
        const blockId = getBlock(wx, wy, wz)
        if (!isRenderable(blockId)) {
          continue
        }

        const def = BLOCKS[blockId as keyof typeof BLOCKS]

        /* ── Grass plant (cross-shaped) ──────────────── */
        if (blockId === BlockId.GRASS) {
          const plant = def?.plant
          if (!plant || plant.renderType !== 'cross' || gi + 24 * 3 > gCap) {
            continue
          }

          // Height variation via hash
          const hv = ((wx * 374761393 + wz * 668265263 + wy * 2147483647) >>> 0) & 0xff
          const varH = 0.85 + (hv / 255) * 0.3
          const { plane1, plane2 } = buildGrassPlanes(plant.width, plant.height * varH)

          const tileIdx = def.plantTile ?? TileId.GRASS_PLANT
          const [u0, , u1] = getTileUVs(tileIdx)

          const pushGrass = (
            v: number[],
            nx: number,
            ny: number,
            nz: number,
            u: number,
            vv: number,
          ): void => {
            gPos[gi] = wx + v[0]
            gPos[gi + 1] = wy + v[1]
            gPos[gi + 2] = wz + v[2]
            gNor[gi] = nx
            gNor[gi + 1] = ny
            gNor[gi + 2] = nz
            gi += 3
            gUv[gui] = u
            gUv[gui + 1] = vv
            gui += 2
          }

          // Each plane: front + back (double-sided)
          // Plane verts: a(BL,y=0) b(BR,y=0) c(TR,y=h) d(TL,y=h)
          for (const { verts, nx, ny, nz } of [
            { verts: plane1, nx: 0, ny: 0, nz: 1 },
            { verts: plane2, nx: 1, ny: 0, nz: 0 },
          ]) {
            const [a, b, c, d] = verts
            // Front face: a-b-c, a-c-d
            pushGrass(a, nx, ny, nz, u0, 0)
            pushGrass(b, nx, ny, nz, u1, 0)
            pushGrass(c, nx, ny, nz, u1, 1)
            pushGrass(a, nx, ny, nz, u0, 0)
            pushGrass(c, nx, ny, nz, u1, 1)
            pushGrass(d, nx, ny, nz, u0, 1)
            // Back face (reversed winding)
            pushGrass(c, -nx, -ny, -nz, u1, 1)
            pushGrass(b, -nx, -ny, -nz, u1, 0)
            pushGrass(a, -nx, -ny, -nz, u0, 0)
            pushGrass(d, -nx, -ny, -nz, u0, 1)
            pushGrass(c, -nx, -ny, -nz, u1, 1)
            pushGrass(a, -nx, -ny, -nz, u0, 0)
          }
          continue
        }

        /* ── Solid block faces ───────────────────────── */
        const faceTiles = def?.faceTiles ?? BLOCKS[BlockId.DIRT].faceTiles

        for (let f = 0; f < 6; f++) {
          const [ox, oy, oz] = OFFSETS[f]
          const neighbor = getBlock(wx + ox, wy + oy, wz + oz)
          if (!isTransparent(neighbor)) {
            continue
          }

          if (ti + 18 > tCap) {
            continue
          }

          const face = FACES[f]
          const [a, b, c, d] = face.v
          const [nx, ny, nz] = face.n
          const tileIdx = faceTiles[f]
          const [fu0, , fu1] = getTileUVs(tileIdx)

          const pushT = (v: number[], u: number, vv: number): void => {
            tPos[ti] = wx + v[0]
            tPos[ti + 1] = wy + v[1]
            tPos[ti + 2] = wz + v[2]
            tNor[ti] = nx
            tNor[ti + 1] = ny
            tNor[ti + 2] = nz
            ti += 3
            tUv[tui] = u
            tUv[tui + 1] = vv
            tui += 2
          }

          // Face winding: a(BL) b(TL) c(TR) d(BR)
          pushT(a, fu0, 0)
          pushT(b, fu0, 1)
          pushT(c, fu1, 1)
          pushT(a, fu0, 0)
          pushT(c, fu1, 1)
          pushT(d, fu1, 0)
        }
      }
    }
  }

  return {
    terrain: {
      positions: tPos.subarray(0, ti),
      normals: tNor.subarray(0, ti),
      uvs: tUv.subarray(0, tui),
    },
    grass: {
      positions: gPos.subarray(0, gi),
      normals: gNor.subarray(0, gi),
      uvs: gUv.subarray(0, gui),
    },
  }
}

export function buildChunkMeshDataFromChunks(
  chunks: Record<string, Uint8Array>,
  center: { x: number; y: number; z: number },
): ChunkMeshResult {
  const getBlock = (wx: number, wy: number, wz: number): number => {
    const cx = Math.floor(wx / 32)
    const cz = Math.floor(wz / 32)
    const key = `${cx}_${cz}`
    const chunk = chunks[key]
    if (!chunk) {
      return 0
    }
    const lx = ((wx % 32) + 32) % 32
    const lz = ((wz % 32) + 32) % 32
    const ly = Math.floor(wy)
    if (ly < 0 || ly >= 32) {
      return 0
    }
    return chunk[lx + lz * 32 + ly * 32 * 32] ?? 0
  }
  const cx = center.x
  const cz = center.z
  const minX = (cx - RENDER_DISTANCE) | 0
  const maxX = (cx + RENDER_DISTANCE + 1) | 0
  const minZ = (cz - RENDER_DISTANCE) | 0
  const maxZ = (cz + RENDER_DISTANCE + 1) | 0
  return buildMesh(getBlock, center, minX, maxX, minZ, maxZ)
}
