import { Block, Chunk } from "./world";
import { ChunkGenerator } from "./worldgen";

export class PersistentWorld {
    private loadedChunks: Array<Chunk>;
    private chunkGen: ChunkGenerator;
    private db: IDBDatabase;

    constructor(chunkGen: ChunkGenerator) {
        this.loadedChunks = [];
        this.chunkGen = chunkGen;
        this.db = null;
    }

    initializeStorage(): Promise<PersistentWorld> {
        return new Promise((resolve, reject) => {
            const req = window.indexedDB.open("Tinaxcraft");
            req.onsuccess = (ev) => {
                this.db = (ev.target as any).result;
                resolve(this);
            };
            req.onerror = (ev) => {
                console.log("failed to open indexedDB");
                reject("failed to open indexedDB");
            };
            req.onupgradeneeded = function(ev) {
                const db = (ev.target as any).result as IDBDatabase;

                db.createObjectStore("chunks", {keyPath: "chunkIndex"});
            }
        });
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

    getLoadedChunkOrCreate(cx: number, cy: number): Promise<Chunk> {
        for (const chunk of this.loadedChunks) {
            if (chunk._i === cx && chunk._j === cy) {
                return new Promise((resolve) => resolve(chunk));
            }
        }

        const transaction = this.db.transaction("chunks", "readonly");
        const store = transaction.objectStore("chunks");
        const storedChunkReq = store.get([cx, cy]);
        return new Promise((resolve) => {
            storedChunkReq.onsuccess = (ev) => {
                const storedChunk = storedChunkReq.result;
                if (storedChunk != undefined) {
                    // load a chunk from db
                    const loadedChunk = new Chunk(cx, cy);
                    loadedChunk.blocks = (storedChunk.blocks as number[]).map(id => {
                        return Block.fromJSON(id);
                    });
                    resolve(loadedChunk);
                } else {
                    // generate a chunk
                    const newChunk = this.chunkGen.generateChunk(cx, cy);
                    newChunk._i = cx;
                    newChunk._j = cy;
                    this.loadedChunks.push(newChunk);
                    console.log("new chunk created: (" + cx + ", " + cy + ")");
                    resolve(newChunk);
                }
            };
        });
    }

    allLoadedChunks(): Array<Chunk> {
        return this.loadedChunks;
    }

    saveAll() {
        if (this.db == null) {
            console.log("db is not initialized");
            return;
        }

        const transaction = this.db.transaction("chunks", "readwrite");
        const store = transaction.objectStore("chunks");
        for (const chunk of this.loadedChunks) {
            store.put(chunk.toJSON());
            console.log(`Chunk ${chunk._i}, ${chunk._j} stored`);
        }
        console.log("saveAll success");
    }
}
