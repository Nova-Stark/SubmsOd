package main

import (
	"log"

	"submsod/internals/database"
	"submsod/internals/models"
	"submsod/internals/server"
)

func main() {
	database.InitDB("data/brightloop.db")

	var prodCount int64
	database.DB.Model(&models.Product{}).Count(&prodCount)
	if prodCount == 0 {
		log.Println("Database empty. Auto-seeding initial deterministic dataset...")
		if n, err := database.LoadFixtures(database.DB, "../fixtures/seed-data.json"); err != nil {
			log.Printf("Warning: failed to auto-seed fixtures: %v", err)
		} else {
			log.Printf("Successfully auto-seeded %d records from seed-data.json", n)
		}
	}

	r := server.NewRouter()

	log.Println("Starting Brightloop API server on :8080...")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Server failed to run: %v", err)
	}
}
