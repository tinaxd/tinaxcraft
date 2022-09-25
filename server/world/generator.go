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

func calcHeightMapIndex(x, y int) int {
	return x + y*ChunkXSize
}

func (g *PerlinChunkGenerator) generateChunkHeight(baseX, baseY int) (heightMap, int, int) {
	source := rand.NewSource(int64(g.seed))
	p := perlin.NewPerlinRandSource(2.0, 2.0, 3, source)

	heightMap := make(heightMap, ChunkXSize*ChunkYSize)

	for y := 0; y < ChunkYSize; y++ {
		for x := 0; x < ChunkXSize; x++ {
			px := float64(baseX) + (float64(x) / float64(ChunkXSize))
			py := float64(baseY) + (float64(y) / float64(ChunkYSize))
			noise := p.Noise2D(px, py)
			heightMap[calcHeightMapIndex(x, y)] = 64 + int(math.Round((noise+1.0)/2.0*16.0))
		}
	}

	return heightMap, ChunkXSize, ChunkYSize
}

func (g *PerlinChunkGenerator) GenerateChunk(baseX, baseY int) *Chunk {
	heightMap, _, _ := g.generateChunkHeight(baseX, baseY)
	blocks := make([]Block, ChunkXSize*ChunkZSize*ChunkYSize)
	for y := 0; y < ChunkYSize; y++ {
		for x := 0; x < ChunkXSize; x++ {
			h := heightMap[calcHeightMapIndex(x, y)]
			for z := 0; z <= h; z++ {
				blocks[CalcOffset(x, y, z)] = NewBlockFromID(1)
			}
		}
	}
	return NewChunkFromBlocks(blocks)
}
