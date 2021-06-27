import { Chunk, GrassBlock } from "./world"
import { Noise } from 'noisejs';

export interface ChunkGenerator {
    generateChunk(cx: number, cy: number): Chunk;
    seed(seed: number): void;
}

export class PerlinChunkGenerator implements ChunkGenerator {
    private noise: Noise;
    
    constructor(seed?: number) {
        this.noise = new Noise();
        if (seed != null) {
            this.seed(seed);
        }
    }

    private generateHeight(cx: number, cy: number): number[] {
        const heights = new Array<number>(Chunk.SizeX*Chunk.SizeY);
        for (let j=0; j<Chunk.SizeY; j++) {
            for (let i=0; i<Chunk.SizeX; i++) {
                const noise = this.noise.perlin2(cx + i / Chunk.SizeX,
                                                 cy + j / Chunk.SizeY);
                heights[Chunk.SizeX*j+i] = Math.round((noise + 1.0) / 2.0 * Chunk.SizeZ);
            }
        }
        return heights;
    }
    
    generateChunk(cx: number, cy: number): Chunk {
        const heightMap = this.generateHeight(cx, cy);
        const chunk = new Chunk(cx, cy);
        for (let j=0; j<Chunk.SizeY; j++) {
            for (let i=0; i<Chunk.SizeX; i++) {
                const k = heightMap[Chunk.SizeX*j+i];
                chunk.blocks[Chunk.index(i, j, k)] = GrassBlock;
            }
        }
        return chunk;
    }

    seed(seed: number) {
        this.noise.seed(seed);
    }
}
