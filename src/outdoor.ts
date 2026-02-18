import { RENDER_DISTANCE } from './chunk-mesh-core'

/**
 * Outdoor de anúncio de rodovia.
 * Edite o `md` abaixo com seu currículo em Markdown.
 */

const avatarUrl = `${import.meta.env.BASE_URL}avatar.png`

export const md = `
![Gabriel](${avatarUrl})

# Gabriel Botelho Malenowitch

**Full-Stack Developer | Software Engineer**
📍 Santa Catarina, Brazil | 📧 gabrielbotelhomalenowitch@gmail.com

### Profile

For me, software engineering is both a profession and a craft. When I’m not tackling corporate challenges, I apply that same drive to my personal projects: building my own SaaS from the ground up (Dontosys), managing my own server infrastructure, and constantly looking for ways to bring high performance and efficiency into my daily routine. I'm driven by logic, hard work, and the desire to build things that actually make an impact.

---

 - https://www.linkedin.com/in/gabriel-botelho-malenowitch-9a0523214
 - https://github.com/Gabriel-Malenowitch
 - https://www.youtube.com/@GabrielMalenowitch
`.trim()

// For me, software engineering is both a profession and a craft. When I’m not tackling corporate challenges, I apply that same drive to my personal projects: building my own SaaS from the ground up (Dontosys), managing my own server infrastructure, and constantly looking for ways to bring high performance and efficiency into my daily routine. I'm driven by logic, hard work, and the desire to build things that actually make an impact.
// I’m a Full-Stack Developer who genuinely loves building scalable systems and untangling complex problems. My recent experience has been deep in the fintech ecosystem, where I focus on creating and optimizing critical back-office applications. I’m the kind of engineer who steps up when the pressure is on—I’ve built a track record of rescuing critical team OKRs and contributing directly to large-scale architectural decisions, always putting the project and the team's success first.

export interface OutdoorPosition {
  x: number
  y: number
  z: number
  /** Direção que o outdoor enfrenta (radianos, 0 = +Z) */
  facing: number
}

export function getOutdoorPositions(
  seed: number,
  playerX: number,
  _playerY: number,
  playerZ: number,
  minCX: number,
  maxCX: number,
  minCZ: number,
  maxCZ: number,
  getGroundY: (x: number, z: number) => number,
): OutdoorPosition[] {
  const CHUNK_SIZE = 32
  const worldMinX = minCX * CHUNK_SIZE
  const worldMaxX = (maxCX + 1) * CHUNK_SIZE
  const worldMinZ = minCZ * CHUNK_SIZE
  const worldMaxZ = (maxCZ + 1) * CHUNK_SIZE

  const positions: OutdoorPosition[] = []

  const rng = (): number => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }

  const inFrontX = Math.floor(playerX)
  const inFrontZ = Math.floor(playerZ) - 25
  if (
    inFrontX >= worldMinX &&
    inFrontX < worldMaxX &&
    inFrontZ >= worldMinZ &&
    inFrontZ < worldMaxZ
  ) {
    const gy = getGroundY(inFrontX, inFrontZ)
    positions.push({ x: inFrontX + 0.5, y: gy, z: inFrontZ + 0.5, facing: 0 })
  }

  const RANDOM_COUNT = 1
  const maxDistSq = RENDER_DISTANCE * RENDER_DISTANCE
  for (let i = 0; i < RANDOM_COUNT; i++) {
    let attempts = 0
    while (attempts < 15) {
      attempts++
      const wx = worldMinX + 8 + rng() * (worldMaxX - worldMinX - 16)
      const wz = worldMinZ + 8 + rng() * (worldMaxZ - worldMinZ - 16)
      const dx = wx - playerX
      const dz = wz - playerZ
      if (dx * dx + dz * dz > maxDistSq) {
        continue
      }
      const gx = Math.floor(wx)
      const gz = Math.floor(wz)
      const gy = getGroundY(gx, gz)
      const facing = rng() * Math.PI * 2
      positions.push({ x: gx + 0.5, y: gy, z: gz + 0.5, facing })
      break
    }
  }

  return positions
}
