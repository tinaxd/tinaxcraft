cmake_minimum_required(VERSION 3.0.0)
project (tinaxcraft)

set(CMAKE_TOOLCHAIN_FILE "${CMAKE_CURRENT_SOURCE_DIR}/vcpkg/scripts/buildsystems/vcpkg.cmake"
  CACHE STRING "Vcpkg toolchain file")

file(GLOB TC_CPP *.cpp)
file(GLOB TC_HPP *.hpp)
add_executable(tinaxcraft ${TC_CPP} ${TC_HPP} gladsrc/glad.c)

set(CMAKE_CXX_FLAGS_DEBUG "-g3")

target_include_directories(tinaxcraft PRIVATE include)

find_package(glfw3 CONFIG REQUIRED)
target_link_libraries(tinaxcraft PRIVATE glfw)

find_package(glm CONFIG REQUIRED)
target_link_libraries(tinaxcraft PRIVATE glm::glm)

find_package(OpenGL REQUIRED)
target_link_libraries(tinaxcraft PRIVATE OpenGL::GL)
