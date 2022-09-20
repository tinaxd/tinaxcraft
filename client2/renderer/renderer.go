package renderer

import (
	"bufio"
	"image"
	"image/png"
	"log"
	"os"

	"github.com/go-gl/gl/v4.1-core/gl"
	"github.com/go-gl/mathgl/mgl32"
)

type vertexBuffer struct {
	ID        uint32
	NVertices int
}

type Renderer struct {
	sizeChunksX, sizeChunksY int

	chunkIsDirty  []bool
	vertexBuffers []vertexBuffer

	worldAttribs  worldAttribs
	worldUniforms worldUniforms
}

func NewRenderer() *Renderer {
	return &Renderer{
		sizeChunksX: 2,
		sizeChunksY: 2,
	}
}

func (r *Renderer) InitGL() {
	var vertexArrayID uint32
	gl.GenVertexArrays(1, &vertexArrayID)
	gl.BindVertexArray(vertexArrayID)

	// gl.Enable(gl.CULL_FACE)
	gl.Enable(gl.DEPTH_TEST)

	nChunks := (r.sizeChunksX*2 + 1) * (r.sizeChunksY*2 + 1)

	r.chunkIsDirty = make([]bool, nChunks)

	// Load programs
	prog := mustCompileShader("assets/shader/world_vertex.glsl", "assets/shader/world_fragment.glsl")
	gl.UseProgram(prog)

	// Vertex buffers
	r.vertexBuffers = make([]vertexBuffer, nChunks)
	vbs := make([]uint32, nChunks)
	gl.CreateBuffers(int32(nChunks), &vbs[0])
	for i := 0; i < nChunks; i++ {
		r.vertexBuffers[i] = vertexBuffer{
			ID:        vbs[i],
			NVertices: 0,
		}
	}
	checkPanic("CreateBuffers")

	// World shader attrib/uniform locations
	worldProgram := prog
	positionLoc := gl.GetAttribLocation(worldProgram, gl.Str("position\x00"))
	r.worldAttribs = worldAttribs{
		PositionLoc: uint32(positionLoc),
	}
	checkPanic("GetAttribLocation")
	mvpLoc := gl.GetUniformLocation(worldProgram, gl.Str("MVP\x00"))
	r.worldUniforms = worldUniforms{
		MVPLoc: uint32(mvpLoc),
	}
	checkPanic("GetUniformLocation")

	// Load textures
	r.loadTextures()

	// test triangle
	v := make([]float32, 0)
	v = append(v, -1, -1, 0)
	v = append(v, 1, -1, 0)
	v = append(v, 0, 1, 0)

	gl.BindBuffer(gl.ARRAY_BUFFER, r.vertexBuffers[0].ID)
	gl.BufferData(gl.ARRAY_BUFFER, len(v)*4, gl.Ptr(&v[0]), gl.STATIC_DRAW)
	checkPanic("BufferData")

	// test uniforms
	projection := mgl32.Perspective(mgl32.DegToRad(45), 4.0/3.0, 0.1, 100.0)
	view := mgl32.LookAt(4, 4, 3, 0, 0, 0, 0, 1, 0)
	model := mgl32.Ident4()
	mvp := projection.Mul4(view).Mul4(model)
	gl.UniformMatrix4fv(int32(r.worldUniforms.MVPLoc), 1, false, &mvp[0])
}

func (r *Renderer) loadTextures() {
	var tex uint32
	gl.CreateTextures(gl.TEXTURE_2D, 1, &tex)
	gl.ActiveTexture(gl.TEXTURE0)
	gl.BindTexture(gl.TEXTURE_2D, tex)
	checkPanic("BindTexture")

	textureName := "assets/texture.png"
	f, err := os.Open(textureName)
	if err != nil {
		panic(err)
	}

	reader := bufio.NewReader(f)
	img, err := png.Decode(reader)
	if err != nil {
		panic(err)
	}

	rgba := getRGBAs(img)
	width := int32(img.Bounds().Dx())
	height := int32(img.Bounds().Dy())
	log.Printf("texture size: w=%d h=%d", width, height)
	gl.TexImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_INT_8_8_8_8, gl.Ptr(&rgba[0]))
	if err := gl.GetError(); err != 0 {
		log.Printf("error num: 0x%x", err)
		panic("TexImage2D error")
	}

	gl.TexParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
	gl.TexParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
	gl.TexParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
	gl.TexParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
}

func checkPanic(support string) {
	if err := gl.GetError(); err != 0 {
		log.Printf("%v: error num: 0x%x", support, err)
		panic("GL error")
	}
}

func getRGBAs(img image.Image) []uint32 {
	xMin := img.Bounds().Min.X
	xMax := img.Bounds().Max.X
	yMin := img.Bounds().Min.Y
	yMax := img.Bounds().Max.Y

	array := make([]uint32, (xMax-xMin)*(yMax-yMin)*4)
	for i := xMin; i < xMax; i++ {
		for j := yMin; j < yMax; j++ {
			idx := i + j*(xMax-xMin)
			r, g, b, a := img.At(i, j).RGBA()

			base := idx * 4
			array[base] = uint32(r)
			array[base+1] = uint32(g)
			array[base+2] = uint32(b)
			array[base+3] = uint32(a)
		}
	}

	return array
}

func (r *Renderer) Draw() {
	gl.EnableVertexAttribArray(0)
	gl.BindBuffer(gl.ARRAY_BUFFER, r.vertexBuffers[0].ID)
	gl.VertexAttribPointer(
		uint32(r.worldAttribs.PositionLoc),
		3,
		gl.FLOAT,
		false,
		0,
		nil,
	)
	gl.DrawArrays(gl.TRIANGLES, 0, 3)
	gl.DisableVertexAttribArray(0)
	checkPanic("DisableVertexAttribArray")
}
