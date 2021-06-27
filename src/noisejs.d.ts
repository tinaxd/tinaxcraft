declare module 'noisejs' {
    export class Noise {
        seed(seed: number): void;

        simplex2(xin: number, yin: number): number;
        simplex3(xin: number, yin: number, zin: number): number;
        perlin2(x: number, y: number): number;
        perlin3(x: number, y: number, z: number): number;
    }
}