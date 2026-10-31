package database

import (
	"encoding/json"
	"fmt"
	"log"
	"os"

	"submsod/internals/auth"
	"submsod/internals/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type SeedDataset struct {
	Products      []models.Product      `json:"products"`
	Plans         []models.Plan         `json:"plans"`
	Taxes         []models.TaxRule      `json:"taxes"`
	Discounts     []models.DiscountRule `json:"discounts"`
	Customers     []models.User         `json:"customers"`
	Subscriptions []models.Subscription `json:"subscriptions"`
	Invoices      []models.Invoice      `json:"invoices"`
}

// LoadFixtures imports fixtures/seed-data.json into SQLite within an atomic transaction
func LoadFixtures(db *gorm.DB, filePath string) (int, error) {
	// Try alternative relative paths if not found
	candidates := []string{
		filePath,
		"../fixtures/seed-data.json",
		"fixtures/seed-data.json",
		"../../fixtures/seed-data.json",
	}

	var data []byte
	var err error
	var resolvedPath string

	for _, p := range candidates {
		if p == "" {
			continue
		}
		data, err = os.ReadFile(p)
		if err == nil {
			resolvedPath = p
			break
		}
	}

	if err != nil {
		return 0, fmt.Errorf("could not read seed-data.json: %w", err)
	}

	var dataset SeedDataset
	if err := json.Unmarshal(data, &dataset); err != nil {
		return 0, fmt.Errorf("failed to unmarshal seed-data.json: %w", err)
	}

	defaultPasswordHash, _ := auth.HashPassword("ClientPass123!")

	totalLoaded := 0

	err = db.Transaction(func(tx *gorm.DB) error {
		// 1. Products & Variants
		for _, p := range dataset.Products {
			if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&p).Error; err != nil {
				return fmt.Errorf("failed to insert product %s: %w", p.ID, err)
			}
			for _, v := range p.Variants {
				v.ProductID = p.ID
				if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&v).Error; err != nil {
					return fmt.Errorf("failed to insert variant %s: %w", v.ID, err)
				}
			}
			totalLoaded++
		}

		// 2. Plans
		for _, pl := range dataset.Plans {
			if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&pl).Error; err != nil {
				return fmt.Errorf("failed to insert plan %s: %w", pl.ID, err)
			}
			totalLoaded++
		}

		// 3. Tax Rules
		for _, t := range dataset.Taxes {
			if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&t).Error; err != nil {
				return fmt.Errorf("failed to insert tax %s: %w", t.ID, err)
			}
			totalLoaded++
		}

		// 4. Discounts
		for _, d := range dataset.Discounts {
			if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&d).Error; err != nil {
				return fmt.Errorf("failed to insert discount %s: %w", d.ID, err)
			}
			totalLoaded++
		}

		// 5. Customers
		for _, c := range dataset.Customers {
			c.PasswordHash = defaultPasswordHash
			if c.Role == "" {
				c.Role = models.RoleCustomer
			}
			c.IsActive = true
			c.IsVerified = true
			if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&c).Error; err != nil {
				return fmt.Errorf("failed to insert customer %s: %w", c.ID, err)
			}
			totalLoaded++
		}

		// 6. Subscriptions & Lines
		for _, s := range dataset.Subscriptions {
			lines := s.Lines
			s.Lines = nil
			if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&s).Error; err != nil {
				return fmt.Errorf("failed to insert subscription %s: %w", s.ID, err)
			}
			for _, l := range lines {
				l.SubscriptionID = s.ID
				if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&l).Error; err != nil {
					return fmt.Errorf("failed to insert sub line %s: %w", l.ID, err)
				}
			}
			totalLoaded++
		}

		// 7. Invoices, Lines & Payments
		for _, inv := range dataset.Invoices {
			lines := inv.Lines
			payments := inv.Payments
			inv.Lines = nil
			inv.Payments = nil

			if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&inv).Error; err != nil {
				return fmt.Errorf("failed to insert invoice %s: %w", inv.ID, err)
			}
			for _, l := range lines {
				l.InvoiceID = inv.ID
				if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&l).Error; err != nil {
					return fmt.Errorf("failed to insert invoice line %s: %w", l.ID, err)
				}
			}
			for _, pay := range payments {
				pay.InvoiceID = inv.ID
				if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&pay).Error; err != nil {
					return fmt.Errorf("failed to insert payment %s: %w", pay.ID, err)
				}
			}
			totalLoaded++
		}

		return nil
	})

	if err != nil {
		return 0, err
	}

	log.Printf("Successfully loaded %d fixture records from %s into database", totalLoaded, resolvedPath)
	return totalLoaded, nil
}
