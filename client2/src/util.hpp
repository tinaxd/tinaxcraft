#pragma once

#include <cstdlib>
#include <string>
#include <iostream>
#include <chrono>
#include <cstdint>

void panic(const std::string &msg)
{
    std::cout << "panic: " << msg << std::endl;
    std::exit(1);
}

int64_t getTimeMillis()
{
    auto now = std::chrono::high_resolution_clock::now();
    auto epochtime = now.time_since_epoch();
    return std::chrono::duration_cast<std::chrono::milliseconds>(epochtime).count();
}