import { AirBlock, Block, GrassBlock as GrassBlock } from "./world";

export type TextureInfo = {
  zneg: [number, number];
  zpos: [number, number];
  xneg: [number, number];
  xpos: [number, number];
  yneg: [number, number];
  ypos: [number, number];
};

export const defaultTexture = new Map<Block, TextureInfo>();
defaultTexture.set(GrassBlock, {
  zneg: [2, 0],
  zpos: [1, 0],
  xneg: [0, 0],
  xpos: [0, 0],
  yneg: [0, 0],
  ypos: [0, 0],
});
