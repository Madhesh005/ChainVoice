# 🧾 ChainVoice - Blockchain Invoice Financing Platform

<div align="center">
  <img src="public/favicon.svg" alt="ChainVoice Logo" width="120" height="120" />
  
  **One Invoice. One Financing. Zero Fraud.**
  
  A financial-grade blockchain platform for invoice financing, connecting MSMEs, Lenders, and Regulators through Hyperledger Fabric.
  
  [![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://github.com/tharunkumardeveloper/Chainvoice)
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
</div>

---

## 🌟 Features

### For MSMEs
- 📤 **Upload Invoices** - Drag & drop PDF/XML with OCR extraction
- 🪙 **FAB Tokens** - Fungible Asset-Backed tokens for verified invoices
- 💰 **Apply for Financing** - Get instant capital against verified invoices
- 📊 **Real-time Dashboard** - Track invoice status and financing

### For Lenders
- ✅ **Verify Invoices** - Blockchain-based duplicate detection
- 🔍 **Risk Assessment** - AI-powered credit scoring
- 💳 **Disburse Funds** - One-click financing with FAB token locking
- 📈 **Portfolio Management** - Track active financing and returns

### For Regulators
- 🔍 **Full Audit Trail** - Complete transaction history on Hyperledger
- 📊 **Cross-Lender Analytics** - System-wide insights
- 🚨 **Fraud Detection** - Real-time duplicate attempt alerts
- 📉 **Compliance Monitoring** - RBI Digital Lending Guidelines 2024

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Layer (React)                        │
│  MSME Portal  │  Lender Portal  │  Regulator Portal         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              API Gateway + Auth (JWT/OAuth2)                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│           Hyperledger Fabric Network                         │
│  Org1: Banks  │  Org2: NBFCs  │  Org3: Regulators           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Oracle Bridge (GSTN API) │ IPFS Storage │ PostgreSQL       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS with custom design system
- **Routing**: React Router v6
- **Blockchain**: Hyperledger Fabric (conceptual)
- **Storage**: IPFS (conceptual)
- **Fonts**: Syne (Display), DM Sans (Body), JetBrains Mono (Code)

---

## 📦 Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
# Clone the repository
git clone https://github.com/tharunkumardeveloper/Chainvoice.git
cd Chainvoice

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The app will be available at `http://localhost:5173`

---

## 🎨 Design System

### Colors
- **Navy**: `#0A0F1E` (Base background)
- **Cyan**: `#00D4FF` (Primary accent)
- **Amber**: `#F59E0B` (Warnings)
- **Emerald**: `#10B981` (Success)
- **Crimson**: `#EF4444` (Errors/Fraud)

### Typography
- **Display/Headers**: Syne (Geometric, authoritative)
- **Body**: DM Sans (Readable, modern)
- **Monospace**: JetBrains Mono (Technical credibility)

### Spacing
- Base grid: 8px
- Border radius: 12px (cards), 8px (inputs)
- Animations: 300ms ease-out transitions

---

## 📄 Key Pages

1. **Landing Page** (`/`) - Hero with animated network graph
2. **Login** (`/auth/login`) - Role-based authentication
3. **MSME Dashboard** (`/msme/dashboard`) - Invoice management
4. **Invoice Upload** (`/msme/invoices/upload`) - 3-step wizard with OCR
5. **Invoice Detail** (`/msme/invoices/:id`) - Blockchain timeline
6. **Lender Verify** (`/lender/verify`) - Duplicate detection
7. **Regulator Audit** (`/regulator/audit`) - Full transaction log
8. **Blockchain Explorer** (`/shared/blockchain-explorer`) - Public transparency

---

## 🔐 Security Features

- 256-bit encryption
- ISO 27001 compliant
- RBI Digital Lending Guidelines 2024
- Immutable blockchain audit trail
- Duplicate financing prevention
- GSTN API verification

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📝 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

**Tharun Kumar**
- GitHub: [@tharunkumardeveloper](https://github.com/tharunkumardeveloper)

---

## 🙏 Acknowledgments

- Built for TReDS (Trade Receivables Discounting System) compliance
- Inspired by India's MSME financing ecosystem
- Designed for RBI's Digital Lending Guidelines 2024

---

<div align="center">
  Made with ❤️ for India's MSME ecosystem
</div>
