import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../../components/Logo';

export default function Register() {
  const navigate = useNavigate();
  const [role, setRole] = useState<'msme' | 'lender' | 'regulator'>('msme');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Redirect to specific registration page based on role
    if (role === 'msme') {
      navigate('/auth/msme/register');
    } else if (role === 'lender') {
      navigate('/auth/lender/register');
    } else {
      // Regulator cannot register - show message
      alert('Regulator accounts cannot be registered. Please contact the administrator.');
    }
  };

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex justify-center mb-6">
            <Logo size="lg" />
          </Link>
          <h2 className="font-display text-3xl font-bold">Create Account</h2>
          <p className="text-gray-400 mt-2">Join the blockchain financing revolution</p>
        </div>

        <form onSubmit={handleRegister} className="card space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">I am a</label>
            <select 
              value={role} 
              onChange={(e) => setRole(e.target.value as any)}
              className="input w-full"
            >
              <option value="msme">MSME (Small Business)</option>
              <option value="lender">Lender (Financial Institution)</option>
              <option value="regulator">Regulator</option>
            </select>
          </div>

          <button type="submit" className="btn-primary w-full">
            Continue to Registration
          </button>

          <p className="text-center text-gray-400 text-sm">
            Already have an account?{' '}
            <Link to="/auth/login" className="text-cyan hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
