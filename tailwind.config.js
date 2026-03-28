/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          DEFAULT: '#09090B',
          50: '#18181B',
          100: '#1a1a2e',
          200: '#27272A',
          300: '#3F3F46',
          400: '#52525B',
        },
        primary: {
          DEFAULT: '#3B82F6',
          light: '#60A5FA',
          dark: '#2563EB',
          glow: 'rgba(59, 130, 246, 0.5)',
        },
        secondary: {
          DEFAULT: '#8B5CF6',
          light: '#A78BFA',
          dark: '#7C3AED',
          glow: 'rgba(139, 92, 246, 0.5)',
        },
        accent: {
          success: '#22C55E',
          warning: '#F59E0B',
          error: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
        'gradient-primary-hover': 'linear-gradient(135deg, #2563EB, #7C3AED)',
        'gradient-glow': 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15))',
        'gradient-radial': 'radial-gradient(ellipse at center, var(--tw-gradient-stops))',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-slower': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'grid-fade': 'gridFade 4s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'breathe': 'breathe 4s ease-in-out infinite',
        'wave': 'wave 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(59,130,246,0.3), 0 0 60px rgba(59,130,246,0.1)' },
          '100%': { boxShadow: '0 0 40px rgba(139,92,246,0.4), 0 0 80px rgba(139,92,246,0.2)' },
        },
        gridFade: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '0.6' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.8' },
          '50%': { transform: 'scale(1.08)', opacity: '1' },
        },
        wave: {
          '0%, 100%': { transform: 'scaleY(1)' },
          '50%': { transform: 'scaleY(1.8)' },
        },
      },
      boxShadow: {
        'glow-sm': '0 0 20px rgba(59,130,246,0.3)',
        'glow-md': '0 0 40px rgba(59,130,246,0.3), 0 0 80px rgba(59,130,246,0.1)',
        'glow-lg': '0 0 60px rgba(59,130,246,0.4), 0 0 120px rgba(139,92,246,0.2)',
        'glow-purple': '0 0 40px rgba(139,92,246,0.3), 0 0 80px rgba(139,92,246,0.1)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'glass-lg': '0 16px 48px rgba(0, 0, 0, 0.4)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
