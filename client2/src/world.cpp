#include "./world.h"

using namespace tinaxcraft;

Block::Block(BlockID id) : id_(id) {}

Chunk::Chunk(ChunkCoord coord) : coord_(coord), blocks_(SizeX * SizeY * SizeZ, Block(0)) {}

ChunkCoord Chunk::coord() const
{
    return coord_;
}

void Chunk::setBlock(const CoordInChunk &coord, Block block)
{
    blocks_.at(coord.x * SizeZ * SizeY + coord.y * SizeZ + coord.z) = block;
}

const Block &Chunk::block(const CoordInChunk &coord) const
{
    return blocks_.at(coord.x * SizeZ * SizeY + coord.y * SizeZ + coord.z);
}

World::World(std::unique_ptr<WorldGen> worldGenerator) : gen_(std::move(worldGenerator)) {}

std::optional<std::shared_ptr<Chunk>> World::getLoadedChunk(ChunkCoord coord) const
{
    // linear search
    for (const auto &c : loaded_chunks_)
    {
        if (c->coord() == coord)
        {
            return c;
        }
    }

    return {};
}

std::shared_ptr<Chunk> World::loadOrGenerateChunk(ChunkCoord coord)
{
    auto chunk = getLoadedChunk(coord);
    if (chunk.has_value())
    {
        return chunk.value();
    }

    auto newChunk = std::shared_ptr<Chunk>(gen_->generateChunk(coord));
    loaded_chunks_.push_back(newChunk);
    return newChunk;
}