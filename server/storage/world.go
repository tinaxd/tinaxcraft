package storage

import "github.com/tinaxd/tinaxcraft/world"

type worldBlocks struct {
	X       int `db:"x"`
	Y       int `db:"y"`
	Z       int `db:"z"`
	BlockID int `db:"block_id"`
}

func (s *Storage) WriteChunk(chunk *world.Chunk, baseX, baseY int) error {
	tx, err := s.db.Beginx()
	if err != nil {
		return err
	}

	insertData := make([]worldBlocks, 0, len(chunk.Blocks))
	for x := 0; x < world.ChunkXSize; x++ {
		for y := 0; y < world.ChunkYSize; y++ {
			for z := 0; z < world.ChunkZSize; z++ {
				block := chunk.Blocks[world.CalcOffset(x, y, z)]
				if block.BlockID == 0 {
					// skip air blocks
					continue
				}
				insertData = append(insertData, worldBlocks{
					X:       x,
					Z:       z,
					Y:       y,
					BlockID: block.BlockID,
				})
			}
		}
	}

	// delete all blocks in chunk
	x1 := baseX * world.ChunkXSize
	x2 := x1 + world.ChunkXSize - 1
	y1 := baseY * world.ChunkYSize
	y2 := y1 + world.ChunkYSize - 1
	if _, err := tx.Exec("DELETE FROM world_blocks WHERE x BETWEEN ? AND ? AND y BETWEEN ? AND ?", x1, x2, y1, y2); err != nil {
		return err
	}

	for _, d := range insertData {
		if _, err := tx.NamedExec("INSERT INTO world_blocks(x,y,z,block_id) VALUES(:x,:y,:z,:block_id)", d); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}
