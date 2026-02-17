import * as THREE from 'three'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'

export interface RendererContext {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  controls: PointerLockControls
  renderer: THREE.WebGLRenderer
  animate: () => void
}

const MOVE_SPEED = 0.12
const GRAVITY = 0.025
const JUMP_FORCE = 0.35
const PLAYER_HEIGHT = 2
const PLAYER_WIDTH = 0.8
const BREATH_AMPLITUDE = 0.02
const BREATH_SPEED = 6

function getIndex(x: number, y: number, z: number, chunkSize: number): number {
  return x + z * chunkSize + y * chunkSize * chunkSize
}

function isSolid(
  volume: Uint8Array,
  bx: number,
  by: number,
  bz: number,
  chunkSize: number,
  chunkHeight: number,
): boolean {
  if (bx < 0 || bx >= chunkSize || by < 0 || by >= chunkHeight || bz < 0 || bz >= chunkSize) {
    return false
  }
  return volume[getIndex(bx, by, bz, chunkSize)] > 0
}

function findGroundY(
  volume: Uint8Array,
  x: number,
  z: number,
  chunkSize: number,
  chunkHeight: number,
): number {
  const bx = Math.floor(x)
  const bz = Math.floor(z)
  if (bx < 0 || bx >= chunkSize || bz < 0 || bz >= chunkSize) {
    return 0
  }
  for (let by = chunkHeight - 1; by >= 0; by--) {
    if (isSolid(volume, bx, by, bz, chunkSize, chunkHeight)) {
      return by + 1
    }
  }
  return 0
}

function checkCollision(
  volume: Uint8Array,
  chunkSize: number,
  chunkHeight: number,
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
        if (isSolid(volume, bx, by, bz, chunkSize, chunkHeight)) {
          return true
        }
      }
    }
  }
  return false
}

export function createRenderer(
  canvas: HTMLCanvasElement,
  volume: Uint8Array,
  chunkSize: number,
  chunkHeight: number,
): RendererContext {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x87ceeb)

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
  const centerX = chunkSize / 2
  const centerZ = chunkSize / 2
  const groundY = findGroundY(volume, centerX, centerZ, chunkSize, chunkHeight)
  const startY = groundY + 0.01

  const pos = { x: centerX, y: startY, z: centerZ }
  const vel = { x: 0, y: 0, z: 0 }
  let grounded = false

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
  sunLight.shadow.mapSize.set(2048, 2048)
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

  canvas.addEventListener('click', () => controls.lock())

  document.addEventListener('keydown', (e) => {
    const k = e.code.toLowerCase()
    if (['keyw', 'keya', 'keys', 'keyd', 'space'].includes(k)) {
      keys[k] = true
      e.preventDefault()
    }
  })
  document.addEventListener('keyup', (e) => {
    const k = e.code.toLowerCase()
    if (['keyw', 'keya', 'keys', 'keyd', 'space'].includes(k)) {
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
    if (controls.isLocked) {
      controls.getDirection(dir)
      dir.y = 0
      dir.normalize()

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
        vel.x = (vel.x / len) * MOVE_SPEED
        vel.z = (vel.z / len) * MOVE_SPEED
      }

      if (keys.space && grounded) {
        vel.y = JUMP_FORCE
        grounded = false
      }

      if (!grounded) {
        vel.y -= GRAVITY
      }

      pos.x += vel.x
      if (checkCollision(volume, chunkSize, chunkHeight, pos.x, pos.y, pos.z)) {
        pos.x -= vel.x
      }

      pos.z += vel.z
      if (checkCollision(volume, chunkSize, chunkHeight, pos.x, pos.y, pos.z)) {
        pos.z -= vel.z
      }

      const newY = pos.y + vel.y
      if (checkCollision(volume, chunkSize, chunkHeight, pos.x, newY, pos.z)) {
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
        isSolid(volume, Math.floor(pos.x), blockBelowY, Math.floor(pos.z), chunkSize, chunkHeight)
      ) {
        grounded = true
        vel.y = 0
      }

      const breath = Math.sin(performance.now() * 0.001 * BREATH_SPEED) * BREATH_AMPLITUDE
      camera.position.set(pos.x, pos.y + PLAYER_HEIGHT + breath, pos.z)
    }
    renderer.render(scene, camera)
  }

  return { scene, camera, controls, renderer, animate }
}
