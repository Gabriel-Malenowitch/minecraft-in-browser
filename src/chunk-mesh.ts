import * as THREE from 'three'
import { buildChunkMeshData } from './chunk-mesh-core'

export function buildChunkMesh(
  volume: Uint8Array,
  chunkSize: number,
  chunkHeight: number,
  center: { x: number; y: number; z: number },
): THREE.Mesh {
  const { positions, normals, colors } = buildChunkMeshData(volume, chunkSize, chunkHeight, center)

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.MeshLambertMaterial({ vertexColors: true })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}
