import './style.css'
import { createRenderer } from './renderer'
import { buildChunkMesh } from './chunk-mesh'
import { mapData, CHUNK_SIZE, CHUNK_HEIGHT } from './gauss-example'

const canvas = document.getElementById('canvas') as HTMLCanvasElement

const { scene, animate } = createRenderer(canvas)

const render = (): void => {
  // Test render
  const chunkMesh = buildChunkMesh(mapData, CHUNK_SIZE, CHUNK_HEIGHT)
  scene.add(chunkMesh)

  // PROD
  // Codigo real do programa vai ser escrito aqui
}

render()
animate()
