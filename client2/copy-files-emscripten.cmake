file(GLOB TC_SHADERS ${CMAKE_CURRENT_LIST_DIR}/shaders_web/*.glsl)

# copy shaders
file(COPY ${TC_SHADERS} DESTINATION ${CMAKE_BINARY_DIR}/shaders)
