#include "./renderer.h"

#include <string>
#include <fstream>
#include <sstream>
#include <vector>
#include <tuple>
#include <stdexcept>
#include <array>
#include <iostream>

#include <glm.hpp>
#include <glm/gtc/type_ptr.hpp>

using namespace tinaxcraft;

struct ShaderException : std::exception
{
    std::string message;
    ShaderException(const std::string &msg) : message(msg) {}
    const char *what() const noexcept override
    {
        return message.c_str();
    }
};

// from http://www.opengl-tutorial.org/jp/beginners-tutorials/tutorial-2-the-first-triangle/#%E3%81%99%E3%81%B9%E3%81%A6%E3%82%92%E5%90%88%E3%82%8F%E3%81%9B%E3%82%8B
static GLuint
LoadShaders(const std::string &vertex_file_path, const std::string &fragment_file_path)
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
    std::cout << "Compiling shader: " << vertex_file_path << std::endl;
    char const *VertexSourcePointer = VertexShaderCode.c_str();
    glShaderSource(VertexShaderID, 1, &VertexSourcePointer, NULL);
    glCompileShader(VertexShaderID);

    // 頂点シェーダをチェックします。
    glGetShaderiv(VertexShaderID, GL_COMPILE_STATUS, &Result);
    glGetShaderiv(VertexShaderID, GL_INFO_LOG_LENGTH, &InfoLogLength);
    std::vector<char> VertexShaderErrorMessage(InfoLogLength);
    glGetShaderInfoLog(VertexShaderID, InfoLogLength, NULL, &VertexShaderErrorMessage[0]);
    auto printVector = [](const std::vector<char> &vec)
    {
        for (const auto c : vec)
        {
            std::cout << c;
        }
        std::cout << std::endl;
    };
    printVector(VertexShaderErrorMessage);

    // フラグメントシェーダをコンパイルします。
    std::cout << "Compiling shader : " << fragment_file_path << std::endl;
    char const *FragmentSourcePointer = FragmentShaderCode.c_str();
    glShaderSource(FragmentShaderID, 1, &FragmentSourcePointer, NULL);
    glCompileShader(FragmentShaderID);

    // フラグメントシェーダをチェックします。
    glGetShaderiv(FragmentShaderID, GL_COMPILE_STATUS, &Result);
    glGetShaderiv(FragmentShaderID, GL_INFO_LOG_LENGTH, &InfoLogLength);
    std::vector<char> FragmentShaderErrorMessage(InfoLogLength);
    glGetShaderInfoLog(FragmentShaderID, InfoLogLength, NULL, &FragmentShaderErrorMessage[0]);
    printVector(FragmentShaderErrorMessage);

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
    printVector(ProgramErrorMessage);

    glDeleteShader(VertexShaderID);
    glDeleteShader(FragmentShaderID);

    return ProgramID;
}

using VertexArray = std::vector<float>;
using IndexArray = std::vector<uint32_t>;
using VertexCount = uint32_t;

std::tuple<VertexArray, IndexArray, VertexCount> generateVertexForBlock(int32_t x, int32_t y, int32_t z, uint32_t faces)
{
    // std::cout << "block " << x << " " << y << " " << z << " " << faces << std::endl;
    VertexArray vertices;
    IndexArray indices;

    VertexCount added = 0;
    auto v = [&vertices, &added, x, y, z](int x_, int y_, int z_, uint32_t normal_face)
    {
        vertices.push_back(x + x_);
        vertices.push_back(y + y_);
        vertices.push_back(z + z_);

        std::array<float, 3> normal;
        switch (normal_face)
        {
        case XNEGF:
            normal = {-1, 0, 0};
            break;
        case XPOSF:
            normal = {1, 0, 0};
            break;
        case YNEGF:
            normal = {0, -1, 0};
            break;
        case YPOSF:
            normal = {0, 1, 0};
            break;
        case ZNEGF:
            normal = {0, 0, -1};
            break;
        case ZPOSF:
            normal = {0, 0, 1};
            break;
        }

        vertices.push_back(normal[0]);
        vertices.push_back(normal[1]);
        vertices.push_back(normal[2]);

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
        v(0, 1, 1, XNEGF);
        v(0, 1, 0, XNEGF);
        v(0, 0, 0, XNEGF);
        v(0, 0, 1, XNEGF);
        addIndex();
    }

    if (faces & XPOSF)
    {
        v(1, 0, 1, XPOSF);
        v(1, 0, 0, XPOSF);
        v(1, 1, 0, XPOSF);
        v(1, 1, 1, XPOSF);
        addIndex();
    }

    if (faces & YNEGF)
    {
        v(0, 0, 1, YNEGF);
        v(0, 0, 0, YNEGF);
        v(1, 0, 0, YNEGF);
        v(1, 0, 1, YNEGF);
        addIndex();
    }

    if (faces & YPOSF)
    {
        v(1, 1, 1, YPOSF);
        v(1, 1, 0, YPOSF);
        v(0, 1, 0, YPOSF);
        v(0, 1, 1, YPOSF);
        addIndex();
    }

    if (faces & ZNEGF)
    {
        v(0, 0, 0, ZNEGF);
        v(0, 1, 0, ZNEGF);
        v(1, 1, 0, ZNEGF);
        v(1, 0, 0, ZNEGF);
        addIndex();
    }

    if (faces & ZPOSF)
    {
        v(0, 1, 1, ZPOSF);
        v(0, 0, 1, ZPOSF);
        v(1, 0, 1, ZPOSF);
        v(1, 1, 1, ZPOSF);
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

                uint32_t faces = ALL_FACES;
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
                    indices.push_back(count + index);
                }
                vertices.insert(vertices.end(), v.begin(), v.end());
                count += c;
            }
        }
    }

    // for (const auto i : indices)
    // {
    //     std::cout << i << std::endl;
    // }

    return std::make_tuple(vertices, indices, count);
}

void Renderer::initGL()
{
    glEnable(GL_DEPTH_TEST);

    GLuint vao;
    glGenVertexArrays(1, &vao);
    glBindVertexArray(vao);

    program = LoadShaders("shaders/block_vertex.glsl", "shaders/block_fragment.glsl");

    const auto numberOfBuffers = (render_distance_ * 2 + 1) * (render_distance_ * 2 + 1);

    vertexBuffers = std::vector<GLuint>(numberOfBuffers);
    glGenBuffers(numberOfBuffers, vertexBuffers.data());

    indexBuffers = std::vector<GLuint>(numberOfBuffers);
    glGenBuffers(numberOfBuffers, indexBuffers.data());

    indices_counts_ = std::vector<VertexCount>(numberOfBuffers);

    setupUniforms();
}

void Renderer::setupUniforms()
{
    const auto &program = this->program;
    glUseProgram(program);

    auto mustGetUniform = [&program](const std::string &name)
    {
        auto location = glGetUniformLocation(program, name.c_str());
        if (location == -1)
        {
            throw ShaderException("uniform " + name + " not found");
        }
        return location;
    };

    // Get a handle for our "MVP" uniform
    uniformPositions.model = mustGetUniform("model");
    uniformPositions.view = mustGetUniform("view");
    uniformPositions.projection = mustGetUniform("projection");
}

void Renderer::bufferVertices()
{
    const auto dist = render_distance_;

    const auto cx = 0;
    const auto cz = 0;

    for (int dcx = -dist; dcx <= dist; dcx++)
    {
        for (int dcz = -dist; dcz <= dist; dcz++)
        {
            const auto buffer_index = getBufferIndex(dcx, dcz);

            auto &world_ = manager_->world();
            const auto &chunk = world_.loadOrGenerateChunk(ChunkCoord(cx + dcx, cz + dcz));
            auto [vertices, indices, count] = generateVertexForChunk(*chunk);
            std::cout << std::endl
                      << "vertices " << vertices.size() << " indices " << indices.size() << " count " << count << std::endl;

            glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, indexBuffers.at(buffer_index));
            glBufferData(GL_ELEMENT_ARRAY_BUFFER, indices.size() * sizeof(GLuint), indices.data(), GL_STATIC_DRAW);

            glBindBuffer(GL_ARRAY_BUFFER, vertexBuffers.at(buffer_index));
            glBufferData(GL_ARRAY_BUFFER, vertices.size() * sizeof(float), vertices.data(), GL_STATIC_DRAW);

            indices_counts_.at(buffer_index) = indices.size();
        }
    }
}

void Renderer::drawWorld()
{
    if (!last_chunk_.has_value() || last_chunk_.value() != ChunkCoord(0, 0))
    {
        bufferVertices();
        last_chunk_ = ChunkCoord(0, 0);
    }

    const auto dist = render_distance_;

    for (int dcx = -dist; dcx <= dist; dcx++)
    {
        for (int dcz = -dist; dcz <= dist; dcz++)
        {
            size_t buffer_index = getBufferIndex(dcx, dcz);

            glEnableVertexAttribArray(0);
            glEnableVertexAttribArray(1);

            glBindBuffer(GL_ARRAY_BUFFER, vertexBuffers.at(buffer_index));
            glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, indexBuffers.at(buffer_index));

            glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, sizeof(float) * 6, nullptr);
            glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, sizeof(float) * 6, (void *)(sizeof(float) * 3));

            // translate chunk
            glm::mat4 model = glm::translate(glm::mat4(1.0f), glm::vec3(dcx * Chunk::SizeX, 0, dcz * Chunk::SizeZ));
            glUniformMatrix4fv(uniformPositions.model, 1, GL_FALSE, glm::value_ptr(model));

            // std::cout << indices_count_ << std::endl;
            glDrawElements(GL_TRIANGLES, indices_counts_.at(buffer_index), GL_UNSIGNED_INT, nullptr);

            glDisableVertexAttribArray(0);
            glDisableVertexAttribArray(1);
        }
    }
}

void Renderer::setGameManager(std::shared_ptr<GameManager> manager)
{
    manager_ = manager;
    last_chunk_ = {};
}

void Renderer::render()
{
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

    glUseProgram(program);

    const auto &player = manager_->player_view();

    auto offset = glm::vec3(0.f, 0.f, 0.f);
    const auto eye = player.position() - offset;
    const auto &lookDir = player.lookAtVec();
    const auto &lookAtVec = eye + lookDir;

    auto view = glm::lookAt(eye, lookAtVec, glm::vec3(0, 1, 0));
    auto projection = glm::perspective(glm::radians(45.0f), 4.f / 3.f, 0.1f, 100.0f);

    glUniformMatrix4fv(uniformPositions.view, 1, GL_FALSE, glm::value_ptr(view));
    glUniformMatrix4fv(uniformPositions.projection, 1, GL_FALSE, glm::value_ptr(projection));

    drawWorld();
}

size_t Renderer::getBufferIndex(int dcx, int dcz)
{
    const auto dist = render_distance_;
    return (dcx + dist) * (dist * 2 + 1) + (dcz + dist);
}