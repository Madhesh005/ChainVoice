# ChainVoice - Blockchain-Based Invoice Financing Platform

A comprehensive blockchain-based invoice financing platform built with Hyperledger Fabric, React, and Node.js. ChainVoice enables secure, transparent, and efficient invoice financing through blockchain technology with IPFS document storage and cryptographic integrity verification.

## 🏗️ Architecture

### Core Components

1. **Frontend (React + TypeScript)**
   - Modern React application with TypeScript
   - Role-based dashboards (MSME, Lender, Regulator)
   - Real-time invoice status tracking
   - Responsive design with Tailwind CSS

2. **Backend (Node.js + Express)**
   - RESTful API server
   - ERP integration (Odoo)
   - Blockchain abstraction layer
   - Authentication and authorization

3. **Blockchain Layer (Hyperledger Fabric)**
   - Smart contracts (Go chaincode)
   - Multi-organization network
   - Immutable invoice registry
   - Cryptographic proof system

4. **Storage Layer**
   - PostgreSQL for application data
   - IPFS for document storage
   - Layer-3 cryptographic binding

## 🚀 Features

### For MSMEs (Sellers)
- **ERP Integration**: Seamless connection with Odoo ERP systems
- **Invoice Registration**: One-click blockchain registration
- **Document Integrity**: Cryptographic proof of document authenticity
- **Financing Requests**: Submit invoices for financing
- **Real-time Tracking**: Monitor invoice status throughout lifecycle

### For Lenders
- **Invoice Verification**: Comprehensive due diligence tools
- **Risk Assessment**: Automated scoring and analysis
- **Portfolio Management**: Track financed invoices
- **Disbursement**: Streamlined payment processing

### For Regulators
- **Audit Trail**: Complete transaction history
- **Compliance Monitoring**: Real-time oversight
- **Reporting**: Comprehensive analytics and reports

## 🔧 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Axios** for API communication

### Backend
- **Node.js** with Express.js
- **PostgreSQL** for data persistence
- **Hyperledger Fabric SDK** for blockchain interaction
- **IPFS** for decentralized storage
- **JWT** for authentication

### Blockchain
- **Hyperledger Fabric 2.5**
- **Go** chaincode (smart contracts)
- **Docker** for containerization
- **CouchDB/LevelDB** for state database

## 📋 Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Git
- PostgreSQL 13+
- Go 1.19+ (for chaincode development)

## 🛠️ Installation & Setup

### 1. Clone Repository
```bash
git clone https://github.com/Madhesh005/ChainVoice.git
cd ChainVoice
```

### 2. Setup Hyperledger Fabric Network
```bash
cd fabric-samples/test-network
./network.sh up createChannel -ca -s couchdb
./network.sh deployCC -ccn invoicecc -ccp ../../chaincode -ccl go
```

### 3. Setup Backend
```bash
cd invoice-backend
npm install
cp .env.example .env
# Configure environment variables
npm run setup-fabric
node server.js
```

### 4. Setup Frontend
```bash
cd client
npm install
cp .env.example .env
# Configure API endpoints
npm run dev
```

## 🔐 Security Features

### Cryptographic Integrity
- **GIID Generation**: SHA-256 based Global Invoice ID
- **Document Hashing**: Immutable PDF fingerprinting
- **Binding Hash**: Cryptographic link between invoice and document
- **IPFS Storage**: Decentralized document storage with content addressing

### Access Control
- **Role-based Authentication**: MSME, Lender, Regulator roles
- **JWT Tokens**: Secure session management
- **API Rate Limiting**: Protection against abuse
- **Input Validation**: Comprehensive data sanitization

### Blockchain Security
- **Multi-signature**: Requires endorsement from multiple peers
- **Immutable Ledger**: Tamper-proof transaction history
- **Smart Contract Validation**: Business logic enforcement
- **TLS Encryption**: Secure peer communication

## 📊 Key Workflows

### Invoice Registration Flow
1. **ERP Sync**: Fetch invoice data from connected ERP
2. **Canonicalization**: Convert to standard format and generate GIID
3. **Document Processing**: Download and hash PDF document
4. **IPFS Upload**: Store document in decentralized storage
5. **Blockchain Registration**: Record on Hyperledger Fabric
6. **Verification**: Cryptographic integrity validation

### Financing Flow
1. **Invoice Discovery**: Lenders browse available invoices
2. **Due Diligence**: Verify invoice authenticity and creditworthiness
3. **Financing Offer**: Submit financing terms
4. **Acceptance**: MSME accepts financing offer
5. **Disbursement**: Automated payment processing
6. **Settlement**: Handle repayment and closure

## 🔄 Reconciliation System

The platform includes a robust reconciliation mechanism to handle blockchain network resets:

- **Database-First Approach**: Invoice details always load from database
- **Blockchain Verification**: Optional blockchain status checking
- **Automatic Re-registration**: Seamless recovery from ledger resets
- **Conflict Resolution**: Prevents duplicate registrations

## 📈 Monitoring & Analytics

- **Real-time Dashboards**: Live invoice and financing metrics
- **Audit Trails**: Complete transaction history
- **Performance Metrics**: System health and usage statistics
- **Compliance Reports**: Regulatory reporting tools

## 🧪 Testing

### Backend Tests
```bash
cd invoice-backend
npm test
node test-fabric-connection.js
```

### Frontend Tests
```bash
cd client
npm test
```

### Integration Tests
```bash
# Test complete invoice registration flow
node test-complete-flow.js
```

## 📚 API Documentation

The platform provides comprehensive REST APIs:

- **Authentication**: `/api/auth/*`
- **Invoice Management**: `/api/invoices/*`
- **ERP Integration**: `/api/erp/*`
- **Financing**: `/api/financing/*`
- **Verification**: `/verify/*`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation in `/docs`
- Review the troubleshooting guide

## 🔮 Roadmap

- [ ] Multi-ERP support (SAP, Oracle)
- [ ] Advanced analytics and ML-based risk scoring
- [ ] Mobile applications
- [ ] Cross-border financing support
- [ ] Integration with traditional banking systems

---

**ChainVoice** - Revolutionizing invoice financing through blockchain technology.