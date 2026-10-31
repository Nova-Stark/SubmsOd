package main

import (
	"log"

	"submsod/internals/database"
	"submsod/internals/server"
)

func main() {
	database.InitDB("data/brightloop.db")

	r := server.NewRouter()

	log.Println("Starting Brightloop API server on :8080...")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Server failed to run: %v", err)
	}
}
