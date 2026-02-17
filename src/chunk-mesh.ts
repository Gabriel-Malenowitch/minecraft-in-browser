import * as THREE from 'three'
import { buildChunkMeshDataFromChunks, type ChunkMeshResult, type MeshData } from './chunk-mesh-core'
import { buildAtlasCanvas } from './texture-atlas'
import { createTerrainMaterial, createGrassMaterial } from './shaders'

let atlasTexture: THREE.CanvasTexture | null = null

function getAtlasTexture(): THREE.CanvasTexture {
  if (atlasTexture) return atlasTexture
  const atlas = buildAtlasCanvas()
  atlasTexture = new THREE.CanvasTexture(atlas.canvas as HTMLCanvasElement)
  atlasTexture.magFilter = THREE.NearestFilter
  atlasTexture.minFilter = THREE.NearestFilter
  atlasTexture.wrapS = THREE.ClampToEdgeWrapping
  atlasTexture.wrapT = THREE.ClampToEdgeWrapping
  atlasTexture.colorSpace = THREE.SRGBColorSpace
  return atlasTexture
}

function buildGeometry(data: MeshData): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(data.positions, 3))
  geo.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2))
  return geo
}

/* ── Public API ──────────────────────────────────────────── */

export interface ChunkMeshes {
  terrain: THREE.Mesh
  grass: THREE.Mesh
}

export function buildChunkMesh(
  chunks: Record<string, Uint8Array>,
  center: { x: number; y: number; z: number },
): ChunkMeshes {
  const result = buildChunkMeshDataFromChunks(chunks, center)
  return meshesFromData(result)
}

export function meshesFromData(result: ChunkMeshResult): ChunkMeshes {
  const atlas = getAtlasTexture()
  const terrainGeo = buildGeometry(result.terrain)
  const terrainMat = createTerrainMaterial(atlas)
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat)
  terrainMesh.castShadow = true
  terrainMesh.receiveShadow = true

  const grassGeo = buildGeometry(result.grass)
  const grassMat = createGrassMaterial(atlas)
  const grassMesh = new THREE.Mesh(grassGeo, grassMat)
  grassMesh.receiveShadow = true

  return { terrain: terrainMesh, grass: grassMesh }
}
