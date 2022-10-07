#pragma once

#include <cstdint>
#include "world.h"
#include <glad/glad.h>

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

        void render();

    private:
        GLuint vertexBuffer;
        GLuint indexBuffer;
        GLuint program;

        void setupUniforms();

        void bufferVertices();

        using VertexArray = std::vector<float>;
        using IndexArray = std::vector<uint32_t>;
        using VertexCount = uint32_t;

        std::tuple<VertexArray, IndexArray, VertexCount> generateVertexForChunk(const Chunk &chunk);

        UniformPositions uniformPositions;
    };
}