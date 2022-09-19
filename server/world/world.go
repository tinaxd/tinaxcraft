package world

const (
	ChunkXSize = 16
	ChunkYSize = 16
	ChunkZSize = 256

	GrassBlockID = 1
)

type Block struct {
	BlockID int
}

func NewBlockFromID(id int) Block {
	return Block{BlockID: id}
}

type Chunk struct {
	Blocks []Block
}

func CalcOffset(x, y, z int) int {
	return y + (x * ChunkYSize) + (z * ChunkXSize * ChunkYSize)
}

func NewChunkFromBlocks(blocks []Block) *Chunk {
	return &Chunk{Blocks: blocks}
}
