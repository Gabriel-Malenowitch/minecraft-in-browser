/**
 * Definição dos blocos da aplicação.
 * Face tiles: índice de tile no atlas. Ordem das faces: +X, -X, +Y (topo), -Y (base), +Z, -Z.
 */

import { TileId } from './texture-atlas'

export const BlockId = {
  AIR: 0,
  GRASS_BLOCK: 1,
  DIRT: 2,
  WOOD: 3,
  LEAVES: 4,
  GRASS: 5,
} as const

export type BlockIdType = (typeof BlockId)[keyof typeof BlockId]

export interface GrassPlantSchema {
  renderType: 'cross'
  width: number
  height: number
}

export interface BlockDef {
  id: BlockIdType
  name: string
  /** Tile index no atlas por face [+X, -X, +Y, -Y, +Z, -Z] */
  faceTiles: readonly number[]
  /** Subdivisões por face (ex: 4 = 2x2 quadradinhos com variação tonal). 1 = sem variação. */
  faceVariation?: number
  /** Schema para plantas (mato, flores). Só em blocos não-sólidos. */
  plant?: GrassPlantSchema
  /** Tile index for the plant cross-planes */
  plantTile?: number
}

export const BLOCKS: Record<BlockIdType, BlockDef> = {
  [BlockId.AIR]: {
    id: BlockId.AIR,
    name: 'air',
    faceTiles: [0, 0, 0, 0, 0, 0],
  },
  [BlockId.GRASS_BLOCK]: {
    id: BlockId.GRASS_BLOCK,
    name: 'grass_block',
    faceVariation: 4,
    faceTiles: [
      TileId.GRASS_SIDE, // +X
      TileId.GRASS_SIDE, // -X
      TileId.GRASS_TOP, // +Y (topo)
      TileId.DIRT, // -Y (base)
      TileId.GRASS_SIDE, // +Z
      TileId.GRASS_SIDE, // -Z
    ],
  },
  [BlockId.DIRT]: {
    id: BlockId.DIRT,
    name: 'dirt',
    faceVariation: 4,
    faceTiles: [
      TileId.DIRT,
      TileId.DIRT,
      TileId.DIRT,
      TileId.DIRT,
      TileId.DIRT,
      TileId.DIRT,
    ],
  },
  [BlockId.WOOD]: {
    id: BlockId.WOOD,
    name: 'wood',
    faceTiles: [
      TileId.WOOD,
      TileId.WOOD,
      TileId.WOOD,
      TileId.WOOD,
      TileId.WOOD,
      TileId.WOOD,
    ],
  },
  [BlockId.LEAVES]: {
    id: BlockId.LEAVES,
    name: 'leaves',
    faceTiles: [
      TileId.LEAVES,
      TileId.LEAVES,
      TileId.LEAVES,
      TileId.LEAVES,
      TileId.LEAVES,
      TileId.LEAVES,
    ],
  },
  [BlockId.GRASS]: {
    id: BlockId.GRASS,
    name: 'grass',
    faceTiles: [0, 0, 0, 0, 0, 0],
    plant: {
      renderType: 'cross',
      width: 0.8,
      height: 0.9,
    },
    plantTile: TileId.GRASS_PLANT,
  },
}

export function isSolid(blockId: BlockIdType): boolean {
  return blockId !== BlockId.AIR && blockId !== BlockId.GRASS
}

/** Returns true if the block is transparent (doesn't occlude neighbor faces). */
export function isTransparent(blockId: number): boolean {
  return blockId === BlockId.AIR || blockId === BlockId.GRASS
}

export function isRenderable(blockId: number): blockId is BlockIdType {
  return blockId in BLOCKS && blockId !== BlockId.AIR
}
