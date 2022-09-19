package main

import (
	"flag"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
	"github.com/tinaxd/tinaxcraft/storage"
	"github.com/tinaxd/tinaxcraft/world"
)

var addr = flag.String("addr", "localhost:8080", "http service address")

var upgrader = websocket.Upgrader{} // use default options

func echo(w http.ResponseWriter, r *http.Request) {
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
		log.Printf("recv: %s", message)
		err = c.WriteMessage(mt, message)
		if err != nil {
			log.Println("write:", err)
			break
		}
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

	// flag.Parse()
	// log.SetFlags(0)
	// http.HandleFunc("/echo", echo)
	// log.Fatal(http.ListenAndServe(*addr, nil))
}
