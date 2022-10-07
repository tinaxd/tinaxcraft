#pragma once

#include <cstdint>
#include "world.h"
#include <glad/glad.h>
#include <memory>
#include <optional>

namespace tinaxcraft
{
    enum : uint32_t
    {
        XNEGF = 1 << 0,
        XPOSF = 1 << 1,
        YNEGF = 1 << 2,
        YPOSF = 1 << 3,
        ZNEGF = 1 << 4,
        ZPOSF = 1 << 5,
    };
    constexpr uint32_t ALL_FACES = XNEGF | XPOSF | YNEGF | YPOSF | ZNEGF | ZPOSF;

    class VertexBuffer;

    struct UniformPositions
    {
        GLint model;
        GLint view;
        GLint projection;
    };

    class Renderer
    {
    public:
        void initGL();
        void setWorld(std::shared_ptr<World> world);

        void render();

    private:
        GLuint vertexBuffer;
        GLuint indexBuffer;
        GLuint program;

        std::shared_ptr<World> world_;
        std::optional<ChunkCoord> last_chunk_;
        uint32_t indices_count_ = 0;

        void setupUniforms();

        void drawWorld();
        void bufferVertices();

        using VertexArray = std::vector<float>;
        using IndexArray = std::vector<uint32_t>;
        using VertexCount = uint32_t;

        std::tuple<VertexArray, IndexArray, VertexCount> generateVertexForChunk(const Chunk &chunk);

        UniformPositions uniformPositions;
    };
}