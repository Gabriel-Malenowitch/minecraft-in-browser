import { buildChunkMeshDataFromChunks, type ChunkMeshResult } from './chunk-mesh-core'
import { unpackChunk } from './chunk-packing'

self.onmessage = (
  e: MessageEvent<{
    chunks: Record<string, string>
    center: { x: number; y: number; z: number }
  }>,
) => {
  const { chunks: packed, center } = e.data
  const unpacked: Record<string, Uint8Array> = {}
  for (const [k, v] of Object.entries(packed)) {
    unpacked[k] = unpackChunk(v)
  }
  const result: ChunkMeshResult = buildChunkMeshDataFromChunks(unpacked, center)

  self.postMessage(result, {
    transfer: [
      result.terrain.positions.buffer,
      result.terrain.normals.buffer,
      result.terrain.uvs.buffer,
      result.grass.positions.buffer,
      result.grass.normals.buffer,
      result.grass.uvs.buffer,
    ],
  })
}
