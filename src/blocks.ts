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
  BIRCH_WOOD: 6,
  BIRCH_LEAVES: 7,
  SPRUCE_WOOD: 8,
  SPRUCE_LEAVES: 9,
  JUNGLE_WOOD: 10,
  JUNGLE_LEAVES: 11,
  ACACIA_WOOD: 12,
  ACACIA_LEAVES: 13,
  DARK_OAK_WOOD: 14,
  DARK_OAK_LEAVES: 15,
  CHERRY_WOOD: 16,
  CHERRY_LEAVES: 17,
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
  [BlockId.BIRCH_WOOD]: {
    id: BlockId.BIRCH_WOOD,
    name: 'birch_wood',
    faceTiles: [TileId.BIRCH_WOOD, TileId.BIRCH_WOOD, TileId.BIRCH_WOOD, TileId.BIRCH_WOOD, TileId.BIRCH_WOOD, TileId.BIRCH_WOOD],
  },
  [BlockId.BIRCH_LEAVES]: {
    id: BlockId.BIRCH_LEAVES,
    name: 'birch_leaves',
    faceTiles: [TileId.BIRCH_LEAVES, TileId.BIRCH_LEAVES, TileId.BIRCH_LEAVES, TileId.BIRCH_LEAVES, TileId.BIRCH_LEAVES, TileId.BIRCH_LEAVES],
  },
  [BlockId.SPRUCE_WOOD]: {
    id: BlockId.SPRUCE_WOOD,
    name: 'spruce_wood',
    faceTiles: [TileId.SPRUCE_WOOD, TileId.SPRUCE_WOOD, TileId.SPRUCE_WOOD, TileId.SPRUCE_WOOD, TileId.SPRUCE_WOOD, TileId.SPRUCE_WOOD],
  },
  [BlockId.SPRUCE_LEAVES]: {
    id: BlockId.SPRUCE_LEAVES,
    name: 'spruce_leaves',
    faceTiles: [TileId.SPRUCE_LEAVES, TileId.SPRUCE_LEAVES, TileId.SPRUCE_LEAVES, TileId.SPRUCE_LEAVES, TileId.SPRUCE_LEAVES, TileId.SPRUCE_LEAVES],
  },
  [BlockId.JUNGLE_WOOD]: {
    id: BlockId.JUNGLE_WOOD,
    name: 'jungle_wood',
    faceTiles: [TileId.JUNGLE_WOOD, TileId.JUNGLE_WOOD, TileId.JUNGLE_WOOD, TileId.JUNGLE_WOOD, TileId.JUNGLE_WOOD, TileId.JUNGLE_WOOD],
  },
  [BlockId.JUNGLE_LEAVES]: {
    id: BlockId.JUNGLE_LEAVES,
    name: 'jungle_leaves',
    faceTiles: [TileId.JUNGLE_LEAVES, TileId.JUNGLE_LEAVES, TileId.JUNGLE_LEAVES, TileId.JUNGLE_LEAVES, TileId.JUNGLE_LEAVES, TileId.JUNGLE_LEAVES],
  },
  [BlockId.ACACIA_WOOD]: {
    id: BlockId.ACACIA_WOOD,
    name: 'acacia_wood',
    faceTiles: [TileId.ACACIA_WOOD, TileId.ACACIA_WOOD, TileId.ACACIA_WOOD, TileId.ACACIA_WOOD, TileId.ACACIA_WOOD, TileId.ACACIA_WOOD],
  },
  [BlockId.ACACIA_LEAVES]: {
    id: BlockId.ACACIA_LEAVES,
    name: 'acacia_leaves',
    faceTiles: [TileId.ACACIA_LEAVES, TileId.ACACIA_LEAVES, TileId.ACACIA_LEAVES, TileId.ACACIA_LEAVES, TileId.ACACIA_LEAVES, TileId.ACACIA_LEAVES],
  },
  [BlockId.DARK_OAK_WOOD]: {
    id: BlockId.DARK_OAK_WOOD,
    name: 'dark_oak_wood',
    faceTiles: [TileId.DARK_OAK_WOOD, TileId.DARK_OAK_WOOD, TileId.DARK_OAK_WOOD, TileId.DARK_OAK_WOOD, TileId.DARK_OAK_WOOD, TileId.DARK_OAK_WOOD],
  },
  [BlockId.DARK_OAK_LEAVES]: {
    id: BlockId.DARK_OAK_LEAVES,
    name: 'dark_oak_leaves',
    faceTiles: [TileId.DARK_OAK_LEAVES, TileId.DARK_OAK_LEAVES, TileId.DARK_OAK_LEAVES, TileId.DARK_OAK_LEAVES, TileId.DARK_OAK_LEAVES, TileId.DARK_OAK_LEAVES],
  },
  [BlockId.CHERRY_WOOD]: {
    id: BlockId.CHERRY_WOOD,
    name: 'cherry_wood',
    faceTiles: [TileId.CHERRY_WOOD, TileId.CHERRY_WOOD, TileId.CHERRY_WOOD, TileId.CHERRY_WOOD, TileId.CHERRY_WOOD, TileId.CHERRY_WOOD],
  },
  [BlockId.CHERRY_LEAVES]: {
    id: BlockId.CHERRY_LEAVES,
    name: 'cherry_leaves',
    faceTiles: [TileId.CHERRY_LEAVES, TileId.CHERRY_LEAVES, TileId.CHERRY_LEAVES, TileId.CHERRY_LEAVES, TileId.CHERRY_LEAVES, TileId.CHERRY_LEAVES],
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
