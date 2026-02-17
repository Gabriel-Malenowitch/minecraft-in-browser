import { buildChunkMeshData } from './chunk-mesh-core'

self.onmessage = (
  e: MessageEvent<{
    volume: Uint8Array
    chunkSize: number
    chunkHeight: number
    center: { x: number; y: number; z: number }
  }>,
) => {
  const { volume, chunkSize, chunkHeight, center } = e.data
  const { positions, normals, colors } = buildChunkMeshData(volume, chunkSize, chunkHeight, center)
  self.postMessage(
    { positions, normals, colors },
    { transfer: [positions.buffer, normals.buffer, colors.buffer] },
  )
}
