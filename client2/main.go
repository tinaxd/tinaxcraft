package main

import (
	"runtime"
	"time"

	"github.com/go-gl/gl/v4.1-core/gl"
	"github.com/go-gl/glfw/v3.3/glfw"
	"github.com/tinaxd/tinaxcraft/client2/engine"
	"github.com/tinaxd/tinaxcraft/client2/renderer"
)

func init() {
	runtime.LockOSThread()
}

func initMain() (*glfw.Window, *renderer.Renderer) {
	err := glfw.Init()
	if err != nil {
		panic(err)
	}

	window, err := glfw.CreateWindow(640, 480, "Testing", nil, nil)
	if err != nil {
		panic(err)
	}

	window.MakeContextCurrent()

	// glCtx := window.GetGLXContext()

	// err = sdl.GLSetSwapInterval(1)
	// if err != nil {
	// 	panic(err)
	// }

	if err := gl.Init(); err != nil {
		panic(err)
	}

	r := renderer.NewRenderer()
	r.InitGL()

	// sdl.GLDeleteContext(glCtx)
	return window, r
}

func main() {
	window, r := initMain()
	defer glfw.Terminate()

	engine := engine.NewEngine()
	engine.SetCallbacks(window)

	lastTime := time.Now().UnixMilli()
	for !window.ShouldClose() {
		// Do OpenGL stuff.
		nowTime := time.Now().UnixMilli()
		if lastTime == nowTime {
			continue
		}
		dt := float32(nowTime-lastTime) / 1000.0
		lastTime = nowTime

		engine.Step(dt)
		// fmt.Printf("position: %v", engine.PlayerPosition())

		drawGL()
		r.Draw(engine)
		window.SwapBuffers()
		glfw.PollEvents()
	}

}

func drawGL() {
	gl.ClearColor(0, 0, 0.4, 0)
	gl.Clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
}
