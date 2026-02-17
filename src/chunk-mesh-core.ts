const RENDER_DISTANCE = 128

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

function getIndex(x: number, y: number, z: number, cs: number): number {
  return x + z * cs + y * cs * cs
}

function isSolid(v: Uint8Array, x: number, y: number, z: number, cs: number, ch: number): boolean {
  if (x < 0 || x >= cs || y < 0 || y >= ch || z < 0 || z >= cs) {
    return false
  }
  return v[getIndex(x, y, z, cs)] > 0
}

export function buildChunkMeshData(
  volume: Uint8Array,
  chunkSize: number,
  chunkHeight: number,
  center: { x: number; y: number; z: number },
): { positions: Float32Array; normals: Float32Array; colors: Float32Array } {
  const { x: cx, y: cy, z: cz } = center
  const maxDistSq = RENDER_DISTANCE * RENDER_DISTANCE
  const minX = Math.max(0, (cx - RENDER_DISTANCE) | 0)
  const maxX = Math.min(chunkSize, (cx + RENDER_DISTANCE + 1) | 0)
  const minZ = Math.max(0, (cz - RENDER_DISTANCE) | 0)
  const maxZ = Math.min(chunkSize, (cz + RENDER_DISTANCE + 1) | 0)

  const cap = 4_000_000
  const positions = new Float32Array(cap)
  const normals = new Float32Array(cap)
  const colors = new Float32Array(cap)
  let i = 0

  for (let y = 0; y < chunkHeight; y++) {
    for (let z = minZ; z < maxZ; z++) {
      for (let x = minX; x < maxX; x++) {
        const dx = x + 0.5 - cx
        const dy = y + 0.5 - cy
        const dz = z + 0.5 - cz
        if (dx * dx + dy * dy + dz * dz > maxDistSq) {
          continue
        }
        if (!isSolid(volume, x, y, z, chunkSize, chunkHeight)) {
          continue
        }

        for (let f = 0; f < 6; f++) {
          const [ox, oy, oz] = OFFSETS[f]
          if (isSolid(volume, x + ox, y + oy, z + oz, chunkSize, chunkHeight)) {
            continue
          }

          const face = FACES[f]
          const [a, b, c, d] = face.v
          const [nx, ny, nz] = face.n
          const [cr, cg, cb] = COLORS[f]

          const push = (v: number[]): void => {
            positions[i] = x + v[0]
            positions[i + 1] = y + v[1]
            positions[i + 2] = z + v[2]
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
