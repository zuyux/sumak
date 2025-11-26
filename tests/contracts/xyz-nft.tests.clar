;; Property-based tests for xyz-nft
;; These are merged with the main contract by Rendezvous

(define-constant COMMISSION-CONTRACT .commission-mock)

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

;; Test: Minted metadata is stored under the same CID
(define-public (test-mint-stores-metadata (cid (string-ascii 256)))
  (let ((new-id (try! (mint-additional cid)))
        (stored (map-get? cids new-id)))
    (asserts! (is-some stored) (err u9101))
    (asserts! (is-eq (some cid) stored) (err u9102))
    (ok true)))

;; Test: Transfers update ownership and balances when not listed
(define-public (test-transfer-updates-balances (cid (string-ascii 256)) (recipient principal))
  (if (is-eq recipient tx-sender)
    (ok false)
    (let ((new-id (try! (mint-additional cid)))
          (sender-before (get-balance tx-sender))
          (recipient-before (get-balance recipient)))
      (try! (transfer new-id tx-sender recipient))
      (asserts! (is-eq (some recipient) (nft-get-owner? test-nft new-id)) (err u9103))
      (asserts! (is-eq (get-balance tx-sender) (- sender-before u1)) (err u9104))
      (asserts! (is-eq (get-balance recipient) (+ recipient-before u1)) (err u9105))
      (ok true))))

;; Test: Listed NFTs cannot be transferred until unlisted
(define-public (test-listed-nft-transfer-fails (cid (string-ascii 256)) (price uint))
  (if (<= price u0)
    (ok false)
    (let ((new-id (try! (mint-additional cid))))
      (try! (list-in-sat new-id price COMMISSION-CONTRACT))
      (let ((transfer-result (transfer new-id tx-sender tx-sender)))
        (asserts! (is-eq transfer-result (err ERR-LISTING)) (err u9106))
        (ok true)))))

;; Test: Unlisting clears the marketplace entry
(define-public (test-unlist-removes-market-entry (cid (string-ascii 256)) (price uint))
  (if (<= price u0)
    (ok false)
    (let ((new-id (try! (mint-additional cid))))
      (try! (list-in-sat new-id price COMMISSION-CONTRACT))
      (try! (unlist-in-sat new-id))
      (asserts! (is-none (map-get? market new-id)) (err u9107))
      (ok true))))

;; Test: Listing stores expected price, commission contract, and royalty snapshot
(define-public (test-listing-stores-market-data (cid (string-ascii 256)) (price uint))
  (if (<= price u0)
    (ok false)
    (let ((new-id (try! (mint-additional cid)))
          (current-royalty (var-get royalty-percent)))
      (try! (list-in-sat new-id price COMMISSION-CONTRACT))
      (let ((listing-option (map-get? market new-id)))
        (asserts! (is-some listing-option) (err u9108))
        (let ((listing (unwrap! listing-option {price: u0, commission: COMMISSION-CONTRACT, royalty: u0})))
          (asserts! (is-eq price (get price listing)) (err u9109))
          (asserts! (is-eq current-royalty (get royalty listing)) (err u9110))
          (asserts! (is-eq COMMISSION-CONTRACT (get commission listing)) (err u9111))
          (ok true))))))

;; Test: Transfers must reject attempts where tx-sender is not the declared sender
(define-public (test-transfer-requires-authorized-sender (cid (string-ascii 256)) (fake-sender principal))
  (if (is-eq fake-sender tx-sender)
    (ok false)
    (let ((new-id (try! (mint-additional cid)))
          (result (transfer new-id fake-sender tx-sender)))
      (match result
        success (err u9201)
        error-code (begin
          (asserts! (is-eq error-code ERR-NOT-AUTHORIZED) (err u9202))
          (asserts! (is-eq (some tx-sender) (nft-get-owner? test-nft new-id)) (err u9203))
          (ok true))))))

;; Test: Only the current owner can list an NFT in the marketplace
(define-public (test-non-owner-cannot-list (cid (string-ascii 256)) (price uint) (recipient principal))
  (if (or (<= price u0) (is-eq recipient tx-sender))
    (ok false)
    (let ((new-id (try! (mint-additional cid))))
      (try! (transfer new-id tx-sender recipient))
      (let ((result (list-in-sat new-id price COMMISSION-CONTRACT)))
        (match result
          success (err u9210)
          error-code (begin
            (asserts! (is-eq error-code ERR-NOT-AUTHORIZED) (err u9211))
            (asserts! (is-eq (some recipient) (nft-get-owner? test-nft new-id)) (err u9212))
            (ok true)))))))

;; Test: Relisting the same NFT overwrites the marketplace price snapshot
(define-public (test-relisting-updates-price (cid (string-ascii 256)) (first-price uint) (second-price uint))
  (if (or (<= first-price u0) (<= second-price u0) (is-eq first-price second-price))
    (ok false)
    (let ((new-id (try! (mint-additional cid)))
          (default-listing {price: u0, commission: COMMISSION-CONTRACT, royalty: u0}))
      (try! (list-in-sat new-id first-price COMMISSION-CONTRACT))
      (try! (list-in-sat new-id second-price COMMISSION-CONTRACT))
      (let ((listing-option (map-get? market new-id)))
        (asserts! (is-some listing-option) (err u9220))
        (let ((listing (unwrap! listing-option default-listing)))
          (asserts! (is-eq (get price listing) second-price) (err u9221))
          (asserts! (is-eq (get commission listing) COMMISSION-CONTRACT) (err u9222))
          (ok true))))))

;; Invariant: Last ID should always be at least 1
(define-read-only (invariant-last-id-min)
  (>= (var-get last-id) u1))

;; Invariant: Royalty should be in valid range
(define-read-only (invariant-royalty-valid)
  (let ((royalty (var-get royalty-percent)))
    (and (>= royalty u0) (<= royalty u1000))))
