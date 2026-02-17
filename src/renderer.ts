import * as THREE from 'three'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'
import { buildChunkMesh } from './chunk-mesh'
import { getBlock, CHUNK_SIZE, CHUNK_HEIGHT } from './world-types'
import { saveWorldChunks } from './memory'

const chunkWorker = new Worker(new URL('./chunk-worker.ts', import.meta.url), { type: 'module' })
const worldGenWorker = new Worker(new URL('./world-generator-worker.ts', import.meta.url), {
  type: 'module',
})

export interface RendererContext {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  controls: PointerLockControls
  renderer: THREE.WebGLRenderer
  animate: () => void
}

const MOVE_SPEED = 0.12
const SPRINT_MULTIPLIER = 1.6
const FLY_SPEED = 0.2
const GRAVITY = 0.025
const JUMP_FORCE = 0.35
const PLAYER_HEIGHT = 2
const PLAYER_WIDTH = 0.8
const BREATH_AMPLITUDE = 0.02
const BREATH_SPEED = 4.5
const DOUBLE_TAP_MS = 350

function findGroundY(chunks: Record<string, Uint8Array>, x: number, z: number): number {
  for (let by = CHUNK_HEIGHT - 1; by >= 0; by--) {
    if (getBlock(chunks, x, by, z) > 0) {
      return by + 1
    }
  }
  return 0
}

function checkCollision(
  chunks: Record<string, Uint8Array>,
  x: number,
  y: number,
  z: number,
): boolean {
  const half = PLAYER_WIDTH / 2
  const minX = Math.floor(x - half)
  const maxX = Math.floor(x + half)
  const minY = Math.floor(y)
  const maxY = Math.floor(y + PLAYER_HEIGHT - 0.01)
  const minZ = Math.floor(z - half)
  const maxZ = Math.floor(z + half)
  for (let by = minY; by <= maxY; by++) {
    for (let bx = minX; bx <= maxX; bx++) {
      for (let bz = minZ; bz <= maxZ; bz++) {
        if (getBlock(chunks, bx, by, bz) > 0) {
          return true
        }
      }
    }
  }
  return false
}

function packChunksForWorker(chunks: Record<string, Uint8Array>): Record<string, string> {
  const packed: Record<string, string> = {}
  for (const [k, v] of Object.entries(chunks)) {
    const len = Math.ceil(v.length / 8)
    const p = new Uint8Array(len)
    for (let i = 0; i < v.length; i++) {
      if (v[i]) {
        p[i >> 3] |= 1 << (i & 7)
      }
    }
    packed[k] = btoa(String.fromCharCode.apply(null, Array.from(p)))
  }
  return packed
}

export function createRenderer(
  canvas: HTMLCanvasElement,
  chunks: Record<string, Uint8Array>,
  minCX: number,
  maxCX: number,
  minCZ: number,
  maxCZ: number,
): RendererContext {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x87ceeb)

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

  const worldMinX = minCX * CHUNK_SIZE
  const worldMaxX = (maxCX + 1) * CHUNK_SIZE
  const worldMinZ = minCZ * CHUNK_SIZE
  const worldMaxZ = (maxCZ + 1) * CHUNK_SIZE
  const centerX = (worldMinX + worldMaxX) / 2
  const centerZ = (worldMinZ + worldMaxZ) / 2

  const groundY = findGroundY(chunks, centerX, centerZ)
  const startY = groundY + 0.01

  const pos = { x: centerX, y: startY, z: centerZ }
  const vel = { x: 0, y: 0, z: 0 }
  let grounded = false
  let flying = false
  let lastSpaceTap = 0

  const worldChunks = { ...chunks }
  let bounds = { minCX, maxCX, minCZ, maxCZ }

  const REBUILD_THRESHOLD = 32
  let lastRebuildX = pos.x
  let lastRebuildZ = pos.z
  let rebuildPending = false
  let worldGenPending = false

  let chunkMesh = buildChunkMesh(worldChunks, { x: pos.x, y: pos.y, z: pos.z })
  scene.add(chunkMesh)

  const applyMeshFromWorker = (
    positions: Float32Array,
    normals: Float32Array,
    colors: Float32Array,
  ): void => {
    scene.remove(chunkMesh)
    chunkMesh.geometry.dispose()
    ;(chunkMesh.material as THREE.Material).dispose()
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const material = new THREE.MeshLambertMaterial({ vertexColors: true })
    chunkMesh = new THREE.Mesh(geometry, material)
    chunkMesh.castShadow = true
    chunkMesh.receiveShadow = true
    scene.add(chunkMesh)
  }

  const requestMeshRebuild = (): void => {
    if (rebuildPending) {
      return
    }
    rebuildPending = true
    const packed = packChunksForWorker(worldChunks)
    chunkWorker.postMessage({
      chunks: packed,
      center: { x: pos.x, y: pos.y, z: pos.z },
    })
  }

  chunkWorker.onmessage = (
    e: MessageEvent<{ positions: Float32Array; normals: Float32Array; colors: Float32Array }>,
  ) => {
    applyMeshFromWorker(e.data.positions, e.data.normals, e.data.colors)
    rebuildPending = false
  }

  worldGenWorker.onmessage = (
    e: MessageEvent<{
      newChunks: Record<string, string>
      newBounds: { minCX: number; maxCX: number; minCZ: number; maxCZ: number }
    }>,
  ) => {
    const { newChunks, newBounds } = e.data
    for (const [k, v] of Object.entries(newChunks)) {
      const binary = atob(v)
      const packed = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        packed[i] = binary.charCodeAt(i)
      }
      const volume = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE)
      for (let i = 0; i < volume.length; i++) {
        volume[i] = (packed[i >> 3] >> (i & 7)) & 1
      }
      worldChunks[k] = volume
    }
    bounds = newBounds
    saveWorldChunks(worldChunks, bounds.minCX, bounds.maxCX, bounds.minCZ, bounds.maxCZ)
    worldGenPending = false
    requestMeshRebuild()
  }

  camera.position.set(pos.x, pos.y + PLAYER_HEIGHT, pos.z)

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const ambientLight = new THREE.AmbientLight(0x8899aa, 0.4)
  scene.add(ambientLight)

  const sunLight = new THREE.DirectionalLight(0xffeedd, 0.9)
  sunLight.position.set(-300, 100, 40)
  sunLight.castShadow = true
  sunLight.shadow.mapSize.set(1024, 1024)
  sunLight.shadow.camera.near = 0.5
  sunLight.shadow.camera.far = 300
  sunLight.shadow.camera.left = -80
  sunLight.shadow.camera.right = 80
  sunLight.shadow.camera.top = 80
  sunLight.shadow.camera.bottom = -80
  sunLight.shadow.bias = -0.0001
  scene.add(sunLight)

  const sunGeometry = new THREE.SphereGeometry(8, 32, 32)
  const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd88 })
  const sun = new THREE.Mesh(sunGeometry, sunMaterial)
  sun.position.set(-300, 100, 40)
  scene.add(sun)
  sunLight.target.position.set(0, 0, 0)
  scene.add(sunLight.target)

  const controls = new PointerLockControls(camera, canvas)
  const keys: Record<string, boolean> = {}
  const dir = new THREE.Vector3()
  const shiftHeld = (): boolean => keys.shiftleft || keys.shiftright

  canvas.addEventListener('click', () => controls.lock())

  document.addEventListener('keydown', (e) => {
    const k = e.code.toLowerCase()
    if (['keyw', 'keya', 'keys', 'keyd', 'space', 'shiftleft', 'shiftright'].includes(k)) {
      if (k === 'space') {
        if (e.repeat) {
          keys[k] = true
          e.preventDefault()
          return
        }
        const now = performance.now()
        if (now - lastSpaceTap < DOUBLE_TAP_MS) {
          flying = !flying
          vel.y = 0
          lastSpaceTap = 0
          keys.space = false
          e.preventDefault()
          return
        }
        lastSpaceTap = now
      }
      keys[k] = true
      e.preventDefault()
    }
  })
  document.addEventListener('keyup', (e) => {
    const k = e.code.toLowerCase()
    if (['keyw', 'keya', 'keys', 'keyd', 'space', 'shiftleft', 'shiftright'].includes(k)) {
      keys[k] = false
      e.preventDefault()
    }
  })

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  })

  const animate = (): void => {
    requestAnimationFrame(animate)
    controls.getDirection(dir)
    dir.y = 0
    dir.normalize()

    const moveSpeed = flying ? FLY_SPEED : shiftHeld() ? MOVE_SPEED * SPRINT_MULTIPLIER : MOVE_SPEED

    vel.x = 0
    vel.z = 0
    if (keys.keyw) {
      vel.x += dir.x
      vel.z += dir.z
    }
    if (keys.keys) {
      vel.x -= dir.x
      vel.z -= dir.z
    }
    if (keys.keya) {
      vel.x += dir.z
      vel.z -= dir.x
    }
    if (keys.keyd) {
      vel.x -= dir.z
      vel.z += dir.x
    }
    if (vel.x !== 0 || vel.z !== 0) {
      const len = Math.sqrt(vel.x * vel.x + vel.z * vel.z)
      vel.x = (vel.x / len) * moveSpeed
      vel.z = (vel.z / len) * moveSpeed
    }

    if (flying) {
      vel.y = 0
      if (keys.space) {
        vel.y += FLY_SPEED
      }
      if (shiftHeld()) {
        vel.y -= FLY_SPEED
      }
    } else {
      if (keys.space && grounded) {
        vel.y = JUMP_FORCE
        grounded = false
      }
      if (!grounded) {
        vel.y -= GRAVITY
      }
    }

    if (flying) {
      pos.x += vel.x
      pos.z += vel.z
      pos.y += vel.y
    } else {
      pos.x += vel.x
      if (checkCollision(worldChunks, pos.x, pos.y, pos.z)) {
        pos.x -= vel.x
      }

      pos.z += vel.z
      if (checkCollision(worldChunks, pos.x, pos.y, pos.z)) {
        pos.z -= vel.z
      }

      const newY = pos.y + vel.y
      if (checkCollision(worldChunks, pos.x, newY, pos.z)) {
        if (vel.y < 0) {
          const blockTop = Math.floor(newY) + 1.01
          pos.y = blockTop
          vel.y = 0
          grounded = true
        } else {
          vel.y = 0
        }
      } else {
        pos.y = newY
        grounded = false
      }

      const blockBelowY = Math.floor(pos.y - 0.01)
      if (
        blockBelowY >= 0 &&
        getBlock(worldChunks, Math.floor(pos.x), blockBelowY, Math.floor(pos.z)) > 0
      ) {
        grounded = true
        vel.y = 0
      }
    }

    const wMinX = bounds.minCX * CHUNK_SIZE
    const wMaxX = (bounds.maxCX + 1) * CHUNK_SIZE
    const wMinZ = bounds.minCZ * CHUNK_SIZE
    const wMaxZ = (bounds.maxCZ + 1) * CHUNK_SIZE

    if (
      !worldGenPending &&
      (pos.x < wMinX + 32 || pos.x > wMaxX - 32 || pos.z < wMinZ + 32 || pos.z > wMaxZ - 32)
    ) {
      worldGenPending = true
      worldGenWorker.postMessage({
        playerX: pos.x,
        playerZ: pos.z,
        minCX: bounds.minCX,
        maxCX: bounds.maxCX,
        minCZ: bounds.minCZ,
        maxCZ: bounds.maxCZ,
      })
    }

    const distMoved = Math.hypot(pos.x - lastRebuildX, pos.z - lastRebuildZ)
    if (!rebuildPending && distMoved >= REBUILD_THRESHOLD) {
      lastRebuildX = pos.x
      lastRebuildZ = pos.z
      const schedule = (): void => {
        requestMeshRebuild()
      }
      if ('requestIdleCallback' in window) {
        ;(
          window as Window & { requestIdleCallback: (cb: () => void) => number }
        ).requestIdleCallback(schedule, { timeout: 100 })
      } else {
        schedule()
      }
    }

    const breath = Math.sin(performance.now() * 0.001 * BREATH_SPEED) * BREATH_AMPLITUDE
    camera.position.set(pos.x, pos.y + PLAYER_HEIGHT + breath, pos.z)

    renderer.render(scene, camera)
  }

  return { scene, camera, controls, renderer, animate }
}
