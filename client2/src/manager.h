#pragma once

#include <glm.hpp>
#include <memory>
#include "world.h"

namespace tinaxcraft
{
    class Player
    {
    public:
        Player();

        const glm::vec3 position() const { return position_; }
        float rotX() const { return rotX_; }
        float rotY() const { return rotY_; }

    private:
        glm::vec3 position_;
        float rotX_;
        float rotY_;
    };

    class GameManager
    {
    public:
        GameManager(std::shared_ptr<World> world);

        const Player &player_view() const { return *player_; }
        const World &world_view() const { return *world_; }
        World &world() { return *world_; }

    private:
        std::unique_ptr<Player> player_;
        std::shared_ptr<World> world_;
    };
} // namespace tinaxcraf
