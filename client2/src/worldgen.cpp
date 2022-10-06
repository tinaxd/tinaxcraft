#include "./worldgen.h"
#include "../PerlinNoise/PerlinNoise.hpp"

using namespace tinaxcraft;

PerlinNoiseWorldGen::PerlinNoiseWorldGen(int32_t seed) : seed_(seed), noise_(seed)
{
}

Chunk *PerlinNoiseWorldGen::generateChunk(const ChunkCoord &coord)
{
    const auto &heightMap = generateHeight(coord);

    auto *c = new Chunk(coord);

    for (int32_t x = 0; x < Chunk::SizeX; x++)
    {
        for (int32_t z = 0; z < Chunk::SizeZ; z++)
        {
            const auto &height = heightMap.at(x * Chunk::SizeZ + z);
            for (int32_t y = 0; y <= height; y++)
            {
                // set to dirt block
                c->setBlock(CoordInChunk(x, y, z), Block(1));
            }
        }
    }

    return c;
}

std::vector<int32_t> PerlinNoiseWorldGen::generateHeight(const ChunkCoord &coord)
{
    const auto SizeX = Chunk::SizeX;
    const auto SizeZ = Chunk::SizeZ;
    std::vector<int32_t> heights(SizeX * SizeZ);

    for (int i = 0; i < SizeX; i++)
    {
        for (int j = 0; j < SizeZ; j++)
        {
            const auto noise = noise_.noise2D_01(coord.cx + ((float)i / SizeX), coord.cz + ((float)j / SizeZ));
            heights.at(i * SizeZ + j) = 64 + static_cast<int32_t>(noise * 16.0);
        }
    }

    return heights;
}