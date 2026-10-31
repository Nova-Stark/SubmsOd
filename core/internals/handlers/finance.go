package handlers

import (
	"net/http"
	"strconv"
	"time"

	"submsod/internals/database"
	"submsod/internals/finance"

	"github.com/gin-gonic/gin"
)

// GetFinanceSummary returns company financial KPIs (Admin & Staff only)
func GetFinanceSummary(c *gin.Context) {
	summary, err := finance.ComputeSummary(database.DB, time.Now())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to compute financial summary: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, summary)
}

// GetFinanceReports returns filtered, paginated invoice and aging ledger
func GetFinanceReports(c *gin.Context) {
	filter := finance.ReportsFilter{
		Status:     c.Query("status"),
		CustomerID: c.Query("customer_id"),
	}

	if dateFromStr := c.Query("date_from"); dateFromStr != "" {
		if t, err := time.Parse("2006-01-02", dateFromStr); err == nil {
			filter.DateFrom = &t
		}
	}
	if dateToStr := c.Query("date_to"); dateToStr != "" {
		if t, err := time.Parse("2006-01-02", dateToStr); err == nil {
			filter.DateTo = &t
		}
	}

	if l, err := strconv.Atoi(c.Query("limit")); err == nil {
		filter.Limit = l
	}
	if o, err := strconv.Atoi(c.Query("offset")); err == nil {
		filter.Offset = o
	}

	items, totalCount, err := finance.QueryReports(database.DB, filter, time.Now())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query reports: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"reports":     items,
		"total_count": totalCount,
		"limit":       filter.Limit,
		"offset":      filter.Offset,
	})
}
