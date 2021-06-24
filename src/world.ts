export class Block {
    id: number;

    constructor(id: number) {
        this.id = id;
    }
}

export const AirBlock = new Block(0);
export const DirtBlock = new Block(1);

export class Chunk {
    static readonly SizeX = 16;
    static readonly SizeY = 16;
    static readonly SizeZ = 16;

    blocks: Array<Block>;

    baseX: number;
    baseY: number;
    baseZ: number;

    constructor(baseX: number, baseY: number, baseZ: number) {
        this.blocks = [];
        for (let i=0; i<Chunk.SizeX*Chunk.SizeY*Chunk.SizeZ; i++) {
            this.blocks.push(AirBlock);
        }
    }

    static index(rx: number, ry: number, rz: number): number {
        return Chunk.SizeX*Chunk.SizeY*rz + Chunk.SizeX*ry + rx;
    }

    worldCoord(rx: number, ry: number, rz: number): [number, number, number] {
        return [
            this.baseX * Chunk.SizeX + rx,
            this.baseY * Chunk.SizeY + ry,
            this.baseZ * Chunk.SizeZ + rz
        ];
    }
}

export class SampleChunk extends Chunk {
    constructor() {
        super(0, 0, 0);
        for (let i=0; i<Chunk.SizeX; i++) {
            for (let j=0; j<Chunk.SizeY; j++) {
                this.blocks[Chunk.index(i, j, 3)] = DirtBlock;
            }
        }
    }
}
