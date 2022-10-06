#pragma once
#include "./world.h"
#include "../PerlinNoise/PerlinNoise.hpp"

namespace tinaxcraft
{
    class PerlinNoiseWorldGen : public WorldGen
    {
    public:
        PerlinNoiseWorldGen(int32_t seed);

        Chunk *generateChunk(const ChunkCoord &coord) override;

    private:
        int32_t seed_;
        siv::BasicPerlinNoise<float> noise_;

        std::vector<int32_t> generateHeight(const ChunkCoord &coord);
    };
}