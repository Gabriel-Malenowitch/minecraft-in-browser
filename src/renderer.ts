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

    // ── Lighting ──
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(50, 80, 50)
    directionalLight.castShadow = true
    scene.add(directionalLight)

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
