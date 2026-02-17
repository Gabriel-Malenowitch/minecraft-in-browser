import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export interface RendererContext {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  renderer: THREE.WebGLRenderer
  animate: () => void
}

export function createRenderer(canvas: HTMLCanvasElement): RendererContext {
  // ── Scene ──
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x87ceeb) // Céu azul

  // ── Camera ──
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.position.set(40, 40, 40)

  // ── Renderer ──
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  // ── Lighting ──
  const ambientLight = new THREE.AmbientLight(0x8899aa, 0.4)
  scene.add(ambientLight)

  const sunLight = new THREE.DirectionalLight(0xffeedd, 0.9)
  sunLight.position.set(-600, 100, 40)
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
  sun.position.set(-600, 100, 40)
  scene.add(sun)
  sunLight.target.position.set(0, 0, 0)
  scene.add(sunLight.target)

  // ── Controls ──
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(16, 10, 16)
  controls.enableDamping = true
  controls.dampingFactor = 0.1
  controls.minDistance = 5
  controls.maxDistance = 200
  controls.update()

  // ── Resize handler ──
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  })

  // ── Animation loop ──
  const animate = (): void => {
    requestAnimationFrame(animate)
    controls.update()
    renderer.render(scene, camera)
  }

  return { scene, camera, controls, renderer, animate }
}
