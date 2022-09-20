package main

import (
	"bufio"
	"image"
	"image/png"
	"os"

	"github.com/go-gl/gl/v4.1-core/gl"
)

type vertexBuffer struct {
	ID        uint32
	NVertices int
}

type Renderer struct {
	sizeChunksX, sizeChunksY int

	chunkIsDirty  []bool
	vertexBuffers []vertexBuffer
}

func NewRenderer() *Renderer {
	return &Renderer{
		sizeChunksX: 2,
		sizeChunksY: 2,
	}
}

func (r *Renderer) InitGL() {
	gl.Enable(gl.CULL_FACE)
	gl.Enable(gl.DEPTH_TEST)

	nChunks := (r.sizeChunksX*2 + 1) * (r.sizeChunksY*2 + 1)

	r.chunkIsDirty = make([]bool, nChunks)

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

	// Load textures
	r.loadTextures()
}

func (r *Renderer) loadTextures() {
	var tex uint32
	gl.CreateTextures(gl.TEXTURE_2D, 1, &tex)
	gl.ActiveTexture(gl.TEXTURE0)
	gl.BindTexture(gl.TEXTURE_2D, tex)

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
	gl.TexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_SHORT_4_4_4_4, gl.Ptr(&rgba[0]))
	if gl.GetError() != 0 {
		panic("TexImage2D error")
	}

	gl.TexParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
	gl.TexParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
	gl.TexParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
	gl.TexParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
}

func getRGBAs(img image.Image) []uint16 {
	xMin := img.Bounds().Min.X
	xMax := img.Bounds().Max.X
	yMin := img.Bounds().Min.Y
	yMax := img.Bounds().Max.Y

	array := make([]uint16, (xMax-xMin)*(yMax-yMin)*4)
	for i := xMin; i < xMax; i++ {
		for j := yMin; j < yMax; j++ {
			idx := i + j*(xMax-xMin)
			r, g, b, a := img.At(i, j).RGBA()

			base := idx * 4
			array[base] = uint16(r)
			array[base+1] = uint16(g)
			array[base+2] = uint16(b)
			array[base+3] = uint16(a)
		}
	}

	return array
}
