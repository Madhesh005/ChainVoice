import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../../components/Logo';
import { registerLender } from '../../utils/api';

export default function LenderRegister() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    institution_name: '',
    contact_person: '',
    email: '',
    phone: '',
    rbi_license_number: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password strength
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    try {
      const response = await registerLender({
        institution_name: formData.institution_name,
        contact_person: formData.contact_person,
        email: formData.email,
        phone: formData.phone,
        license_number: formData.rbi_license_number,
        password: formData.password,
      });

      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/auth/login');
        }, 2000);
      } else {
        setError(response.message || 'Registration failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy relative overflow-hidden flex items-center justify-center px-4 py-12">
      {/* Subtle grid pattern background */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'linear-gradient(rgba(16,185,129,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.1) 1px, transparent 1px)',
        backgroundSize: '50px 50px'
      }}></div>

      <div className="relative w-full max-w-2xl">
        {/* Logo */}
        <Link to="/" className="flex justify-center mb-8">
          <Logo size="lg" />
        </Link>

        {/* Card */}
        <div className="card space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald/10 rounded-2xl mb-4">
              <svg className="w-8 h-8 text-emerald" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="font-display text-3xl font-bold mb-2">Lender Registration</h2>
            <p className="text-gray-400">Register your financial institution</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Success Message */}
            {success && (
              <div className="bg-emerald/10 border border-emerald/30 rounded-lg p-3 text-emerald text-sm">
                Registration successful! Redirecting to login...
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Institution Name */}
            <div>
              <label className="block text-sm font-medium mb-2">Institution Name *</label>
              <input 
                type="text" 
                name="institution_name"
                className="input w-full" 
                placeholder="ABC Financial Services Ltd." 
                value={formData.institution_name}
                onChange={handleChange}
                required 
              />
            </div>

            {/* Contact Person */}
            <div>
              <label className="block text-sm font-medium mb-2">Contact Person *</label>
              <input 
                type="text" 
                name="contact_person"
                className="input w-full" 
                placeholder="John Doe" 
                value={formData.contact_person}
                onChange={handleChange}
                required 
              />
            </div>

            {/* Email and Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email *</label>
                <input 
                  type="email" 
                  name="email"
                  className="input w-full" 
                  placeholder="contact@institution.com" 
                  value={formData.email}
                  onChange={handleChange}
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone *</label>
                <input 
                  type="tel" 
                  name="phone"
                  className="input w-full" 
                  placeholder="+91 98765 43210" 
                  value={formData.phone}
                  onChange={handleChange}
                  required 
                />
              </div>
            </div>

            {/* RBI License Number */}
            <div>
              <label className="block text-sm font-medium mb-2">RBI License Number *</label>
              <input 
                type="text" 
                name="rbi_license_number"
                className="input w-full" 
                placeholder="N-XX-XXXXX" 
                value={formData.rbi_license_number}
                onChange={handleChange}
                required 
              />
              <p className="text-xs text-gray-500 mt-1">Enter your RBI registration/license number</p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-2">Password *</label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  name="password"
                  className="input w-full pr-12" 
                  placeholder="••••••••" 
                  value={formData.password}
                  onChange={handleChange}
                  required 
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-emerald transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium mb-2">Confirm Password *</label>
              <input 
                type={showPassword ? 'text' : 'password'} 
                name="confirmPassword"
                className="input w-full" 
                placeholder="••••••••" 
                value={formData.confirmPassword}
                onChange={handleChange}
                required 
              />
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-start space-x-3">
              <input 
                type="checkbox" 
                id="terms" 
                className="mt-1 w-4 h-4 rounded border-navy-lighter bg-navy text-emerald focus:ring-emerald focus:ring-offset-navy"
                required 
              />
              <label htmlFor="terms" className="text-sm text-gray-400">
                I agree to the{' '}
                <Link to="/terms" className="text-emerald hover:underline">Terms of Service</Link>
                {' '}and{' '}
                <Link to="/privacy" className="text-emerald hover:underline">Privacy Policy</Link>
              </label>
            </div>

            {/* Register Button */}
            <button 
              type="submit" 
              className="btn-primary w-full flex items-center justify-center space-x-2 bg-emerald hover:bg-emerald/90"
              disabled={loading || success}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <span>Register Institution</span>
                  <span>→</span>
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <p className="text-center text-gray-400 text-sm">
            Already have an account?{' '}
            <Link to="/auth/login" className="text-emerald hover:underline font-medium">
              Sign in →
            </Link>
          </p>

          {/* Security Badge */}
          <div className="pt-4 border-t border-navy-lighter">
            <div className="flex items-center justify-center space-x-3 text-xs text-gray-500">
              <span className="flex items-center space-x-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span>Secure Registration</span>
              </span>
              <span>·</span>
              <span>RBI Compliant</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
