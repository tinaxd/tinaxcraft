package engine

import (
	"math"

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

type cameraAngle struct {
	Vertial    float32
	Horizontal float32
}

type mouseMotion struct {
	Dx    float64
	Dy    float64
	LastX float64
	LastY float64
}

type Engine struct {
	currentMove MoveBit

	playerPosition mgl32.Vec3
	camera         cameraAngle

	cursorDs mouseMotion
}

func NewEngine() *Engine {
	return &Engine{
		currentMove:    0,
		playerPosition: mgl32.Vec3{4, 4, 3},
	}
}

func (e *Engine) SetCallbacks(w *glfw.Window) {
	w.SetKeyCallback(e.keyboardCallback)
	w.SetCursorPosCallback(e.cursorCallback)
}

func (e *Engine) PlayerPosition() mgl32.Vec3 {
	return e.playerPosition
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

	// log.Printf("key callback: %v %v", key, action)

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

func (e *Engine) cursorCallback(w *glfw.Window, xpos float64, ypos float64) {
	e.cursorDs.Dx = xpos - e.cursorDs.LastX
	e.cursorDs.Dy = ypos - e.cursorDs.LastY
	e.cursorDs.LastX = xpos
	e.cursorDs.LastY = ypos
}

func (e *Engine) Step(dt float32) {
	e.processMove(dt)
}

func (e *Engine) processMove(dt float32) {
	move := e.currentMove
	dp := mgl32.Vec3{0, 0, 0}

	lookAtVec := mgl32.Vec3{1, 0, 0}

	if move&MoveFowardBit != 0 {
		dp[0] += lookAtVec[0]
		dp[1] += lookAtVec[1]
	}
	if move&MoveBackBit != 0 {
		dp[0] -= lookAtVec[0]
		dp[1] -= lookAtVec[1]
	}
	if move&MoveLeftBit != 0 {
		dp[0] -= lookAtVec[1]
		dp[1] += lookAtVec[0]
	}
	if move&MoveRightBit != 0 {
		dp[0] += lookAtVec[1]
		dp[1] -= lookAtVec[0]
	}

	if dp.Len() != 0 {
		dp = dp.Normalize()
		speed := float32(1.0)
		e.playerPosition = e.playerPosition.Add(dp.Mul(dt * speed))
	}
}

func (e *Engine) getLookAtVec() mgl32.Vec3 {
	x := e.camera.Horizontal
	y := e.camera.Vertial
	return mgl32.Vec3{
		float32(math.Cos(float64(x))) * float32(math.Cos(float64(y))),
		float32(math.Sin(float64(x))) * float32(math.Cos(float64(y))),
		float32(math.Sin(float64(y))),
	}.Normalize()
}

func clampInPi(a float32) float32 {
	if a > math.Pi {
		return a - 2*math.Pi
	} else if a < -math.Pi {
		return a + 2*math.Pi
	}
	return a
}

func limitByPiOver2(a float32) float32 {
	if a >= math.Pi/2 {
		return math.Pi/2 - 0.001
	} else if a <= -math.Pi/2 {
		return -math.Pi/2 + 0.001
	}
	return a
}

func (c *cameraAngle) ClampAngle() {
	c.Horizontal = clampInPi(c.Horizontal)
	c.Vertial = limitByPiOver2(c.Vertial)
}
