#include "manager.h"
#include <iostream>

using namespace tinaxcraft;

Player::Player() : position_(23.f, 80.f, 28.f), rotX_(0.0f), rotY_(0.0f) {}

glm::vec3 Player::lookAtVec() const
{
    return glm::vec3(
        cos(rotY_) * sin(rotX_),
        sin(rotY_),
        cos(rotY_) * cos(rotX_));
}

GameManager::GameManager(std::shared_ptr<World> world) : player_(std::make_unique<Player>()), world_(std::move(world)) {}

void GameManager::key_update(Key key, bool pressed)
{
    if (pressed)
    {
        pressed_keys_ |= static_cast<uint32_t>(key);
    }
    else
    {
        pressed_keys_ &= ~static_cast<uint32_t>(key);
    }
}

void GameManager::mouse_click(bool isPrimaryButton, bool isPressed)
{
    std::cout << "mouse click: " << isPrimaryButton << ", " << isPressed << std::endl;
    std::cout << "at " << current_cursorX << ", " << current_cursorY << std::endl;

    if (coord_getter_)
    {
    }
    else
    {
        std::cerr << "coord_getter_ is not set" << std::endl;
    }
}

void GameManager::cursor_update(float xpos, float ypos)
{
    current_cursorX = xpos;
    current_cursorY = ypos;
}

void GameManager::step(float dt)
{
    step_player(dt);
    step_cursor(dt);
}

void GameManager::step_player(float dt)
{
    float forward = 0;
    float right = 0;

    if (pressed_keys_ & static_cast<uint32_t>(Key::Forward))
    {
        forward += 1;
    }
    if (pressed_keys_ & static_cast<uint32_t>(Key::Backward))
    {
        forward -= 1;
    }
    if (pressed_keys_ & static_cast<uint32_t>(Key::Right))
    {
        right += 1;
    }
    if (pressed_keys_ & static_cast<uint32_t>(Key::Left))
    {
        right -= 1;
    }

    if (forward == 0 && right == 0)
    {
        return;
    }

    const auto norm = std::sqrt(std::abs(forward) + std::abs(right));
    forward /= norm;
    right /= norm;

    const auto velocity = 3.f;

    forward *= velocity * dt;
    right *= velocity * dt;

    auto lookAtVec = player_->lookAtVec();
    lookAtVec.y = 0;
    lookAtVec = glm::normalize(lookAtVec);

    player_->position_.x += forward * lookAtVec.x;
    player_->position_.z += forward * lookAtVec.z;

    player_->position_.x -= right * lookAtVec.z;
    player_->position_.z += right * lookAtVec.x;
}

void GameManager::step_cursor(float dt)
{
    const auto cx = current_cursorX - last_cursorX;
    const auto cy = current_cursorY - last_cursorY;

    const auto sensitivity = 0.1f;
    player_->rotX_ -= sensitivity * dt * cx;
    player_->rotY_ -= sensitivity * dt * cy;

    last_cursorX = current_cursorX;
    last_cursorY = current_cursorY;
}