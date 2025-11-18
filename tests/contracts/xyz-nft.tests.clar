;; Property-based tests for xyz-nft
;; These are merged with the main contract by Rendezvous

;; Test: Minting increments ID
(define-public (test-mint-increments-id (cid (string-ascii 256)))
  (let 
    ((id-before (var-get last-id))
     (new-id (try! (mint-additional cid))))
    (asserts! (is-eq new-id (+ id-before u1)) (err u9001))
    (ok true)))

;; Test: Minted token has correct owner
(define-public (test-mint-owner (cid (string-ascii 256)))
  (let ((new-id (try! (mint-additional cid))))
    (asserts! (is-some (nft-get-owner? test-nft new-id)) (err u9002))
    (asserts! (is-eq (some tx-sender) (nft-get-owner? test-nft new-id)) (err u9003))
    (ok true)))

;; Invariant: Last ID should always be at least 1
(define-read-only (invariant-last-id-min)
  (>= (var-get last-id) u1))

;; Invariant: Royalty should be in valid range
(define-read-only (invariant-royalty-valid)
  (let ((royalty (var-get royalty-percent)))
    (and (>= royalty u0) (<= royalty u1000))))
