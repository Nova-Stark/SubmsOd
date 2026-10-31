package database

import (
	"log"
	"os"
	"path/filepath"

	"submsod/internals/auth"
	"submsod/internals/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func InitDB(dbPath string) *gorm.DB {
	// Ensure directory exists
	dir := filepath.Dir(dbPath)
	if dir != "" && dir != "." {
		if err := os.MkdirAll(dir, 0755); err != nil {
			log.Fatalf("failed to create database directory: %v", err)
		}
	}

	var err error
	DB, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	// Auto migrate tables
	err = DB.AutoMigrate(
		&models.User{},
		&models.AuthToken{},
		&models.Product{},
		&models.ProductVariant{},
		&models.Plan{},
		&models.DiscountRule{},
		&models.TaxRule{},
		&models.QuotationTemplate{},
		&models.QuotationTemplateLine{},
		&models.Subscription{},
		&models.SubscriptionLine{},
	)
	if err != nil {
		log.Fatalf("failed to auto-migrate database: %v", err)
	}

	SeedDefaultAdmin()

	return DB
}

func SeedDefaultAdmin() {
	var count int64
	DB.Model(&models.User{}).Where("role = ?", models.RoleAdmin).Count(&count)
	if count == 0 {
		hash, err := auth.HashPassword("Admin@Brightloop2026!")
		if err == nil {
			admin := models.User{
				Email:        "admin@brightloop.local",
				PasswordHash: hash,
				Role:         models.RoleAdmin,
				IsVerified:   true,
				IsActive:     true,
			}
			DB.Create(&admin)
			log.Printf("Seeded default admin user: %s (password: Admin@Brightloop2026!)", admin.Email)
		}
	}
}
