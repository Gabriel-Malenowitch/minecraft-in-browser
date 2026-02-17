import * as THREE from 'three'

export interface LightingSetup {
  ambient: THREE.AmbientLight
  hemisphere: THREE.HemisphereLight
  sunLight: THREE.DirectionalLight
  moonLight: THREE.DirectionalLight
  sunLightBaseIntensity: number
}

export function createLighting(scene: THREE.Scene): LightingSetup {
  const ambient = new THREE.AmbientLight(0xb8d4e8, 0.5)
  scene.add(ambient)

  const hemisphere = new THREE.HemisphereLight(0x87ceeb, 0x6b8e6b, 0.45)
  scene.add(hemisphere)

  const sunLight = new THREE.DirectionalLight(0xfff5e6, 0.85)
  sunLight.castShadow = true
  sunLight.shadow.mapSize.set(1024, 1024)
  sunLight.shadow.camera.near = 0.5
  sunLight.shadow.camera.far = 400
  sunLight.shadow.camera.left = -100
  sunLight.shadow.camera.right = 100
  sunLight.shadow.camera.top = 100
  sunLight.shadow.camera.bottom = -100
  sunLight.shadow.bias = -0.001
  sunLight.shadow.normalBias = 0.06
  ;(sunLight.shadow as { radius?: number }).radius = 5
  scene.add(sunLight)

  const moonLight = new THREE.DirectionalLight(0xaaccff, 0)
  moonLight.castShadow = true
  moonLight.shadow.mapSize.set(1024, 1024)
  moonLight.shadow.camera.near = 0.5
  moonLight.shadow.camera.far = 400
  moonLight.shadow.camera.left = -100
  moonLight.shadow.camera.right = 100
  moonLight.shadow.camera.top = 100
  moonLight.shadow.camera.bottom = -100
  moonLight.shadow.bias = -0.001
  moonLight.shadow.normalBias = 0.06
  ;(moonLight.shadow as { radius?: number }).radius = 5
  scene.add(moonLight)
  moonLight.target.position.set(0, 0, 0)
  scene.add(moonLight.target)

  return {
    ambient,
    hemisphere,
    sunLight,
    moonLight,
    sunLightBaseIntensity: 0.85,
  }
}

export function updateLighting(
  setup: LightingSetup,
  sunHeight: number,
  sunPos: THREE.Vector3,
  moonPos: THREE.Vector3,
  targetPos: THREE.Vector3,
): void {
  const dayFactor = 0.5 + 0.5 * sunHeight
  const nightFactor = Math.max(0, (1 - sunHeight) / 2)

  setup.ambient.intensity = 0.25 + 0.2 * dayFactor
  setup.hemisphere.intensity = 0.22 + 0.2 * dayFactor

  const isDay = sunHeight > 0.1
  setup.sunLight.castShadow = isDay
  setup.moonLight.castShadow = !isDay

  setup.sunLight.position.copy(sunPos)
  setup.sunLight.target.position.copy(targetPos)
  setup.sunLight.target.updateMatrixWorld()
  setup.sunLight.updateMatrixWorld()
  if (setup.sunLight.castShadow) {
    setup.sunLight.shadow.updateMatrices(setup.sunLight)
  }
  setup.sunLight.intensity = Math.max(0.5, setup.sunLightBaseIntensity * (0.6 + 0.4 * sunHeight))

  setup.moonLight.position.copy(moonPos)
  setup.moonLight.target.position.copy(targetPos)
  setup.moonLight.target.updateMatrixWorld()
  setup.moonLight.updateMatrixWorld()
  if (setup.moonLight.castShadow) {
    setup.moonLight.shadow.updateMatrices(setup.moonLight)
  }
  setup.moonLight.intensity = Math.max(0, 0.35 * nightFactor)
}

export function createTerrainMaterial(map: THREE.Texture): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({
    map,
    flatShading: false,
  })
}

const GRASS_WIND_SPEED = 2.5
const GRASS_WIND_STRENGTH = 0.005

export function createGrassMaterial(map: THREE.Texture): THREE.MeshLambertMaterial {
  const mat = new THREE.MeshLambertMaterial({
    map,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
    transparent: false,
    flatShading: false,
  })
  const windTime = { value: 0 }
  mat.userData.windTime = windTime
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.grassWindTime = windTime
    shader.vertexShader = `uniform float grassWindTime;\n${shader.vertexShader}`
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      vec3 transformed = vec3(position);
      float sway = sin(grassWindTime * ${GRASS_WIND_SPEED} + position.x * 12.0 + position.z * 12.0) * position.y * ${GRASS_WIND_STRENGTH};
      transformed.x += sway * 0.5;
      transformed.z += sway * 0.5;
      `,
    )
  }
  return mat
}

export function updateGrassWind(material: THREE.Material): void {
  const windTime = (
    material as THREE.MeshLambertMaterial & { userData: { windTime?: { value: number } } }
  ).userData?.windTime
  if (windTime) {
    windTime.value = performance.now() * 0.001
  }
}
