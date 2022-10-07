#include "manager.h"

using namespace tinaxcraft;

Player::Player() : position_(23.f, 80.f, 28.f), rotX_(0.0f), rotY_(0.0f) {}

GameManager::GameManager(std::shared_ptr<World> world) : player_(std::make_unique<Player>()), world_(std::move(world)) {}