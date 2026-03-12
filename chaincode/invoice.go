package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// Helper function to get deterministic transaction timestamp
func getTxTimestamp(ctx contractapi.TransactionContextInterface) (string, error) {
	timestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return "", err
	}
	return time.Unix(timestamp.Seconds, int64(timestamp.Nanos)).UTC().Format(time.RFC3339), nil
}

// SmartContract provides functions for managing invoices
type SmartContract struct {
	contractapi.Contract
}

// Invoice represents an invoice on the ledger with Layer-3 cryptographic binding
type Invoice struct {
	Hash         string `json:"hash"`
	Number       string `json:"number"`
	DocumentHash string `json:"documentHash"` // Layer-3: SHA-256 of PDF
	BindingHash  string `json:"bindingHash"`  // Layer-3: SHA256(GIID + DocumentHash) - IMMUTABLE
	IpfsCID      string `json:"ipfsCid"`      // Layer-3: IPFS Content Identifier
	Status       string `json:"status"`
	LockedBy     string `json:"lockedBy"`
	LenderID     string `json:"lenderId"`
	FinancedAt   string `json:"financedAt"`
	ClosedAt     string `json:"closedAt"`
	CreatedAt    string `json:"createdAt"`
	UpdatedAt    string `json:"updatedAt"`
}

// Invoice states
const (
	StatusAvailable = "AVAILABLE"
	StatusLocked    = "LOCKED"
	StatusFinanced  = "FINANCED"
	StatusClosed    = "CLOSED"
)

// InitLedger initializes the ledger
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	fmt.Println("Invoice ledger initialized")
	return nil
}

// RegisterInvoice registers a new invoice on the ledger with Layer-3 binding
// Parameters: hash (GIID), number, documentHash, bindingHash, ipfsCID
// bindingHash is IMMUTABLE once written - enforces cryptographic binding
func (s *SmartContract) RegisterInvoice(ctx contractapi.TransactionContextInterface, hash string, number string, documentHash string, bindingHash string, ipfsCID string) error {
	// Check if invoice already exists
	exists, err := s.InvoiceExists(ctx, hash)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("invoice %s already exists", hash)
	}

	// Validate required Layer-3 fields
	if documentHash == "" {
		return fmt.Errorf("documentHash is required for Layer-3 integrity")
	}
	if bindingHash == "" {
		return fmt.Errorf("bindingHash is required for Layer-3 cryptographic binding")
	}
	if ipfsCID == "" {
		return fmt.Errorf("ipfsCID is required for Layer-3 content storage")
	}

	// Use transaction timestamp for deterministic behavior across peers
	timestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return err
	}
	txTime := time.Unix(timestamp.Seconds, int64(timestamp.Nanos)).UTC().Format(time.RFC3339)

	invoice := Invoice{
		Hash:         hash,
		Number:       number,
		DocumentHash: documentHash,
		BindingHash:  bindingHash, // IMMUTABLE - never changes
		IpfsCID:      ipfsCID,
		Status:       StatusAvailable,
		LockedBy:     "",
		LenderID:     "",
		CreatedAt:    txTime,
		UpdatedAt:    txTime,
	}

	invoiceJSON, err := json.Marshal(invoice)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(hash, invoiceJSON)
	if err != nil {
		return err
	}

	// Emit event with Layer-3 data
	eventPayload := map[string]string{
		"hash":         hash,
		"number":       number,
		"documentHash": documentHash,
		"bindingHash":  bindingHash,
		"ipfsCid":      ipfsCID,
		"action":       "REGISTERED",
	}
	eventJSON, _ := json.Marshal(eventPayload)
	ctx.GetStub().SetEvent("InvoiceRegistered", eventJSON)

	return nil
}

// QueryInvoice returns the invoice stored in the world state with given hash
func (s *SmartContract) QueryInvoice(ctx contractapi.TransactionContextInterface, hash string) (*Invoice, error) {
	invoiceJSON, err := ctx.GetStub().GetState(hash)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if invoiceJSON == nil {
		return nil, fmt.Errorf("invoice %s does not exist", hash)
	}

	var invoice Invoice
	err = json.Unmarshal(invoiceJSON, &invoice)
	if err != nil {
		return nil, err
	}

	return &invoice, nil
}

// VerifyInvoice is an alias for QueryInvoice to maintain compatibility with backend
func (s *SmartContract) VerifyInvoice(ctx contractapi.TransactionContextInterface, hash string) (*Invoice, error) {
	return s.QueryInvoice(ctx, hash)
}

// LockInvoice locks an invoice for a specific lender
// CRITICAL: bindingHash, documentHash, and ipfsCID are IMMUTABLE - never modified
func (s *SmartContract) LockInvoice(ctx contractapi.TransactionContextInterface, hash string, lenderID string) error {
	invoice, err := s.QueryInvoice(ctx, hash)
	if err != nil {
		return err
	}

	if invoice.Status != StatusAvailable {
		return fmt.Errorf("invoice is %s, cannot lock", invoice.Status)
	}

	// Update only mutable fields - Layer-3 fields remain unchanged
	invoice.Status = StatusLocked
	invoice.LockedBy = lenderID
	invoice.LenderID = lenderID  // PROBLEM 3 FIX: Set lenderID when locking
	
	txTime, err := getTxTimestamp(ctx)
	if err != nil {
		return err
	}
	invoice.UpdatedAt = txTime
	// bindingHash, documentHash, ipfsCID are NEVER modified

	invoiceJSON, err := json.Marshal(invoice)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(hash, invoiceJSON)
	if err != nil {
		return err
	}

	// Emit event
	eventPayload := map[string]string{
		"hash":     hash,
		"lenderId": lenderID,
		"action":   "LOCKED",
	}
	eventJSON, _ := json.Marshal(eventPayload)
	ctx.GetStub().SetEvent("InvoiceLocked", eventJSON)

	return nil
}

// FinanceInvoice finances a locked invoice
// CRITICAL: bindingHash, documentHash, and ipfsCID are IMMUTABLE - never modified
func (s *SmartContract) FinanceInvoice(ctx contractapi.TransactionContextInterface, hash string, lenderID string) error {
	invoice, err := s.QueryInvoice(ctx, hash)
	if err != nil {
		return err
	}

	if invoice.Status != StatusLocked {
		return fmt.Errorf("invoice must be LOCKED to finance, current status: %s", invoice.Status)
	}

	if invoice.LockedBy != lenderID {
		return fmt.Errorf("invoice locked by %s, cannot be financed by %s", invoice.LockedBy, lenderID)
	}

	// Update only mutable fields - Layer-3 fields remain unchanged
	invoice.Status = StatusFinanced
	invoice.LenderID = lenderID
	
	txTime, err := getTxTimestamp(ctx)
	if err != nil {
		return err
	}
	invoice.FinancedAt = txTime
	invoice.UpdatedAt = txTime
	// bindingHash, documentHash, ipfsCID are NEVER modified

	invoiceJSON, err := json.Marshal(invoice)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(hash, invoiceJSON)
	if err != nil {
		return err
	}

	// Emit event
	eventPayload := map[string]string{
		"hash":     hash,
		"lenderId": lenderID,
		"action":   "FINANCED",
	}
	eventJSON, _ := json.Marshal(eventPayload)
	ctx.GetStub().SetEvent("InvoiceFinanced", eventJSON)

	return nil
}

// CloseInvoice closes a financed invoice
// CRITICAL: bindingHash, documentHash, and ipfsCID are IMMUTABLE - never modified
func (s *SmartContract) CloseInvoice(ctx contractapi.TransactionContextInterface, hash string) error {
	invoice, err := s.QueryInvoice(ctx, hash)
	if err != nil {
		return err
	}

	if invoice.Status != StatusFinanced {
		return fmt.Errorf("invoice must be FINANCED to close, current status: %s", invoice.Status)
	}

	// Update only mutable fields - Layer-3 fields remain unchanged
	invoice.Status = StatusClosed
	
	txTime, err := getTxTimestamp(ctx)
	if err != nil {
		return err
	}
	invoice.ClosedAt = txTime
	invoice.UpdatedAt = txTime
	// bindingHash, documentHash, ipfsCID are NEVER modified

	invoiceJSON, err := json.Marshal(invoice)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(hash, invoiceJSON)
	if err != nil {
		return err
	}

	// Emit event
	eventPayload := map[string]string{
		"hash":   hash,
		"action": "CLOSED",
	}
	eventJSON, _ := json.Marshal(eventPayload)
	ctx.GetStub().SetEvent("InvoiceClosed", eventJSON)

	return nil
}

// UnlockInvoice unlocks a locked invoice
// CRITICAL: bindingHash, documentHash, and ipfsCID are IMMUTABLE - never modified
func (s *SmartContract) UnlockInvoice(ctx contractapi.TransactionContextInterface, hash string, lenderID string) error {
	invoice, err := s.QueryInvoice(ctx, hash)
	if err != nil {
		return err
	}

	if invoice.Status != StatusLocked {
		return fmt.Errorf("invoice is %s, cannot unlock", invoice.Status)
	}

	if invoice.LockedBy != lenderID {
		return fmt.Errorf("invoice locked by %s, cannot be unlocked by %s", invoice.LockedBy, lenderID)
	}

	// Update only mutable fields - Layer-3 fields remain unchanged
	invoice.Status = StatusAvailable
	invoice.LockedBy = ""
	invoice.LenderID = ""  // PROBLEM 3 FIX: Clear lenderID when unlocking
	
	txTime, err := getTxTimestamp(ctx)
	if err != nil {
		return err
	}
	invoice.UpdatedAt = txTime
	// bindingHash, documentHash, ipfsCID are NEVER modified

	invoiceJSON, err := json.Marshal(invoice)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(hash, invoiceJSON)
	if err != nil {
		return err
	}

	// Emit event
	eventPayload := map[string]string{
		"hash":     hash,
		"lenderId": lenderID,
		"action":   "UNLOCKED",
	}
	eventJSON, _ := json.Marshal(eventPayload)
	ctx.GetStub().SetEvent("InvoiceUnlocked", eventJSON)

	return nil
}

// QueryInvoicesByStatus returns all invoices with a specific status
func (s *SmartContract) QueryInvoicesByStatus(ctx contractapi.TransactionContextInterface, status string) ([]*Invoice, error) {
	queryString := fmt.Sprintf(`{"selector":{"status":"%s"}}`, status)
	return s.getQueryResultForQueryString(ctx, queryString)
}

// QueryInvoicesByLender returns all invoices for a specific lender
func (s *SmartContract) QueryInvoicesByLender(ctx contractapi.TransactionContextInterface, lenderID string) ([]*Invoice, error) {
	queryString := fmt.Sprintf(`{"selector":{"$or":[{"lockedBy":"%s"},{"lenderId":"%s"}]}}`, lenderID, lenderID)
	return s.getQueryResultForQueryString(ctx, queryString)
}

// GetAllInvoices returns all invoices found in world state
func (s *SmartContract) GetAllInvoices(ctx contractapi.TransactionContextInterface) ([]*Invoice, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var invoices []*Invoice
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var invoice Invoice
		err = json.Unmarshal(queryResponse.Value, &invoice)
		if err != nil {
			return nil, err
		}
		invoices = append(invoices, &invoice)
	}

	return invoices, nil
}

// GetInvoiceHistory returns the history of an invoice
func (s *SmartContract) GetInvoiceHistory(ctx contractapi.TransactionContextInterface, hash string) ([]map[string]interface{}, error) {
	resultsIterator, err := ctx.GetStub().GetHistoryForKey(hash)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var history []map[string]interface{}
	for resultsIterator.HasNext() {
		response, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var invoice Invoice
		if len(response.Value) > 0 {
			err = json.Unmarshal(response.Value, &invoice)
			if err != nil {
				return nil, err
			}
		}

		record := map[string]interface{}{
			"txId":      response.TxId,
			"timestamp": time.Unix(response.Timestamp.Seconds, int64(response.Timestamp.Nanos)).Format(time.RFC3339),
			"isDelete":  response.IsDelete,
		}

		if !response.IsDelete {
			record["value"] = invoice
		}

		history = append(history, record)
	}

	return history, nil
}

// InvoiceExists returns true when invoice with given hash exists in world state
func (s *SmartContract) InvoiceExists(ctx contractapi.TransactionContextInterface, hash string) (bool, error) {
	invoiceJSON, err := ctx.GetStub().GetState(hash)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}

	return invoiceJSON != nil, nil
}

// getQueryResultForQueryString executes the passed in query string
func (s *SmartContract) getQueryResultForQueryString(ctx contractapi.TransactionContextInterface, queryString string) ([]*Invoice, error) {
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var invoices []*Invoice
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var invoice Invoice
		err = json.Unmarshal(queryResponse.Value, &invoice)
		if err != nil {
			return nil, err
		}
		invoices = append(invoices, &invoice)
	}

	return invoices, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&SmartContract{})
	if err != nil {
		fmt.Printf("Error creating invoice chaincode: %v\n", err)
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting invoice chaincode: %v\n", err)
	}
}
