#include <glad/glad.h>
#define GLFW_INCLUDE_NONE
#include <GLFW/glfw3.h>

#include <iostream>

#include "util.hpp"

void drawGL();

namespace tinaxcraft
{
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

        auto *window = glfwCreateWindow(640, 480, "tinaxcraft", nullptr, nullptr);
        if (!window)
        {
            panic("failed to glfwCreateWindow");
        }

        glfwMakeContextCurrent(window);
        gladLoadGL();

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

            drawGL();
            glfwSwapBuffers(window);
            glfwPollEvents();
        }

        return 0;
    }

    void drawGL()
    {
        glClearColor(0, 0, 0.4, 0);
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    }
}
