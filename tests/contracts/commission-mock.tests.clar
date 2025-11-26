;; Property-based tests for commission-mock contract
;; Ensures commission accounting stays consistent across success and failure paths

;; Test: A successful pay call increments counters and records the request details
(define-public (test-pay-updates-state (token-id uint) (price uint))
  (let ((before (var-get total-commissions-paid)))
    (try! (pay token-id price))
    (let ((after (var-get total-commissions-paid)))
      (asserts! (is-eq after (+ before u1)) (err u9301))
      (asserts! (is-eq (var-get last-commission-token-id) token-id) (err u9302))
      (asserts! (is-eq (var-get last-commission-price) price) (err u9303))
      (ok true))))

;; Test: Two consecutive pay calls advance the counter by two regardless of repeated inputs
(define-public (test-consecutive-payments-accumulate (token-id uint) (price uint))
  (let ((before (var-get total-commissions-paid)))
    (try! (pay token-id price))
    (try! (pay token-id price))
    (asserts! (is-eq (var-get total-commissions-paid) (+ before u2)) (err u9310))
    (ok true)))

;; Test: pay-and-fail returns an error and must not mutate contract state
(define-public (test-pay-and-fail-preserves-state (token-id uint) (price uint))
  (try! (pay token-id price))
  (let ((stable-total (var-get total-commissions-paid))
        (stable-id (var-get last-commission-token-id))
        (stable-price (var-get last-commission-price))
        (result (pay-and-fail token-id price)))
    (asserts! (is-err result) (err u9320))
    (asserts! (is-eq stable-total (var-get total-commissions-paid)) (err u9321))
    (asserts! (is-eq stable-id (var-get last-commission-token-id)) (err u9322))
    (asserts! (is-eq stable-price (var-get last-commission-price)) (err u9323))
    (ok true)))

;; Invariant: Getter for total commissions mirrors the stored counter exactly
(define-read-only (invariant-total-getter-matches-state)
  (match (get-total-commissions-paid)
    total (is-eq total (var-get total-commissions-paid))
    err-code false))

;; Invariant: Getter values for last token id and price match the on-chain state
(define-read-only (invariant-last-values-match-state)
  (match (get-last-commission-token-id)
    last-id
      (match (get-last-commission-price)
        last-price
          (and (is-eq last-id (var-get last-commission-token-id))
               (is-eq last-price (var-get last-commission-price)))
        err-price false)
    err-id false))
