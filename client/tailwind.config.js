/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0A0F1E',
          light: '#1A2332',
          lighter: '#2A3342',
        },
        cyan: {
          DEFAULT: '#00D4FF',
          dark: '#00A8CC',
        },
        amber: {
          DEFAULT: '#F59E0B',
        },
        emerald: {
          DEFAULT: '#10B981',
        },
        crimson: {
          DEFAULT: '#EF4444',
        },
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        sans: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        card: '12px',
        input: '8px',
      },
      boxShadow: {
        'cyan-glow': '0 0 20px rgba(0, 212, 255, 0.3)',
      },
    },
  },
  plugins: [],
}
