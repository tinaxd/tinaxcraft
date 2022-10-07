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
#include "manager.h"

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#endif

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

static int64_t lastTime = 0;
static std::unique_ptr<Renderer> renderer;
static GLFWwindow *window = nullptr;
static std::shared_ptr<GameManager> mgr;

void mainloop()
{
    // do opengl stuff
    const auto nowTime = getTimeMillis();
    if (lastTime == nowTime)
    {
        return;
    }
    auto dt = static_cast<float>(nowTime - lastTime) / 1000.0;
    lastTime = nowTime;

    mgr->step(dt);

    renderer->render();
    glfwSwapBuffers(window);
    glfwPollEvents();
}

void key_callback(GLFWwindow *window, int key, int scancode, int action, int mods)
{
    if (action == GLFW_REPEAT)
        return;

    auto callback = [action](Key k)
    {
        mgr->key_update(k, action == GLFW_PRESS);
    };

    switch (key)
    {
    case GLFW_KEY_W:
        callback(Key::Forward);
        break;
    case GLFW_KEY_S:
        callback(Key::Backward);
        break;
    case GLFW_KEY_A:
        callback(Key::Left);
        break;
    case GLFW_KEY_D:
        callback(Key::Right);
        break;
    case GLFW_KEY_SPACE:
        callback(Key::Jump);
        break;
    }
}

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

    window = glfwCreateWindow(1280, 960, "tinaxcraft", nullptr, nullptr);
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

    mgr = std::make_shared<GameManager>(world);

    renderer = std::make_unique<Renderer>();
    renderer->initGL();
    renderer->setGameManager(mgr);

    auto lastTime = getTimeMillis();

    glfwSetKeyCallback(window, key_callback);

#if __EMSCRIPTEN__
    emscripten_set_main_loop(mainloop, 0, 1);
#else
    while (!glfwWindowShouldClose(window))
    {
        mainloop();
    }
#endif

    return 0;
}