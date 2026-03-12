package main

import (
	"fmt"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type SimpleContract struct {
	contractapi.Contract
}

func (s *SimpleContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	fmt.Println("Simple chaincode initialized")
	return nil
}

func (s *SimpleContract) Test(ctx contractapi.TransactionContextInterface) (string, error) {
	fmt.Println("Test function called")
	return "Hello from chaincode", nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&SimpleContract{})
	if err != nil {
		fmt.Printf("Error creating chaincode: %v\n", err)
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting chaincode: %v\n", err)
	}
}