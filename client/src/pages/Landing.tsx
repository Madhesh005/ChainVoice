import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Logo from '../components/Logo';

export default function Landing() {
  const [invoiceCount, setInvoiceCount] = useState(2800);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setInvoiceCount(prev => prev + Math.floor(Math.random() * 3));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-navy">
      {/* Navigation */}
      <nav className="px-8 py-6 border-b border-navy-lighter">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Logo size="md" />
          <div className="flex items-center space-x-6">
            <Link to="/auth/login" className="text-gray-300 hover:text-cyan transition-colors">Login</Link>
            <Link to="/auth/register" className="btn-primary">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-4 sm:px-8 py-12 sm:py-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-center">
          {/* Left Column - 60% */}
          <div className="lg:col-span-3 space-y-6 sm:space-y-8">
            <div className="inline-flex items-center px-3 sm:px-4 py-2 rounded-full bg-cyan/10 border border-cyan/30">
              <span className="text-cyan text-xs sm:text-sm font-medium">Powered by Hyperledger Fabric</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight">
              <div className={`transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
                One Invoice.
              </div>
              <div className={`transition-all duration-500 delay-150 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
                One Financing.
              </div>
              <div className={`transition-all duration-500 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'} text-cyan`}>
                Zero Fraud.
              </div>
            </h1>

            <p className="text-base sm:text-lg text-gray-300 max-w-2xl leading-relaxed">
              ChainVoice creates a cryptographic single-source-of-truth for every invoice across 
              India's entire lending ecosystem — powered by Hyperledger Fabric + IPFS.
            </p>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
              <Link to="/auth/register?role=msme" className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 text-center">
                Get Started as MSME
              </Link>
              <Link to="/auth/register?role=lender" className="btn-secondary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 text-center">
                Lender / NBFC Access
              </Link>
              <Link to="/auth/register?role=regulator" className="text-cyan hover:text-cyan-dark transition-colors text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 flex items-center justify-center space-x-2">
                <span>Regulator Portal</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Right Column - 40% */}
          <div className="lg:col-span-2 relative hidden sm:block">
            <NetworkGraph invoiceCount={invoiceCount} />
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <StatsBar />

      {/* How It Works */}
      <HowItWorks />

      {/* Architecture Diagram */}
      <ArchitectureDiagram />

      {/* Footer */}
      <Footer />
    </div>
  );
}

function NetworkGraph({ invoiceCount }: { invoiceCount: number }) {
  return (
    <div className="relative w-full h-96 flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan/5 to-transparent rounded-2xl"></div>
      
      {/* Center Node */}
      <div className="relative z-10 w-32 h-32 bg-gradient-to-br from-cyan to-cyan-dark rounded-full flex items-center justify-center shadow-cyan-glow animate-pulse">
        <span className="font-display text-xl font-bold">Invoice</span>
      </div>

      {/* Connected Nodes */}
      {[
        { label: 'GSTN', angle: 0, color: 'emerald' },
        { label: 'IPFS', angle: 60, color: 'cyan' },
        { label: 'Bajaj', angle: 120, color: 'amber' },
        { label: 'SBI', angle: 180, color: 'cyan' },
        { label: 'HDFC', angle: 240, color: 'emerald' },
        { label: 'RBI', angle: 300, color: 'amber' },
      ].map((node, i) => {
        const radius = 140;
        const x = Math.cos((node.angle * Math.PI) / 180) * radius;
        const y = Math.sin((node.angle * Math.PI) / 180) * radius;
        
        return (
          <div
            key={i}
            className="absolute z-0 w-20 h-20 bg-navy-light border-2 border-navy-lighter rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 hover:border-cyan hover:scale-110"
            style={{
              left: `calc(50% + ${x}px - 2.5rem)`,
              top: `calc(50% + ${y}px - 2.5rem)`,
              animation: `float ${3 + i * 0.5}s ease-in-out infinite`,
            }}
          >
            {node.label}
          </div>
        );
      })}

      {/* Live Counter */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-navy-light border border-cyan/30 rounded-lg px-6 py-3">
        <p className="text-sm text-gray-400">Verified Today</p>
        <p className="text-2xl font-mono font-bold text-cyan">{invoiceCount.toLocaleString()}</p>
      </div>
    </div>
  );
}

function StatsBar() {
  const [counts, setCounts] = useState([0, 0, 0, 0]);
  const targets = [4200, 12400, 34, 0];

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;

    let step = 0;
    const timer = setInterval(() => {
      step++;
      setCounts(targets.map(target => Math.floor((target * step) / steps)));
      if (step >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="px-4 sm:px-8 py-8 sm:py-12 bg-navy-light border-y border-navy-lighter">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
        <div className="text-center">
          <p className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-cyan mb-2">₹{counts[0]} Cr</p>
          <p className="text-xs sm:text-sm text-gray-400">Protected from duplicate financing</p>
        </div>
        <div className="text-center">
          <p className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-cyan mb-2">{counts[1].toLocaleString()}+</p>
          <p className="text-xs sm:text-sm text-gray-400">Invoices on-chain</p>
        </div>
        <div className="text-center">
          <p className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-cyan mb-2">{counts[2]}ms</p>
          <p className="text-xs sm:text-sm text-gray-400">Average verification time</p>
        </div>
        <div className="text-center">
          <p className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-emerald mb-2">{counts[3]}</p>
          <p className="text-xs sm:text-sm text-gray-400">Duplicate financing incidents</p>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="px-4 sm:px-8 py-12 sm:py-20">
      <div className="max-w-7xl mx-auto">
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-center mb-8 sm:mb-16">
          From Upload to Disbursement in 3 Steps
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 relative">
          {/* Connecting Line */}
          <div className="hidden md:block absolute top-24 left-1/4 right-1/4 h-0.5 border-t-2 border-dashed border-cyan/30"></div>

          {/* Step 1 */}
          <div className="card hover:shadow-cyan-glow transition-all duration-300 relative">
            <div className="w-16 h-16 bg-cyan/10 rounded-xl flex items-center justify-center mb-6 mx-auto">
              <span className="text-4xl">📤</span>
            </div>
            <h3 className="font-display text-2xl font-bold mb-4 text-center">MSME Uploads Invoice</h3>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Invoice PDF/XML uploaded → OCR extracts fields → SHA-256 hash generated → stored on IPFS
            </p>
            <div className="inline-flex px-3 py-1 bg-cyan/10 border border-cyan/30 rounded-full text-cyan text-sm font-medium">
              IPFS + OCR
            </div>
          </div>

          {/* Step 2 */}
          <div className="card hover:shadow-cyan-glow transition-all duration-300 relative">
            <div className="w-16 h-16 bg-emerald/10 rounded-xl flex items-center justify-center mb-6 mx-auto">
              <span className="text-4xl">🛡️</span>
            </div>
            <h3 className="font-display text-2xl font-bold mb-4 text-center">GST Oracle Verifies</h3>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Async oracle hits GSTN API → confirms invoice legitimacy → FAB Token minted on Hyperledger
            </p>
            <div className="inline-flex px-3 py-1 bg-emerald/10 border border-emerald/30 rounded-full text-emerald text-sm font-medium">
              Hyperledger Fabric
            </div>
          </div>

          {/* Step 3 */}
          <div className="card hover:shadow-cyan-glow transition-all duration-300 relative">
            <div className="w-16 h-16 bg-amber/10 rounded-xl flex items-center justify-center mb-6 mx-auto">
              <span className="text-4xl">⚡</span>
            </div>
            <h3 className="font-display text-2xl font-bold mb-4 text-center">Lender Disburses</h3>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Lender checks FAB Token → disburses only once → token burned → repayment tracked on-chain
            </p>
            <div className="inline-flex px-3 py-1 bg-amber/10 border border-amber/30 rounded-full text-amber text-sm font-medium">
              Smart Contract
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ArchitectureDiagram() {
  const [hoveredLayer, setHoveredLayer] = useState<number | null>(null);

  const layers = [
    { name: 'User Layer', desc: 'MSME Portal | Lender Portal | Regulator Portal', color: 'cyan' },
    { name: 'API Gateway + Auth', desc: 'JWT + OAuth2 Authentication', color: 'emerald' },
    { name: 'Hyperledger Fabric Network', desc: 'Org1: Banks | Org2: NBFCs | Org3: Regulators', color: 'amber' },
    { name: 'Oracle Bridge', desc: 'GSTN API (async verification)', color: 'cyan' },
    { name: 'Storage Layer', desc: 'IPFS Storage + PostgreSQL (off-chain metadata)', color: 'emerald' },
  ];

  return (
    <section className="px-4 sm:px-8 py-12 sm:py-20 bg-navy-light">
      <div className="max-w-7xl mx-auto">
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-center mb-4">
          Hybrid Audit Architecture
        </h2>
        <p className="text-center text-gray-400 mb-8 sm:mb-16 text-sm sm:text-base">Tap each layer to learn more</p>

        <div className="space-y-4">
          {layers.map((layer, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoveredLayer(i)}
              onMouseLeave={() => setHoveredLayer(null)}
              onClick={() => setHoveredLayer(hoveredLayer === i ? null : i)}
              className={`p-4 sm:p-6 rounded-xl border-2 transition-all duration-300 cursor-pointer ${
                hoveredLayer === i
                  ? `border-${layer.color} bg-${layer.color}/5 shadow-lg`
                  : 'border-navy-lighter bg-navy hover:border-navy-lighter/50'
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-display text-base sm:text-xl font-bold mb-1">{layer.name}</h3>
                  <p className="text-gray-400 text-xs sm:text-sm">{layer.desc}</p>
                </div>
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${hoveredLayer === i ? `bg-${layer.color}` : 'bg-gray-600'}`}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="px-4 sm:px-8 py-8 sm:py-12 border-t border-navy-lighter">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12 mb-6 sm:mb-8">
          {/* Col 1 */}
          <div>
            <div className="mb-4">
              <Logo size="md" />
            </div>
            <p className="text-gray-400 mb-4">
              Blockchain-powered invoice financing for India's MSME ecosystem
            </p>
            <div className="inline-flex px-3 py-1 bg-emerald/10 border border-emerald/30 rounded-full text-emerald text-sm font-medium">
              Built for TReDS Compliance
            </div>
          </div>

          {/* Col 2 */}
          <div>
            <h4 className="font-display text-lg font-bold mb-4">Quick Links</h4>
            <div className="space-y-2">
              <Link to="/auth/register?role=msme" className="block text-gray-400 hover:text-cyan transition-colors">MSME Portal</Link>
              <Link to="/auth/register?role=lender" className="block text-gray-400 hover:text-cyan transition-colors">Lender Portal</Link>
              <Link to="/auth/register?role=regulator" className="block text-gray-400 hover:text-cyan transition-colors">Regulator Portal</Link>
              <Link to="/shared/blockchain-explorer" className="block text-gray-400 hover:text-cyan transition-colors">Blockchain Explorer</Link>
            </div>
          </div>

          {/* Col 3 */}
          <div>
            <h4 className="font-display text-lg font-bold mb-4">Tech Stack</h4>
            <div className="flex flex-wrap gap-2">
              {['Hyperledger', 'IPFS', 'React', 'Node.js', 'PostgreSQL', 'TypeScript'].map((tech) => (
                <span key={tech} className="px-3 py-1 bg-navy-light border border-navy-lighter rounded-lg text-sm text-gray-400">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-navy-lighter text-center text-gray-400 text-sm">
          ChainVoice operates under RBI's Digital Lending Guidelines 2024
        </div>
      </div>
    </footer>
  );
}
