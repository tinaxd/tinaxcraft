package renderer

import (
	"io/ioutil"
	"log"
	"os"

	"github.com/go-gl/gl/v4.1-core/gl"
)

func mustReadShaderCode(filename string) string {
	f, err := os.Open(filename)
	if err != nil {
		panic(err)
	}

	code, err := ioutil.ReadAll(f)
	if err != nil {
		panic(err)
	}
	return string(code)
}

func mustCompileShader(vertexFilename, fragmentFilename string) uint32 {
	v := gl.CreateShader(gl.VERTEX_SHADER)
	f := gl.CreateShader(gl.FRAGMENT_SHADER)

	vcode := mustReadShaderCode(vertexFilename)
	fcode := mustReadShaderCode(fragmentFilename)

	vcode += "\x00"
	fcode += "\x00"
	mustCompileAndCheck(vcode, v)
	mustCompileAndCheck(fcode, f)

	programID := gl.CreateProgram()
	gl.AttachShader(programID, v)
	gl.AttachShader(programID, f)
	gl.LinkProgram(programID)

	var result int32
	gl.GetProgramiv(programID, gl.LINK_STATUS, &result)
	if result != gl.TRUE {
		panic("failed to link program")
	}

	gl.DeleteShader(v)
	gl.DeleteShader(f)

	return programID
}

func mustCompileAndCheck(code string, shaderID uint32) {
	ss, free := gl.Strs(code)
	defer free()
	gl.ShaderSource(shaderID, 1, ss, nil)
	gl.CompileShader(shaderID)

	var result int32
	gl.GetShaderiv(shaderID, gl.COMPILE_STATUS, &result)
	if result != gl.TRUE {
		// get error msg
		infoLogLength := 1000
		var actualLength int32
		buf := make([]uint8, infoLogLength)
		gl.GetShaderInfoLog(shaderID, int32(infoLogLength), &actualLength, &buf[0])
		buf = buf[0:actualLength]
		s := string(buf)
		log.Printf("shader compile (len=%d): %v", actualLength, s)
		panic("failed to compile shader")
	}
}
