#ifdef __EMSCRIPTEN__
#include <GL/gl.h>
#define GLFW_INCLUDE_ES3
#else
#include <glad/glad.h>
#define GLFW_INCLUDE_NONE
#endif
#include <GLFW/glfw3.h>

#include <iostream>

#include "util.hpp"
#include "renderer.h"
#include "world.h"
#include "worldgen.h"

void drawGL();

namespace tinaxcraft
{
    void drawGL();

    void drawGL()
    {
        glClearColor(0, 0, 0.4, 0);
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    }
}

using namespace tinaxcraft;

int main()
{
    if (!glfwInit())
    {
        panic("failed to glfwInit");
    }

    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
    glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GL_TRUE);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);

    auto *window = glfwCreateWindow(1280, 960, "tinaxcraft", nullptr, nullptr);
    if (!window)
    {
        panic("failed to glfwCreateWindow");
    }

    glfwMakeContextCurrent(window);
#ifndef __EMSCRIPTEN__
    gladLoadGL();
#endif

    auto worldGen = std::make_unique<PerlinNoiseWorldGen>(0);
    auto world = std::make_shared<World>(std::move(worldGen));

    auto renderer = std::make_unique<Renderer>();
    renderer->initGL();
    renderer->setWorld(world);

    auto lastTime = getTimeMillis();
    while (!glfwWindowShouldClose(window))
    {
        // do opengl stuff
        const auto nowTime = getTimeMillis();
        if (lastTime == nowTime)
        {
            continue;
        }
        auto dt = static_cast<float>(nowTime - lastTime) / 1000.0;
        lastTime = nowTime;

        renderer->render();
        glfwSwapBuffers(window);
        glfwPollEvents();
    }

    return 0;
}