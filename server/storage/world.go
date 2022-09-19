package storage

import "github.com/tinaxd/tinaxcraft/world"

type worldBlocks struct {
	X       int `db:"x"`
	Z       int `db:"z"`
	Y       int `db:"y"`
	BlockID int `db:"block_id"`
}

func (s *Storage) WriteChunk(chunk *world.Chunk, baseX, baseZ int) error {
	tx, err := s.db.Beginx()
	if err != nil {
		return err
	}

	insertData := make([]worldBlocks, 0, len(chunk.Blocks))
	for x := 0; x < world.ChunkXSize; x++ {
		for z := 0; z < world.ChunkZSize; z++ {
			for y := 0; y < world.ChunkYSize; y++ {
				block := chunk.Blocks[world.CalcOffset(x, y, z)]
				if block.BlockID == 0 {
					// skip air blocks
					continue
				}
				insertData = append(insertData, worldBlocks{
					X:       x,
					Y:       y,
					Z:       z,
					BlockID: block.BlockID,
				})
			}
		}
	}

	// delete all blocks in chunk
	x1 := baseX * world.ChunkXSize
	x2 := x1 + world.ChunkXSize - 1
	z1 := baseZ * world.ChunkZSize
	z2 := z1 + world.ChunkZSize - 1
	if _, err := tx.Exec("DELETE FROM world_blocks WHERE x BETWEEN ? AND ? AND z BETWEEN ? AND ?", x1, x2, z1, z2); err != nil {
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
