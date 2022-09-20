package main

import (
	"flag"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
	"github.com/tinaxd/tinaxcraft/server/storage"
	"github.com/tinaxd/tinaxcraft/server/types"
	"github.com/tinaxd/tinaxcraft/server/world"
	"google.golang.org/protobuf/proto"
)

var addr = flag.String("addr", "localhost:8080", "http service address")

var upgrader = websocket.Upgrader{} // use default options

type GameServer struct {
}

func (gs *GameServer) handleChunkRequest(req *types.ChunkRequest, c *websocket.Conn) {

}

func (gs *GameServer) handleRequest(r *types.Request, c *websocket.Conn) {
	switch req := r.Request.(type) {
	case *types.Request_ChunkRequest:
		gs.handleChunkRequest(req.ChunkRequest, c)
	}
}

func (gs *GameServer) Handler(w http.ResponseWriter, r *http.Request) {
	c, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Print("upgrade:", err)
		return
	}
	defer c.Close()
	for {
		mt, message, err := c.ReadMessage()
		if err != nil {
			log.Println("read:", err)
			break
		}
		if mt == websocket.BinaryMessage {
			continue
		}

		request := &types.Request{}
		if err := proto.Unmarshal(message, request); err != nil {
			// bad request
			break
		}
		gs.handleRequest(request, c)
	}
}

func main() {
	storage, err := storage.Connect("world.sqlite3")
	if err != nil {
		panic(err)
	}

	gen := world.NewPerlinChunkGenerator(1)

	chunk0 := gen.GenerateChunk(0, 0)

	if err := storage.WriteChunk(chunk0, 0, 0); err != nil {
		panic(err)
	}

	flag.Parse()
	log.SetFlags(0)

	gs := &GameServer{}

	http.HandleFunc("/", gs.Handler)
	log.Fatal(http.ListenAndServe(*addr, nil))
}
