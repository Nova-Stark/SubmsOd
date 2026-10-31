package subscription

import (
	"errors"
	"time"

	"submsod/internals/models"
)

var (
	ErrInvalidStateTransition = errors.New("invalid state transition")
	ErrNoLineItems            = errors.New("subscription must have at least one line item")
	ErrQuotationExpired       = errors.New("quotation validity window has expired")
	ErrPauseNotAllowed        = errors.New("current plan policy does not allow pausing")
	ErrEarlyCloseNotAllowed   = errors.New("current plan policy does not allow early closure")
	ErrRenewalNotAllowed      = errors.New("current plan policy does not allow renewals")
)

// TransitionToQuotation: Draft -> Quotation
func TransitionToQuotation(sub *models.Subscription, validityDays int, now time.Time) error {
	if sub.Status != models.StatusDraft {
		return ErrInvalidStateTransition
	}
	if len(sub.Lines) == 0 {
		return ErrNoLineItems
	}

	if validityDays <= 0 {
		validityDays = 30
	}
	validUntil := now.AddDate(0, 0, validityDays)
	sub.ValidUntil = &validUntil
	sub.Status = models.StatusQuotation
	return nil
}

// TransitionToConfirmed: Quotation -> Confirmed
func TransitionToConfirmed(sub *models.Subscription, now time.Time) error {
	if sub.Status != models.StatusQuotation {
		return ErrInvalidStateTransition
	}
	if sub.ValidUntil != nil && now.After(*sub.ValidUntil) {
		return ErrQuotationExpired
	}

	sub.Status = models.StatusConfirmed
	return nil
}

// TransitionToActive: Confirmed -> Active
func TransitionToActive(sub *models.Subscription, now time.Time) error {
	if sub.Status != models.StatusConfirmed && sub.Status != models.StatusPaused {
		return ErrInvalidStateTransition
	}

	if sub.Status == models.StatusConfirmed {
		if sub.StartDate.IsZero() {
			sub.StartDate = now
		}
		sub.NextBillingDate = sub.StartDate
	}

	sub.Status = models.StatusActive
	return nil
}

// TransitionToPaused: Active -> Paused
func TransitionToPaused(sub *models.Subscription, plan *models.Plan) error {
	if sub.Status != models.StatusActive {
		return ErrInvalidStateTransition
	}
	if plan != nil && !plan.AllowPause {
		return ErrPauseNotAllowed
	}

	sub.Status = models.StatusPaused
	return nil
}

// TransitionToClosed: Active/Paused -> Closed
func TransitionToClosed(sub *models.Subscription, plan *models.Plan, now time.Time) error {
	if sub.Status != models.StatusActive && sub.Status != models.StatusPaused && sub.Status != models.StatusConfirmed && sub.Status != models.StatusQuotation {
		return ErrInvalidStateTransition
	}

	// Early close check
	if sub.ExpiryDate != nil && now.Before(*sub.ExpiryDate) && plan != nil && !plan.AllowEarlyClose {
		return ErrEarlyCloseNotAllowed
	}

	sub.Status = models.StatusClosed
	return nil
}

// RenewSubscription: Extends expiry date based on plan interval
func RenewSubscription(sub *models.Subscription, plan *models.Plan, now time.Time) error {
	if plan != nil && !plan.AllowRenewal {
		return ErrRenewalNotAllowed
	}

	anchor := now
	if sub.ExpiryDate != nil && sub.ExpiryDate.After(now) {
		anchor = *sub.ExpiryDate
	}

	var newExpiry time.Time
	if plan != nil && plan.BillingPeriod == models.BillingPeriodYearly {
		newExpiry = anchor.AddDate(1, 0, 0)
	} else {
		newExpiry = anchor.AddDate(0, 1, 0)
	}

	sub.ExpiryDate = &newExpiry
	if sub.Status == models.StatusClosed {
		sub.Status = models.StatusActive
		sub.NextBillingDate = now
	}
	return nil
}
