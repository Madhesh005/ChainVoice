import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>

        {/* 404 Animation */}
        <div className="mb-8">
          <h1 className="font-display text-8xl sm:text-9xl font-bold mb-4">
            <span className="bg-gradient-to-r from-cyan via-emerald to-cyan bg-clip-text text-transparent animate-pulse">
              404
            </span>
          </h1>
          <div className="flex justify-center items-center space-x-2 mb-4">
            <div className="w-3 h-3 bg-cyan rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-emerald rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-3 h-3 bg-amber rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>

        <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
          Page Not Found
        </h2>
        <p className="text-lg text-gray-400 mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist on the blockchain. 
          It might have been moved or the link is broken.
        </p>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Link to="/" className="card hover:shadow-cyan-glow transition-all">
            <div className="text-3xl mb-2">🏠</div>
            <p className="font-medium">Home</p>
          </Link>
          <Link to="/auth/login" className="card hover:shadow-cyan-glow transition-all">
            <div className="text-3xl mb-2">🔐</div>
            <p className="font-medium">Login</p>
          </Link>
          <Link to="/shared/blockchain-explorer" className="card hover:shadow-cyan-glow transition-all">
            <div className="text-3xl mb-2">🔍</div>
            <p className="font-medium">Explorer</p>
          </Link>
        </div>

        <Link to="/" className="btn-primary inline-flex items-center space-x-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Home</span>
        </Link>

        {/* Error Code */}
        <div className="mt-12 pt-8 border-t border-navy-lighter">
          <p className="text-sm text-gray-500 font-mono">
            Error Code: 404 | ChainVoice v1.0.0
          </p>
        </div>
      </div>
    </div>
  );
}
