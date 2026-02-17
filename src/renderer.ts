import * as THREE from 'three'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'
import { meshesFromData, type ChunkMeshes } from './chunk-mesh'
import { createLighting, updateLighting, updateGrassWind } from './shaders'
import {
  buildSubChunkMeshData,
  getSubChunkCoords,
  getSubChunkRange,
  subChunkKey,
  SUB_CHUNK_SIZE,
} from './chunk-mesh-core'
import { getBlock, setBlock, chunkKey, CHUNK_SIZE, CHUNK_HEIGHT } from './world-types'
import { isSolid, BlockId, type BlockIdType } from './blocks'
import { saveWorldChunks } from './memory'
import { unpackChunk } from './chunk-packing'
import { createHUD } from './hud'
import { createBlockHighlight } from './block-highlight'
import { createPlayerHand } from './player-hand'
import { createMobileControls } from './mobile-controls'

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
const CLOUD_HEIGHT = 80
const CLOUD_OPACITY = 0.3
const CLOUD_WIND_SPEED = 0.09
const SKY_RADIUS = 280
const HORIZON_OFFSET = 20
const DAY_CYCLE_MS = 480000
const START_HOUR = 15
const SKY_DAY = 0x87ceeb
const SKY_NIGHT = 0x0a0b14
const STAR_THRESHOLD = 0.6
const SPRINT_MULTIPLIER = 1.6
const FLY_SPEED = 0.2
const GRAVITY = 0.025
const JUMP_FORCE = 0.35
const PLAYER_HEIGHT = 2
const PLAYER_WIDTH = 0.8
const BREATH_AMPLITUDE = 0.02
const BREATH_SPEED = 4.5
const DOUBLE_TAP_MS = 350

function isSolidForCollision(blockId: number): boolean {
  return isSolid(blockId as BlockIdType) && blockId !== BlockId.GRASS
}

function findGroundY(chunks: Record<string, Uint8Array>, x: number, z: number): number {
  for (let by = CHUNK_HEIGHT - 1; by >= 0; by--) {
    if (isSolidForCollision(getBlock(chunks, x, by, z))) {
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
        if (isSolidForCollision(getBlock(chunks, bx, by, bz))) {
          return true
        }
      }
    }
  }
  return false
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
  const skyColor = new THREE.Color(SKY_DAY)
  scene.background = skyColor

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

  const terrainGroup = new THREE.Group()
  const grassGroup = new THREE.Group()
  scene.add(terrainGroup)
  scene.add(grassGroup)
  const subChunkMeshes = new Map<string, ChunkMeshes>()

  const center = (): { x: number; y: number; z: number } => ({
    x: pos.x,
    y: pos.y,
    z: pos.z,
  })

  const disposeChunkMeshes = (m: ChunkMeshes): void => {
    m.terrain.geometry.dispose()
    ;(m.terrain.material as THREE.Material).dispose()
    m.grass.geometry.dispose()
    ;(m.grass.material as THREE.Material).dispose()
  }

  const chunkExistsForSubChunk = (sx: number, sz: number): boolean => {
    const cx = Math.floor((sx * SUB_CHUNK_SIZE) / CHUNK_SIZE)
    const cz = Math.floor((sz * SUB_CHUNK_SIZE) / CHUNK_SIZE)
    return !!worldChunks[chunkKey(cx, cz)]
  }

  const rebuildSubChunk = (sx: number, sy: number, sz: number): void => {
    const key = subChunkKey(sx, sy, sz)
    const old = subChunkMeshes.get(key)
    if (old) {
      terrainGroup.remove(old.terrain)
      grassGroup.remove(old.grass)
      disposeChunkMeshes(old)
    }
    const result = buildSubChunkMeshData(worldChunks, sx, sy, sz, center())
    const m = meshesFromData(result)
    subChunkMeshes.set(key, m)
    terrainGroup.add(m.terrain)
    grassGroup.add(m.grass)
  }

  const rebuildAllChunks = (): void => {
    const range = getSubChunkRange(center())
    const keysToBuild: string[] = []
    for (let sy = range.minSY; sy <= range.maxSY; sy++) {
      for (let sz = range.minSZ; sz <= range.maxSZ; sz++) {
        for (let sx = range.minSX; sx <= range.maxSX; sx++) {
          if (chunkExistsForSubChunk(sx, sz)) {
            keysToBuild.push(subChunkKey(sx, sy, sz))
          }
        }
      }
    }
    for (const key of subChunkMeshes.keys()) {
      if (!keysToBuild.includes(key)) {
        const m = subChunkMeshes.get(key)!
        terrainGroup.remove(m.terrain)
        grassGroup.remove(m.grass)
        disposeChunkMeshes(m)
        subChunkMeshes.delete(key)
      }
    }
    for (const key of keysToBuild) {
      const [sx, sy, sz] = key.split('_').map(Number)
      rebuildSubChunk(sx, sy, sz)
    }
  }

  const requestMeshRebuild = (): void => {
    if (rebuildPending) {
      return
    }
    rebuildPending = true
    requestAnimationFrame(() => {
      rebuildAllChunks()
      rebuildPending = false
    })
  }

  const getAffectedSubChunkKeys = (wx: number, wy: number, wz: number): string[] => {
    const keys = new Set<string>()
    const [sx, sy, sz] = getSubChunkCoords(wx, wy, wz)
    const neighbors: [number, number, number][] = [
      [sx, sy, sz],
      [sx - 1, sy, sz],
      [sx + 1, sy, sz],
      [sx, sy - 1, sz],
      [sx, sy + 1, sz],
      [sx, sy, sz - 1],
      [sx, sy, sz + 1],
    ]
    for (const [nsx, nsy, nsz] of neighbors) {
      if (nsy >= 0 && nsy <= 3 && chunkExistsForSubChunk(nsx, nsz)) {
        keys.add(subChunkKey(nsx, nsy, nsz))
      }
    }
    return [...keys]
  }

  const scheduleBlockEditRebuild = (wx: number, wy: number, wz: number): void => {
    const keys = getAffectedSubChunkKeys(wx, wy, wz)
    for (const key of keys) {
      const [sx, sy, sz] = key.split('_').map(Number)
      rebuildSubChunk(sx, sy, sz)
    }
  }

  rebuildAllChunks()

  worldGenWorker.onmessage = (
    e: MessageEvent<{
      newChunks: Record<string, string>
      newBounds: { minCX: number; maxCX: number; minCZ: number; maxCZ: number }
    }>,
  ) => {
    const { newChunks, newBounds } = e.data
    for (const [k, v] of Object.entries(newChunks)) {
      worldChunks[k] = unpackChunk(v)
    }
    bounds = newBounds
    saveWorldChunks(worldChunks, bounds.minCX, bounds.maxCX, bounds.minCZ, bounds.maxCZ)
    worldGenPending = false
    requestMeshRebuild()
  }

  camera.position.set(pos.x, pos.y + PLAYER_HEIGHT, pos.z)

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const lighting = createLighting(scene)
  const { sunLight } = lighting

  // ── HUD ──
  const hud = createHUD()
  document.getElementById('app')!.appendChild(hud.el)

  const euler = new THREE.Euler(0, 0, 0, 'YXZ')
  const onLookDelta = (dx: number, dy: number): void => {
    euler.setFromQuaternion(camera.quaternion)
    euler.y -= dx * 0.002
    euler.x -= dy * 0.002
    euler.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, euler.x))
    camera.quaternion.setFromEuler(euler)
  }

  const doBreak = (): void => {
    const target = blockHighlight.getTarget()
    if (!target) {
      return
    }
    const changed = setBlock(worldChunks, target.x, target.y, target.z, BlockId.AIR)
    if (!changed) {
      return
    }
    if (getBlock(worldChunks, target.x, target.y + 1, target.z) === BlockId.GRASS) {
      setBlock(worldChunks, target.x, target.y + 1, target.z, BlockId.AIR)
      scheduleBlockEditRebuild(target.x, target.y + 1, target.z)
    }
    saveWorldChunks(worldChunks, bounds.minCX, bounds.maxCX, bounds.minCZ, bounds.maxCZ)
    scheduleBlockEditRebuild(target.x, target.y, target.z)
  }

  const doPlace = (): void => {
    const target = blockHighlight.getTarget()
    if (!target) {
      return
    }
    const blockId = hud.getSelectedBlockId()
    if (blockId === null || blockId === BlockId.AIR || blockId === BlockId.GRASS) {
      return
    }
    const changed = setBlock(worldChunks, target.nx, target.ny, target.nz, blockId)
    if (!changed) {
      return
    }
    saveWorldChunks(worldChunks, bounds.minCX, bounds.maxCX, bounds.minCZ, bounds.maxCZ)
    scheduleBlockEditRebuild(target.nx, target.ny, target.nz)
  }

  const mobileControls = createMobileControls({
    onBreak: doBreak,
    onPlace: doPlace,
    onLookDelta,
  })
  document.getElementById('app')!.appendChild(mobileControls.el)

  // ── Block highlight ──
  const blockHighlight = createBlockHighlight(scene)

  // ── Player hand (attached to camera) ──
  scene.add(camera)
  const playerHand = createPlayerHand(camera)

  const sunSize = 16
  const sunGeometry = new THREE.PlaneGeometry(sunSize, sunSize)
  const sunMaterial = new THREE.MeshBasicMaterial({
    color: 0xffdd88,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const sun = new THREE.Mesh(sunGeometry, sunMaterial)
  scene.add(sun)

  const moonSize = 14
  const moonGeometry = new THREE.PlaneGeometry(moonSize, moonSize)
  const moonMaterial = new THREE.MeshBasicMaterial({
    color: 0xe8e8ff,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const moon = new THREE.Mesh(moonGeometry, moonMaterial)
  scene.add(moon)

  const STAR_COUNT = 400
  const starPositions = new Float32Array(STAR_COUNT * 3)
  for (let i = 0; i < STAR_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(Math.random() * 0.9)
    const r = 400
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    starPositions[i * 3 + 1] = r * Math.cos(phi)
    starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
  }
  const starGeometry = new THREE.BufferGeometry()
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
  const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 2,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    sizeAttenuation: true,
  })
  const stars = new THREE.Points(starGeometry, starMaterial)
  stars.name = 'stars'
  scene.add(stars)

  const cloudMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: CLOUD_OPACITY,
    side: THREE.DoubleSide,
    depthWrite: false,
  })

  function createCloud3D(cx: number, cz: number): THREE.Group {
    const group = new THREE.Group()
    const mats = [cloudMaterial.clone(), cloudMaterial.clone(), cloudMaterial.clone()]
    const boxes: [number, number, number, number, number, number][] = [
      [0, 0, 0, 16, 8, 16],
      [8, 4, 4, 12, 6, 12],
      [4, 2, 8, 10, 5, 10],
    ]
    for (let i = 0; i < boxes.length; i++) {
      const [ox, oy, oz, w, h, d] = boxes[i]
      const geo = new THREE.BoxGeometry(w, h, d)
      const mesh = new THREE.Mesh(geo, mats[i])
      mesh.position.set(ox - 8, oy, oz - 8)
      group.add(mesh)
    }
    group.position.set(cx, 0, cz)
    return group
  }

  const cloudsGroup = new THREE.Group()
  const CLOUD_COUNT = 25
  const CLOUD_HORIZON = 250
  const cloudOffsets: { x: number; z: number }[] = []
  for (let i = 0; i < CLOUD_COUNT; i++) {
    cloudOffsets.push({
      x: (Math.random() - 0.5) * 2 * CLOUD_HORIZON,
      z: (Math.random() - 0.5) * 2 * CLOUD_HORIZON,
    })
    cloudsGroup.add(createCloud3D(cloudOffsets[i].x, cloudOffsets[i].z))
  }
  cloudsGroup.renderOrder = 1
  scene.add(cloudsGroup)

  sunLight.target.position.set(0, 0, 0)
  scene.add(sunLight.target)

  const targetVec = new THREE.Vector3()
  const sunPosVec = new THREE.Vector3()
  const moonPosVec = new THREE.Vector3()

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

  // ── Block break / place ──
  canvas.addEventListener('mousedown', (e) => {
    if (!controls.isLocked) {
      return
    }
    if (e.button === 0) {
      doBreak()
    } else if (e.button === 2) {
      doPlace()
    }
  })

  const saveOnUnload = (): void => {
    saveWorldChunks(worldChunks, bounds.minCX, bounds.maxCX, bounds.minCZ, bounds.maxCZ)
  }
  window.addEventListener('beforeunload', saveOnUnload)
  window.addEventListener('pagehide', saveOnUnload)

  canvas.addEventListener('contextmenu', (e) => e.preventDefault())

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
        isSolidForCollision(
          getBlock(worldChunks, Math.floor(pos.x), blockBelowY, Math.floor(pos.z)),
        )
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

    const dayAngle =
      (performance.now() / DAY_CYCLE_MS) * Math.PI * 2 + ((START_HOUR - 6) / 12) * Math.PI
    const horizonY = pos.y + PLAYER_HEIGHT + HORIZON_OFFSET
    const sunX = pos.x + SKY_RADIUS * Math.cos(dayAngle)
    const sunY = horizonY + SKY_RADIUS * Math.sin(dayAngle)
    sun.position.set(sunX, sunY, pos.z)
    sun.lookAt(camera.position)

    const moonX = pos.x + SKY_RADIUS * Math.cos(dayAngle + Math.PI)
    const moonY = horizonY + SKY_RADIUS * Math.sin(dayAngle + Math.PI)
    moon.position.set(moonX, moonY, pos.z)
    moon.lookAt(camera.position)

    const sunHeight = Math.sin(dayAngle)
    const sunCos = Math.cos(dayAngle)
    const noonOffset =
      Math.abs(sunCos) < 0.25 ? ((0.25 - Math.abs(sunCos)) / 0.25) * 25 * Math.sign(sunCos || 1) : 0
    const lightX = sunX + noonOffset
    const lightZ = pos.z

    for (const m of subChunkMeshes.values()) {
      const grassMat = m.grass.material
      if (grassMat && !Array.isArray(grassMat)) {
        updateGrassWind(grassMat)
      }
    }

    sunPosVec.set(lightX, sunY, lightZ)
    moonPosVec.set(moonX, moonY, pos.z)
    targetVec.set(pos.x, pos.y, pos.z)
    updateLighting(lighting, sunHeight, sunPosVec, moonPosVec, targetVec)

    const darkness = Math.max(0, (1 - sunHeight) / 2)
    const skyR = (SKY_DAY >> 16) / 255
    const skyG = ((SKY_DAY >> 8) & 0xff) / 255
    const skyB = (SKY_DAY & 0xff) / 255
    const nightR = (SKY_NIGHT >> 16) / 255
    const nightG = ((SKY_NIGHT >> 8) & 0xff) / 255
    const nightB = (SKY_NIGHT & 0xff) / 255
    const r = Math.floor((skyR + (nightR - skyR) * darkness) * 255)
    const g = Math.floor((skyG + (nightG - skyG) * darkness) * 255)
    const b = Math.floor((skyB + (nightB - skyB) * darkness) * 255)
    skyColor.setRGB(r / 255, g / 255, b / 255)

    const starOpacity = Math.max(0, (darkness - STAR_THRESHOLD) / (1 - STAR_THRESHOLD))
    starMaterial.opacity = starOpacity
    stars.position.set(pos.x, pos.y + PLAYER_HEIGHT, pos.z)

    cloudsGroup.position.set(pos.x, CLOUD_HEIGHT, pos.z)
    for (let i = 0; i < CLOUD_COUNT; i++) {
      cloudOffsets[i].x += CLOUD_WIND_SPEED
      if (cloudOffsets[i].x > CLOUD_HORIZON) {
        cloudOffsets[i].x = -CLOUD_HORIZON
        cloudOffsets[i].z = (Math.random() - 0.5) * 2 * CLOUD_HORIZON
      }
      const cloud = cloudsGroup.children[i] as THREE.Group
      cloud.position.set(cloudOffsets[i].x, 0, cloudOffsets[i].z)
    }

    // ── HUD updates ──
    blockHighlight.update(camera, worldChunks)
    playerHand.update(hud.getSelectedBlockId(), performance.now())

    renderer.render(scene, camera)
  }

  return { scene, camera, controls, renderer, animate }
}
