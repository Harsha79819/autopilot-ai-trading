/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#080B12',
        surface: {
          DEFAULT: '#0F172A',
          glass: 'rgba(15, 23, 42, 0.65)',
          border: 'rgba(255, 255, 255, 0.08)',
          hover: 'rgba(255, 255, 255, 0.05)',
        },
        accent: {
          cyan: '#06B6D4',
          blue: '#3B82F6',
          violet: '#8B5CF6',
          purple: '#A855F7',
          emerald: '#10B981',
          rose: '#F43F5E',
          amber: '#F59E0B',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-glow-blue': '0 0 25px -5px rgba(59, 130, 246, 0.3)',
        'glass-glow-violet': '0 0 25px -5px rgba(139, 92, 246, 0.3)',
        'glass-glow-cyan': '0 0 25px -5px rgba(6, 182, 212, 0.3)',
        'glass-glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.3)',
      },
      backdropBlur: {
        'glass': '16px',
        'subtle': '8px',
      }
    },
  },
  plugins: [],
}
