import * as THREE from 'three'
import { marked } from 'marked'
import html2canvas from 'html2canvas'
import type { OutdoorPosition } from './outdoor'

const SIGN_WIDTH = 400
const PADDING = 20
const BASE_SCALE = 0.02
const POLE_HEIGHT = 2.5
const POLE_RADIUS = 0.2

export async function createOutdoorMesh(
  md: string,
  position: OutdoorPosition,
): Promise<THREE.Group> {
  const div = document.createElement('div')
  const html = (marked.parse(md) as string).replace(/<a /g, '<a target="_blank" rel="noopener" ')
  div.innerHTML = html
  div.style.cssText = `
    position: absolute;
    left: -9999px;
    width: ${SIGN_WIDTH}px;
    padding: ${PADDING}px;
    background: #0d0d0d;
    color: #e8e8e8;
    font-family: system-ui, sans-serif;
    font-size: 13px;
    line-height: 1.45;
    border: 6px solid #2a2a2a;
  `
  div.querySelectorAll('h1').forEach((el) => {
    ;(el as HTMLElement).style.cssText = 'font-size: 20px; margin: 0 0 6px 0;'
  })
  div.querySelectorAll('h2').forEach((el) => {
    ;(el as HTMLElement).style.cssText = 'font-size: 15px; margin: 10px 0 4px 0;'
  })
  div.querySelectorAll('ul').forEach((el) => {
    ;(el as HTMLElement).style.cssText = 'margin: 4px 0; padding-left: 18px;'
  })
  div.querySelectorAll('a').forEach((el) => {
    ;(el as HTMLElement).style.cssText =
      'color: #5eb8ff; text-decoration: underline; font-weight: 500;'
  })
  div.querySelectorAll('img').forEach((el) => {
    ;(el as HTMLElement).style.cssText =
      'display: block; width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin: 0 auto 12px auto;'
  })
  document.body.appendChild(div)

  const imgs = div.querySelectorAll('img')
  if (imgs.length > 0) {
    await Promise.all(
      Array.from(imgs).map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve()
            } else {
              img.onload = () => resolve()
              img.onerror = () => resolve()
            }
          }),
      ),
    )
  }

  const canvas = await html2canvas(div, {
    backgroundColor: '#0d0d0d',
    scale: 2,
    useCORS: false,
    ignoreElements: (el) => el.id === 'canvas',
  })
  document.body.removeChild(div)

  const w = canvas.width
  const h = canvas.height
  const texture = new THREE.CanvasTexture(canvas)
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter

  const planeW = w * BASE_SCALE
  const planeH = h * BASE_SCALE

  const group = new THREE.Group()
  group.position.set(position.x, position.y, position.z)
  group.rotation.y = -position.facing

  const frameThick = 0.15
  const backing = new THREE.Mesh(
    new THREE.PlaneGeometry(planeW + frameThick * 2, planeH + frameThick * 2),
    new THREE.MeshLambertMaterial({ color: 0x1a1a1a, side: THREE.DoubleSide }),
  )
  backing.position.set(0, POLE_HEIGHT + planeH / 2, -0.05)
  group.add(backing)

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(planeW, planeH),
    new THREE.MeshLambertMaterial({
      map: texture,
      side: THREE.DoubleSide,
    }),
  )
  sign.position.set(0, POLE_HEIGHT + planeH / 2, 0)
  group.add(sign)

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(POLE_RADIUS, POLE_RADIUS * 1.2, POLE_HEIGHT, 8),
    new THREE.MeshLambertMaterial({ color: 0x333333 }),
  )
  pole.position.set(0, POLE_HEIGHT / 2, 0)
  group.add(pole)

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(POLE_RADIUS * 1.5, POLE_RADIUS * 2, 0.3, 8),
    new THREE.MeshLambertMaterial({ color: 0x444444 }),
  )
  base.position.set(0, 0.15, 0)
  group.add(base)

  return group
}
