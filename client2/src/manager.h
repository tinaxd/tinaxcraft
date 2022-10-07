#pragma once

#include <glm.hpp>
#include <memory>
#include "world.h"

namespace tinaxcraft
{
    class GameManager;

    class Player
    {
    public:
        Player();

        const glm::vec3 position() const { return position_; }
        float rotX() const { return rotX_; }
        float rotY() const { return rotY_; }

        glm::vec3 lookAtVec() const;

    private:
        glm::vec3 position_;
        float rotX_;
        float rotY_;

        friend GameManager;
    };

    enum class Key : uint32_t
    {
        Forward = 1 << 0,
        Backward = 1 << 1,
        Right = 1 << 2,
        Left = 1 << 3,
        Jump = 1 << 4
    };

    class GameManager;

    struct BlockCoordGetter
    {
        virtual GlobalBlockCoord getCoordFromScreen(const GameManager &mgr, double xpos, double ypos) = 0;
    };

    class GameManager
    {
    public:
        GameManager(std::shared_ptr<World> world);

        const Player &player_view() const { return *player_; }
        const World &world_view() const { return *world_; }
        World &world() { return *world_; }

        void key_update(Key key, bool pressed);
        void cursor_update(float xpos, float ypos);
        void mouse_click(bool isPrimaryButton, bool isPressed);

        void step(float dt);

        void setScreenSize(int width, int height)
        {
            screen_width_ = width;
            screen_height_ = height;
        }

        std::tuple<int, int> getScreenSize() const
        {
            return std::make_tuple(screen_width_, screen_height_);
        }

        inline void setBlockCoordGetter(std::unique_ptr<BlockCoordGetter> getter)
        {
            coord_getter_ = std::move(getter);
        }

    private:
        std::unique_ptr<Player> player_;
        std::shared_ptr<World> world_;

        void step_player(float dt);
        void step_cursor(float dt);

        uint32_t pressed_keys_ = 0;

        float last_cursorX = 0;
        float last_cursorY = 0;
        float current_cursorX = 0;
        float current_cursorY = 0;

        int screen_width_ = 0;
        int screen_height_ = 0;

        std::unique_ptr<BlockCoordGetter> coord_getter_;
    };
} // namespace tinaxcraf
