package world

import (
	"math"
	"math/rand"

	"github.com/aquilax/go-perlin"
)

// world generator using perlin noise

type PerlinChunkGenerator struct {
	seed int
}

func NewPerlinChunkGenerator(seed int) *PerlinChunkGenerator {
	return &PerlinChunkGenerator{
		seed: seed,
	}
}

type heightMap []int

func calcHeightMapIndex(x, z int) int {
	return x + z*ChunkXSize
}

func (g *PerlinChunkGenerator) generateChunkHeight(baseX, baseZ int) (heightMap, int, int) {
	source := rand.NewSource(int64(g.seed))
	p := perlin.NewPerlinRandSource(2.0, 2.0, 3, source)

	heightMap := make(heightMap, ChunkXSize*ChunkZSize)

	for z := 0; z < ChunkZSize; z++ {
		for x := 0; x < ChunkXSize; x++ {
			px := float64(baseX) + (float64(x) / float64(ChunkXSize))
			pz := float64(baseZ) + (float64(z) / float64(ChunkZSize))
			noise := p.Noise2D(px, pz)
			heightMap[calcHeightMapIndex(x, z)] = 64 + int(math.Round((noise+1.0)/2.0*16.0))
		}
	}

	return heightMap, ChunkXSize, ChunkZSize
}

func (g *PerlinChunkGenerator) GenerateChunk(baseX, baseZ int) *Chunk {
	heightMap, _, _ := g.generateChunkHeight(baseX, baseZ)
	blocks := make([]Block, ChunkXSize*ChunkYSize*ChunkZSize)
	for z := 0; z < ChunkZSize; z++ {
		for x := 0; x < ChunkXSize; x++ {
			h := heightMap[calcHeightMapIndex(x, z)]
			for y := 0; y <= h; y++ {
				blocks[CalcOffset(x, y, z)] = NewBlockFromID(1)
			}
		}
	}
	return NewChunkFromBlocks(blocks)
}
