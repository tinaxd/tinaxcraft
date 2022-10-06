#include "./renderer.h"
#include <glad/glad.h>

#include <string>
#include <fstream>
#include <sstream>
#include <vector>
#include <tuple>

using namespace tinaxcraft;

// from http://www.opengl-tutorial.org/jp/beginners-tutorials/tutorial-2-the-first-triangle/#%E3%81%99%E3%81%B9%E3%81%A6%E3%82%92%E5%90%88%E3%82%8F%E3%81%9B%E3%82%8B
static GLuint LoadShaders(const std::string &vertex_file_path, const std::string &fragment_file_path)
{

    // シェーダを作ります。
    GLuint VertexShaderID = glCreateShader(GL_VERTEX_SHADER);
    GLuint FragmentShaderID = glCreateShader(GL_FRAGMENT_SHADER);

    // ファイルから頂点シェーダのコードを読み込みます。
    std::string VertexShaderCode;
    std::ifstream VertexShaderStream(vertex_file_path, std::ios::in);
    if (VertexShaderStream.is_open())
    {
        std::stringstream sstr;
        sstr << VertexShaderStream.rdbuf();
        VertexShaderCode = sstr.str();
        VertexShaderStream.close();
    }

    // ファイルからフラグメントシェーダを読み込みます。
    std::string FragmentShaderCode;
    std::ifstream FragmentShaderStream(fragment_file_path, std::ios::in);
    if (FragmentShaderStream.is_open())
    {
        std::stringstream sstr;
        sstr << FragmentShaderStream.rdbuf();
        FragmentShaderCode = sstr.str();
        FragmentShaderStream.close();
    }

    GLint Result = GL_FALSE;
    int InfoLogLength;

    // 頂点シェーダをコンパイルします。
    printf("Compiling shader : %sn", vertex_file_path);
    char const *VertexSourcePointer = VertexShaderCode.c_str();
    glShaderSource(VertexShaderID, 1, &VertexSourcePointer, NULL);
    glCompileShader(VertexShaderID);

    // 頂点シェーダをチェックします。
    glGetShaderiv(VertexShaderID, GL_COMPILE_STATUS, &Result);
    glGetShaderiv(VertexShaderID, GL_INFO_LOG_LENGTH, &InfoLogLength);
    std::vector<char> VertexShaderErrorMessage(InfoLogLength);
    glGetShaderInfoLog(VertexShaderID, InfoLogLength, NULL, &VertexShaderErrorMessage[0]);
    fprintf(stdout, "%sn", &VertexShaderErrorMessage[0]);

    // フラグメントシェーダをコンパイルします。
    printf("Compiling shader : %sn", fragment_file_path);
    char const *FragmentSourcePointer = FragmentShaderCode.c_str();
    glShaderSource(FragmentShaderID, 1, &FragmentSourcePointer, NULL);
    glCompileShader(FragmentShaderID);

    // フラグメントシェーダをチェックします。
    glGetShaderiv(FragmentShaderID, GL_COMPILE_STATUS, &Result);
    glGetShaderiv(FragmentShaderID, GL_INFO_LOG_LENGTH, &InfoLogLength);
    std::vector<char> FragmentShaderErrorMessage(InfoLogLength);
    glGetShaderInfoLog(FragmentShaderID, InfoLogLength, NULL, &FragmentShaderErrorMessage[0]);
    fprintf(stdout, "%sn", &FragmentShaderErrorMessage[0]);

    // プログラムをリンクします。
    fprintf(stdout, "Linking programn");
    GLuint ProgramID = glCreateProgram();
    glAttachShader(ProgramID, VertexShaderID);
    glAttachShader(ProgramID, FragmentShaderID);
    glLinkProgram(ProgramID);

    // プログラムをチェックします。
    glGetProgramiv(ProgramID, GL_LINK_STATUS, &Result);
    glGetProgramiv(ProgramID, GL_INFO_LOG_LENGTH, &InfoLogLength);
    std::vector<char> ProgramErrorMessage(std::max(InfoLogLength, int(1)));
    glGetProgramInfoLog(ProgramID, InfoLogLength, NULL, &ProgramErrorMessage[0]);
    fprintf(stdout, "%sn", &ProgramErrorMessage[0]);

    glDeleteShader(VertexShaderID);
    glDeleteShader(FragmentShaderID);

    return ProgramID;
}

using VertexArray = std::vector<float>;
using IndexArray = std::vector<uint32_t>;
using VertexCount = uint32_t;

std::tuple<VertexArray, IndexArray, VertexCount> generateVertexForBlock(int32_t x, int32_t y, int32_t z, uint32_t faces)
{
    VertexArray vertices;
    IndexArray indices;

    VertexCount added = 0;
    auto v = [&vertices, &added, x, y, z](int x_, int y_, int z_)
    {
        vertices.push_back(x + x_);
        vertices.push_back(y + y_);
        vertices.push_back(z + z_);
        added++;
    };

    auto i = [&indices](int x_)
    {
        indices.push_back(x_);
    };

    auto addIndex = [&]()
    {
        auto base = added - 4;
        // 左上, 左下, 右下, 右上
        i(base);
        i(base + 1);
        i(base + 2);
        i(base + 2);
        i(base + 3);
        i(base);
    };

    if (faces & XNEGF)
    {
        v(0, 1, 1);
        v(0, 1, 0);
        v(0, 0, 0);
        v(0, 0, 1);
        addIndex();
    }

    if (faces & XPOSF)
    {
        v(1, 0, 1);
        v(1, 0, 0);
        v(1, 1, 0);
        v(1, 1, 1);
        addIndex();
    }

    if (faces & YNEGF)
    {
        v(0, 0, 1);
        v(0, 0, 0);
        v(1, 0, 0);
        v(1, 0, 1);
        addIndex();
    }

    if (faces & YPOSF)
    {
        v(1, 1, 1);
        v(1, 1, 0);
        v(0, 1, 0);
        v(0, 1, 1);
        addIndex();
    }

    if (faces & ZNEGF)
    {
        v(0, 0, 0);
        v(0, 1, 0);
        v(1, 1, 0);
        v(1, 0, 0);
        addIndex();
    }

    if (faces & ZPOSF)
    {
        v(0, 1, 1);
        v(0, 0, 1);
        v(1, 0, 1);
        v(1, 1, 1);
        addIndex();
    }

    return std::make_tuple(vertices, indices, added);
}

std::tuple<VertexArray, IndexArray, VertexCount> Renderer::generateVertexForChunk(const Chunk &chunk)
{
    VertexArray vertices;
    IndexArray indices;
    VertexCount count = 0;

    const auto exists = [&chunk](int32_t x, int32_t y, int32_t z)
    {
        if (x < 0 || y < 0 || z < 0 || x >= Chunk::SizeX || y >= Chunk::SizeY || z >= Chunk::SizeZ)
        {
            return false;
        }
        const auto &block = chunk.block(CoordInChunk(x, y, z));
        return block.blockID() != 0;
    };

    for (int32_t x = 0; x < Chunk::SizeX; x++)
    {
        for (int32_t y = 0; y < Chunk::SizeY; y++)
        {
            for (int32_t z = 0; z < Chunk::SizeZ; z++)
            {
                const auto &block = chunk.block(CoordInChunk(x, y, z));
                if (block.blockID() == 0)
                {
                    // air block
                    continue;
                }

                uint32_t faces = 0;
                if (!exists(x - 1, y, z))
                {
                    faces |= XNEGF;
                }
                if (!exists(x + 1, y, z))
                {
                    faces |= XPOSF;
                }
                if (!exists(x, y - 1, z))
                {
                    faces |= YNEGF;
                }
                if (!exists(x, y + 1, z))
                {
                    faces |= YPOSF;
                }
                if (!exists(x, y, z - 1))
                {
                    faces |= ZNEGF;
                }
                if (!exists(x, y, z + 1))
                {
                    faces |= ZPOSF;
                }

                if (faces == 0)
                {
                    continue;
                }

                auto [v, i, c] = generateVertexForBlock(x, y, z, faces);
                for (auto index : i)
                {
                    indices.push_back(c + index);
                }
                vertices.insert(vertices.end(), v.begin(), v.end());
                count += c;
            }
        }
    }

    return std::make_tuple(vertices, indices, count);
}

void Renderer::initGL()
{
    GLuint vao;
    glGenVertexArrays(1, &vao);
    glBindVertexArray(vao);

    program = LoadShaders("shaders/block_vertex.glsl", "shaders/block_fragment.glsl");

    glGenBuffers(1, &vertexBuffer);
    glBindBuffer(GL_ARRAY_BUFFER, vertexBuffer);
}

void Renderer::bufferVertices()
{
    auto [vertices, indices, count] = generateVertexForBlock(0, 0, 0, ALL_FACES);
    glBindBuffer(GL_ARRAY_BUFFER, vertexBuffer);
    glBufferData(GL_ARRAY_BUFFER, vertices.size() * sizeof(float), vertices.data(), GL_STATIC_DRAW);

    glEnableVertexAttribArray(0);
    glBindBuffer(GL_ARRAY_BUFFER, vertexBuffer);
    glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 0, nullptr);

    glDrawArrays(GL_TRIANGLES, 0, count);

    glDisableVertexAttribArray(0);
}

void Renderer::render()
{
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

    glUseProgram(program);
    bufferVertices();
}