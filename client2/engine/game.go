package engine

import (
	"github.com/go-gl/glfw/v3.3/glfw"
	"github.com/go-gl/mathgl/mgl32"
)

type MoveBit int

const (
	MoveFowardBit MoveBit = 1
	MoveBackBit           = 1 << iota
	MoveLeftBit           = 1 << iota
	MoveRightBit          = 1 << iota
	MoveUpBit             = 1 << iota
	MoveDownBit           = 1 << iota
)

type Engine struct {
	currentMove    MoveBit
	playerPosition mgl32.Vec3
}

func NewEngine() *Engine {
	return &Engine{
		currentMove: 0,
	}
}

func (e *Engine) SetCallbacks(w *glfw.Window) {
	w.SetKeyCallback(e.keyboardCallback)
}

func (e *Engine) keyboardCallback(w *glfw.Window, key glfw.Key, scancode int, action glfw.Action, mods glfw.ModifierKey) {
	var isPress bool
	switch action {
	case glfw.Press:
		isPress = true
	case glfw.Release:
		isPress = false
	default:
		return
	}

	setKey := func(k glfw.Key, isPress bool) {
		var bit MoveBit
		switch k {
		case glfw.KeyW:
			bit = MoveFowardBit
		case glfw.KeyS:
			bit = MoveBackBit
		case glfw.KeyA:
			bit = MoveLeftBit
		case glfw.KeyD:
			bit = MoveRightBit
		case glfw.KeyLeftShift:
			bit = MoveDownBit
		default:
			return
		}

		if isPress {
			e.currentMove |= bit
		} else {
			e.currentMove &= ^bit
		}
	}

	switch key {
	case glfw.KeyW:
		setKey(key, isPress)
	case glfw.KeyS:
		setKey(key, isPress)
	case glfw.KeyA:
		setKey(key, isPress)
	case glfw.KeyD:
		setKey(key, isPress)
	case glfw.KeyLeftShift:
		setKey(key, isPress)
	default:
		return
	}
}
