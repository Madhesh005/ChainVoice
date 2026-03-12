interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export default function Logo({ size = 'md', showText = true }: LogoProps) {
  const sizes = {
    sm: 'w-7 h-7 sm:w-8 sm:h-8',
    md: 'w-9 h-9 sm:w-10 sm:h-10',
    lg: 'w-10 h-10 sm:w-12 sm:h-12',
  };

  const textSizes = {
    sm: 'text-base sm:text-lg',
    md: 'text-lg sm:text-xl',
    lg: 'text-xl sm:text-2xl',
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Logo Icon - Hexagonal blockchain-inspired design */}
      <div className={`${sizes[size]} relative flex items-center justify-center flex-shrink-0`}>
        {/* Outer hexagon */}
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00D4FF" />
              <stop offset="100%" stopColor="#00A8CC" />
            </linearGradient>
          </defs>
          {/* Hexagon shape */}
          <polygon
            points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5"
            fill="url(#logoGradient)"
            stroke="#00D4FF"
            strokeWidth="2"
          />
          {/* Inner chain link symbol */}
          <path
            d="M 35 40 L 45 30 L 55 30 L 65 40 M 35 60 L 45 70 L 55 70 L 65 60 M 45 40 L 45 60 M 55 40 L 55 60"
            stroke="#0A0F1E"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>
      {showText && (
        <span className={`font-display ${textSizes[size]} font-bold whitespace-nowrap`}>
          ChainVoice
        </span>
      )}
    </div>
  );
}
