cmake_minimum_required(VERSION 3.0.0)
project(tinaxcraft)

if(EMSCRIPTEN)
  message("Using emscripten!")
else()
  message("Not using emscripten!")
endif()

# set(CMAKE_TOOLCHAIN_FILE "${CMAKE_CURRENT_SOURCE_DIR}/vcpkg/scripts/buildsystems/vcpkg.cmake"
# CACHE STRING "Vcpkg toolchain file")
# source files
file(GLOB TC_CPP src/*.cpp)
file(GLOB TC_HPP src/*.hpp)

add_custom_target(copy-files
  COMMAND ${CMAKE_COMMAND} -P ${CMAKE_CURRENT_LIST_DIR}/copy-files.cmake
)

add_executable(tinaxcraft ${TC_CPP} ${TC_HPP} gladsrc/glad.c)

set(CMAKE_CXX_FLAGS_DEBUG "-g3")

if(EMSCRIPTEN)
  set(CMAKE_EXE_LINKER_FLAGS "-s USE_GLFW=3")
else()
  add_subdirectory(glfw)
endif()

add_subdirectory(glm)

target_include_directories(tinaxcraft PRIVATE include)

target_include_directories(tinaxcraft PRIVATE PerlinNoise)
target_include_directories(tinaxcraft PRIVATE glm/glm)

add_dependencies(tinaxcraft glfw glm copy-files)

# find_package(glfw3 CONFIG REQUIRED)
target_link_libraries(tinaxcraft PRIVATE glfw)

# find_package(glm CONFIG REQUIRED)
target_link_libraries(tinaxcraft PRIVATE glm)

if(NOT EMSCRIPTEN)
  find_package(OpenGL REQUIRED)
  target_link_libraries(tinaxcraft PRIVATE OpenGL::GL)
endif()

if(EMSCRIPTEN)
  set(CMAKE_EXECUTABLE_SUFFIX ".html")
endif()
