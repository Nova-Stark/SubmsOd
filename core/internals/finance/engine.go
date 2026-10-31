package finance

import (
	"fmt"
	"strings"
	"time"

	"submsod/internals/models"

	"gorm.io/gorm"
)

type FinanceSummary struct {
	ActiveSubscriptions   int64   `json:"active_subscriptions"`
	TotalRevenueCollected float64 `json:"total_revenue_collected"` // formatted in dollars
	TotalRevenueCents     int64   `json:"total_revenue_cents"`
	OutstandingAR         float64 `json:"outstanding_ar"` // formatted in dollars
	OutstandingARCents    int64   `json:"outstanding_ar_cents"`
	OverdueInvoicesCount  int64   `json:"overdue_invoices_count"`
	OverdueAmount         float64 `json:"overdue_amount"` // formatted in dollars
	OverdueAmountCents    int64   `json:"overdue_amount_cents"`
}

type FinanceSummaryResponse struct {
	Summary         FinanceSummary `json:"summary"`
	ExecutionTimeMS int64          `json:"execution_time_ms"`
}

type InvoiceReportItem struct {
	ID             string    `json:"id"`
	InvoiceNumber  string    `json:"invoice_number"`
	CustomerID     string    `json:"customer_id"`
	CustomerEmail  string    `json:"customer_email"`
	Status         string    `json:"status"`
	DueDate        time.Time `json:"due_date"`
	TotalAmount    float64   `json:"total_amount"` // dollars
	AmountPaid     float64   `json:"amount_paid"`  // dollars
	BalanceDue     float64   `json:"balance_due"`  // dollars
	IsOverdue      bool      `json:"is_overdue"`
	CreatedAt      time.Time `json:"created_at"`
}

type ReportsFilter struct {
	DateFrom   *time.Time
	DateTo     *time.Time
	Status     string
	CustomerID string
	Limit      int
	Offset     int
}

// ComputeSummary executes high-performance KPI aggregation (<2000ms SLA)
func ComputeSummary(db *gorm.DB, now time.Time) (FinanceSummaryResponse, error) {
	start := time.Now()

	var activeSubs int64
	var revenueCents int64
	var outstandingAR int64
	var overdueCount int64
	var overdueCents int64

	// 1. Active Subscriptions Count (indexed on status)
	if err := db.Model(&models.Subscription{}).Where("status = ?", models.StatusActive).Count(&activeSubs).Error; err != nil {
		return FinanceSummaryResponse{}, fmt.Errorf("failed to count active subscriptions: %w", err)
	}

	// 2. Total Revenue Collected
	if err := db.Model(&models.Invoice{}).Select("COALESCE(SUM(amount_paid), 0)").Scan(&revenueCents).Error; err != nil {
		return FinanceSummaryResponse{}, fmt.Errorf("failed to sum collected revenue: %w", err)
	}

	// 3. Outstanding AR on confirmed invoices
	if err := db.Model(&models.Invoice{}).
		Where("status = ?", models.InvoiceStatusConfirmed).
		Select("COALESCE(SUM(total_amount - amount_paid), 0)").
		Scan(&outstandingAR).Error; err != nil {
		return FinanceSummaryResponse{}, fmt.Errorf("failed to calculate outstanding AR: %w", err)
	}

	// 4. Overdue Invoices Count & Amount (indexed on status, due_date)
	row := db.Model(&models.Invoice{}).
		Where("status = ? AND due_date < ?", models.InvoiceStatusConfirmed, now).
		Select("COUNT(*), COALESCE(SUM(total_amount - amount_paid), 0)").
		Row()
	if err := row.Scan(&overdueCount, &overdueCents); err != nil {
		return FinanceSummaryResponse{}, fmt.Errorf("failed to calculate overdue invoices: %w", err)
	}

	elapsed := time.Since(start).Milliseconds()

	summary := FinanceSummary{
		ActiveSubscriptions:   activeSubs,
		TotalRevenueCollected: float64(revenueCents) / 100.0,
		TotalRevenueCents:     revenueCents,
		OutstandingAR:         float64(outstandingAR) / 100.0,
		OutstandingARCents:    outstandingAR,
		OverdueInvoicesCount:  overdueCount,
		OverdueAmount:         float64(overdueCents) / 100.0,
		OverdueAmountCents:    overdueCents,
	}

	return FinanceSummaryResponse{
		Summary:         summary,
		ExecutionTimeMS: elapsed,
	}, nil
}

// QueryReports returns filtered, paginated invoice report items
func QueryReports(db *gorm.DB, filter ReportsFilter, now time.Time) ([]InvoiceReportItem, int64, error) {
	var count int64
	var items []InvoiceReportItem
	nowStr := now.Format("2006-01-02 15:04:05")

	baseQuery := db.Table("invoices i").
		Select(`
			i.id,
			i.invoice_number,
			i.customer_id,
			COALESCE(u.email, 'unknown') AS customer_email,
			i.status,
			i.due_date,
			CAST(i.total_amount AS REAL) / 100.0 AS total_amount,
			CAST(i.amount_paid AS REAL) / 100.0 AS amount_paid,
			CAST(i.total_amount - i.amount_paid AS REAL) / 100.0 AS balance_due,
			CASE WHEN i.status = 'CONFIRMED' AND i.due_date < ? THEN 1 ELSE 0 END AS is_overdue,
			i.created_at
		`, nowStr).
		Joins("LEFT JOIN users u ON i.customer_id = u.id")

	// Apply Filters
	if filter.Status != "" {
		if strings.EqualFold(filter.Status, "OVERDUE") {
			baseQuery = baseQuery.Where("i.status = 'CONFIRMED' AND i.due_date < ?", nowStr)
		} else {
			baseQuery = baseQuery.Where("i.status = ?", strings.ToUpper(filter.Status))
		}
	}
	if filter.CustomerID != "" {
		baseQuery = baseQuery.Where("i.customer_id = ?", filter.CustomerID)
	}
	if filter.DateFrom != nil {
		baseQuery = baseQuery.Where("i.created_at >= ?", *filter.DateFrom)
	}
	if filter.DateTo != nil {
		baseQuery = baseQuery.Where("i.created_at <= ?", *filter.DateTo)
	}

	// Total count for pagination
	if err := baseQuery.Count(&count).Error; err != nil {
		return nil, 0, err
	}

	limit := filter.Limit
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	offset := filter.Offset
	if offset < 0 {
		offset = 0
	}

	if err := baseQuery.Order("i.created_at desc").Limit(limit).Offset(offset).Scan(&items).Error; err != nil {
		return nil, 0, err
	}

	return items, count, nil
}
