;; Mock commission contract for testing marketplace functionality
;; Implements the commission-trait required by xyz-nft

(define-trait commission-trait
  ((pay (uint uint) (response bool uint))))

;; Track commission payments for testing
(define-data-var total-commissions-paid uint u0)
(define-data-var last-commission-token-id uint u0)
(define-data-var last-commission-price uint u0)

;; Simple commission implementation that always succeeds
(define-public (pay (id uint) (price uint))
  (begin
    (var-set total-commissions-paid (+ (var-get total-commissions-paid) u1))
    (var-set last-commission-token-id id)
    (var-set last-commission-price price)
    (ok true)))

;; Read-only functions for testing
(define-read-only (get-total-commissions-paid)
  (ok (var-get total-commissions-paid)))

(define-read-only (get-last-commission-token-id)
  (ok (var-get last-commission-token-id)))

(define-read-only (get-last-commission-price)
  (ok (var-get last-commission-price)))

;; Failing commission for edge case testing
(define-public (pay-and-fail (id uint) (price uint))
  (err u999))
