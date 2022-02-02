import { ChunkGenerator } from './worldgen'

export class Block {
    id: number;

    constructor(id: number) {
        this.id = id;
    }

    toJSON() {
        return this.id;
    }

    static fromJSON(id: number) {
        switch (id) {
        case 0:
            return AirBlock;
        case 1:
            return GrassBlock;
        }
        return new Block(id);
    }
}

export const AirBlock = new Block(0);
export const GrassBlock = new Block(1);

export class Chunk {
    static readonly SizeX = 16;
    static readonly SizeY = 16;
    static readonly SizeZ = 256;

    blocks: Array<Block>;

    _i: number;
    _j: number;

    constructor(i: number, j: number) {
        this.blocks = new Array<Block>(Chunk.SizeX*Chunk.SizeY*Chunk.SizeZ);
        for (let i=0; i<Chunk.SizeX*Chunk.SizeY*Chunk.SizeZ; i++) {
            this.blocks[i] = AirBlock;
        }
        this._i = i;
        this._j = j;
    }

    static index(rx: number, ry: number, rz: number): number {
        return Chunk.SizeX*Chunk.SizeY*rz + Chunk.SizeX*ry + rx;
    }

    worldCoord(rx: number, ry: number, rz: number): [number, number, number] {
        return [
            this._i * Chunk.SizeX + rx,
            this._j * Chunk.SizeY + ry,
            rz
        ];
    }

    toJSON() {
        const blocks: number[] = [];
        for (let z=0; z<Chunk.SizeZ; z++) {
            for (let y=0; y<Chunk.SizeY; y++) {
                for (let x=0; x<Chunk.SizeX; x++) {
                    const block = this.blocks[Chunk.index(x, y, z)];
                    blocks.push(block.toJSON());
                }
            }
        }
        return {
            version: 1,
            chunkIndex: [this._i, this._j],
            blocks: blocks
        };
    }
}

export class World {
    private loadedChunks: Array<Chunk>;
    private chunkGen: ChunkGenerator;

    constructor(chunkGen: ChunkGenerator) {
        this.loadedChunks = [];
        this.chunkGen = chunkGen;
    }

    isChunkLoaded(cx: number, cy: number): boolean {
        for (const chunk of this.loadedChunks) {
            if (chunk._i === cx && chunk._j === cy) {
                return true;
            }
        }
        return false;
    }

    getLoadedChunk(cx: number, cy: number): Chunk | null {
        for (const chunk of this.loadedChunks) {
            if (chunk._i === cx && chunk._j === cy) {
                return chunk;
            }
        }
        return null;
    }

    getLoadedChunkOrCreate(cx: number, cy: number): Chunk {
        for (const chunk of this.loadedChunks) {
            if (chunk._i === cx && chunk._j === cy) {
                return chunk;
            }
        }
        const newChunk = this.chunkGen.generateChunk(cx, cy);
        newChunk._i = cx;
        newChunk._j = cy;
        this.loadedChunks.push(newChunk);
        console.log("new chunk created: (" + cx + ", " + cy + ")");
        return newChunk;
    }

    allLoadedChunks(): Array<Chunk> {
        return this.loadedChunks;
    }
}

export class SampleChunk extends Chunk {
    constructor(z?: number) {
        z = (z == null) ? 3 : z*z;
        super(0, 0);
        for (let i=0; i<Chunk.SizeX; i++) {
            for (let j=0; j<Chunk.SizeY; j++) {
                this.blocks[Chunk.index(i, j, z)] = GrassBlock;
            }
        }
    }
}
