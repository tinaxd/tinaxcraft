cmake_minimum_required(VERSION 3.0.0)
project (tinaxcraft)

set(CMAKE_TOOLCHAIN_FILE "${CMAKE_CURRENT_SOURCE_DIR}/vcpkg/scripts/buildsystems/vcpkg.cmake"
  CACHE STRING "Vcpkg toolchain file")

add_executable(tinaxcraft main.cpp)

find_package(glfw3 CONFIG REQUIRED)
target_link_libraries(tinaxcraft PRIVATE glfw)
