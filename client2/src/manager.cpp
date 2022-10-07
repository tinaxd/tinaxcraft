#include "manager.h"

using namespace tinaxcraft;

Player::Player() : position_(23.f, 80.f, 28.f), rotX_(0.0f), rotY_(0.0f) {}

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

void GameManager::step(float dt)
{
    step_player(dt);
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

    player_->position_.z += forward;
    player_->position_.x += right;
}