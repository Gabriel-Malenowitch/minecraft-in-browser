import * as THREE from 'three'

const COLORS = {
  top: new THREE.Color(0x4caf50),
  bottom: new THREE.Color(0x6d4c1d),
  side: new THREE.Color(0x8b6914),
}

function getIndex(x: number, y: number, z: number, chunkSize: number, chunkHeight: number): number {
  return x + z * chunkSize + y * chunkSize * chunkSize
}

function isSolid(
  volume: Uint8Array,
  x: number,
  y: number,
  z: number,
  chunkSize: number,
  chunkHeight: number,
): boolean {
  if (x < 0 || x >= chunkSize || y < 0 || y >= chunkHeight || z < 0 || z >= chunkSize) {
    return false
  }
  return volume[getIndex(x, y, z, chunkSize, chunkHeight)] > 0
}

interface Face {
  vertices: number[][]
  normal: [number, number, number]
  color: THREE.Color
}

const FACES: Face[] = [
  {
    vertices: [
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
      [1, 0, 1],
    ],
    normal: [1, 0, 0],
    color: COLORS.side,
  },
  {
    vertices: [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
      [0, 0, 0],
    ],
    normal: [-1, 0, 0],
    color: COLORS.side,
  },
  {
    vertices: [
      [0, 1, 0],
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
    ],
    normal: [0, 1, 0],
    color: COLORS.top,
  },
  {
    vertices: [
      [0, 0, 1],
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
    ],
    normal: [0, -1, 0],
    color: COLORS.bottom,
  },
  {
    vertices: [
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
      [0, 0, 1],
    ],
    normal: [0, 0, 1],
    color: COLORS.side,
  },
  {
    vertices: [
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0],
    ],
    normal: [0, 0, -1],
    color: COLORS.side,
  },
]

const NEIGHBOR_OFFSETS: [number, number, number][] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
]

function addFace(
  positions: number[],
  normals: number[],
  colors: number[],
  face: Face,
  ox: number,
  oy: number,
  oz: number,
): void {
  const [a, b, c, d] = face.vertices
  const [nx, ny, nz] = face.normal
  const color = face.color

  const push = (v: number[]): void => {
    positions.push(ox + v[0], oy + v[1], oz + v[2])
    normals.push(nx, ny, nz)
    colors.push(color.r, color.g, color.b)
  }

  push(a)
  push(b)
  push(c)
  push(a)
  push(c)
  push(d)
}

/**
 * Builds a Three.js mesh from a voxel volume with face culling.
 * Only visible faces (neighbor is air) are drawn.
 */
export function buildChunkMesh(
  volume: Uint8Array,
  chunkSize: number,
  chunkHeight: number,
): THREE.Mesh {
  const positions: number[] = []
  const normals: number[] = []
  const colors: number[] = []

  for (let y = 0; y < chunkHeight; y++) {
    for (let z = 0; z < chunkSize; z++) {
      for (let x = 0; x < chunkSize; x++) {
        if (!isSolid(volume, x, y, z, chunkSize, chunkHeight)) {
          continue
        }

        for (let f = 0; f < 6; f++) {
          const [dx, dy, dz] = NEIGHBOR_OFFSETS[f]
          if (isSolid(volume, x + dx, y + dy, z + dz, chunkSize, chunkHeight)) {
            continue
          }

          addFace(positions, normals, colors, FACES[f], x, y, z)
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

  const material = new THREE.MeshLambertMaterial({
    vertexColors: true,
  })

  return new THREE.Mesh(geometry, material)
}
