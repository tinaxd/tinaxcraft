package main

import (
	"runtime"

	"github.com/go-gl/gl/v4.1-core/gl"
	"github.com/veandco/go-sdl2/sdl"
)

func init() {
	runtime.LockOSThread()
}

func initMain() (*sdl.Window, *Renderer) {
	if err := sdl.Init(sdl.INIT_EVERYTHING); err != nil {
		panic(err)
	}
	// defer sdl.Quit()

	window, err := sdl.CreateWindow("test", sdl.WINDOWPOS_UNDEFINED, sdl.WINDOWPOS_UNDEFINED,
		800, 600, sdl.WINDOW_SHOWN|sdl.WINDOW_RESIZABLE|sdl.WINDOW_OPENGL)
	if err != nil {
		panic(err)
	}
	// defer window.Destroy()

	glCtx, err := window.GLCreateContext()
	if err != nil {
		panic(err)
	}

	// err = sdl.GLSetSwapInterval(1)
	// if err != nil {
	// 	panic(err)
	// }

	if err := window.GLMakeCurrent(glCtx); err != nil {
		panic(err)
	}

	if err := sdl.GLSetSwapInterval(1); err != nil {
		panic(err)
	}

	if err := gl.Init(); err != nil {
		panic(err)
	}

	r := NewRenderer()
	r.InitGL()

	// sdl.GLDeleteContext(glCtx)
	return window, r
}

func main() {
	window, _ := initMain()

	running := true
	for running {
		for event := sdl.PollEvent(); event != nil; event = sdl.PollEvent() {
			switch event.(type) {
			case *sdl.QuitEvent:
				println("Quit")
				running = false
			}
		}
		drawGL()
		window.GLSwap()
	}
}

func drawGL() {
	gl.Clear(gl.COLOR_BUFFER_BIT)
}
