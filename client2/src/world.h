#pragma once

#include <cstdint>
#include <vector>
#include <memory>
#include <optional>

namespace tinaxcraft
{
    using BlockID = int32_t;

    class Block
    {
    public:
        Block(BlockID id);

        BlockID blockID() const
        {
            return id_;
        }

    private:
        BlockID id_;
    };

    struct ChunkCoord
    {
        using Type = int32_t;
        Type cx;
        Type cz;
        ChunkCoord(Type cx, Type cz) : cx(cx), cz(cz) {}
    };

    bool operator==(const ChunkCoord &c1, const ChunkCoord &c2)
    {
        return c1.cx == c2.cx && c1.cz == c2.cz;
    }

    struct CoordInChunk
    {
        using Type = int32_t;
        Type x;
        Type y;
        Type z;
        CoordInChunk(Type x, Type y, Type z) : x(x), y(y), z(z) {}
    };

    bool operator==(const CoordInChunk &c1, const CoordInChunk &c2)
    {
        return c1.x == c2.x && c1.y == c2.y && c1.z == c2.z;
    }

    class Chunk
    {
    public:
        // all blocks are initialized to air block
        Chunk(ChunkCoord coord);

        ChunkCoord coord() const;

        static const int32_t SizeX = 16;
        static const int32_t SizeY = 128;
        static const int32_t SizeZ = 16;

        void setBlock(const CoordInChunk &coord, Block block);
        const Block &block(const CoordInChunk &coord) const;

    private:
        ChunkCoord coord_;

        std::vector<Block> blocks_;
    };

    class WorldGen;

    class World
    {
    public:
        World(std::unique_ptr<WorldGen> worldGenerator);

        std::optional<std::shared_ptr<Chunk>> getLoadedChunk(ChunkCoord coord) const;
        std::shared_ptr<Chunk> loadOrGenerateChunk(ChunkCoord coord);

    private:
        std::vector<std::shared_ptr<Chunk>> loaded_chunks_;
        std::unique_ptr<WorldGen> gen_;
    };

    class WorldGen
    {
    public:
        virtual ~WorldGen() = default;

        virtual Chunk *generateChunk(const ChunkCoord &coord) = 0;
    };
}