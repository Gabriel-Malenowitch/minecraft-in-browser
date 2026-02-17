const RENDER_DISTANCE = 96

const COLORS = [
  [0.545, 0.412, 0.125],
  [0.545, 0.412, 0.125],
  [0.298, 0.686, 0.314],
  [0.427, 0.298, 0.114],
  [0.545, 0.412, 0.125],
  [0.545, 0.412, 0.125],
] as const

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

function buildMesh(
  getBlock: GetBlockFn,
  center: { x: number; y: number; z: number },
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
): { positions: Float32Array; normals: Float32Array; colors: Float32Array } {
  const { x: cx, y: cy, z: cz } = center
  const maxDistSq = RENDER_DISTANCE * RENDER_DISTANCE
  const cap = 4_000_000
  const positions = new Float32Array(cap)
  const normals = new Float32Array(cap)
  const colors = new Float32Array(cap)
  let i = 0

  for (let wy = 0; wy < 32; wy++) {
    for (let wz = minZ; wz < maxZ; wz++) {
      for (let wx = minX; wx < maxX; wx++) {
        const dx = wx + 0.5 - cx
        const dy = wy + 0.5 - cy
        const dz = wz + 0.5 - cz
        if (dx * dx + dy * dy + dz * dz > maxDistSq) continue
        if (getBlock(wx, wy, wz) === 0) continue

        for (let f = 0; f < 6; f++) {
          const [ox, oy, oz] = OFFSETS[f]
          if (getBlock(wx + ox, wy + oy, wz + oz) > 0) continue

          const face = FACES[f]
          const [a, b, c, d] = face.v
          const [nx, ny, nz] = face.n
          const [cr, cg, cb] = COLORS[f]

          const push = (v: number[]): void => {
            positions[i] = wx + v[0]
            positions[i + 1] = wy + v[1]
            positions[i + 2] = wz + v[2]
            normals[i] = nx
            normals[i + 1] = ny
            normals[i + 2] = nz
            colors[i] = cr
            colors[i + 1] = cg
            colors[i + 2] = cb
            i += 3
          }

          push(a)
          push(b)
          push(c)
          push(a)
          push(c)
          push(d)
        }
      }
    }
  }

  return {
    positions: positions.subarray(0, i),
    normals: normals.subarray(0, i),
    colors: colors.subarray(0, i),
  }
}

export function buildChunkMeshDataFromChunks(
  chunks: Record<string, Uint8Array>,
  center: { x: number; y: number; z: number },
): { positions: Float32Array; normals: Float32Array; colors: Float32Array } {
  const getBlock = (wx: number, wy: number, wz: number): number => {
    const cx = Math.floor(wx / 32)
    const cz = Math.floor(wz / 32)
    const key = `${cx}_${cz}`
    const chunk = chunks[key]
    if (!chunk) return 0
    const lx = ((wx % 32) + 32) % 32
    const lz = ((wz % 32) + 32) % 32
    const ly = Math.floor(wy)
    if (ly < 0 || ly >= 32) return 0
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
