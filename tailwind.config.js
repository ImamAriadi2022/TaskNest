/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        win: {
          bg: 'rgba(32, 32, 32, 0.75)',
          border: 'rgba(255, 255, 255, 0.08)',
          hover: 'rgba(255, 255, 255, 0.06)',
          active: 'rgba(255, 255, 255, 0.04)',
          text: '#f3f3f3',
          'text-secondary': '#cccccc',
          accent: '#0078d4',
          'accent-hover': '#0086f0',
        }
      },
      backdropBlur: {
        win: '32px',
      },
      boxShadow: {
        win: '0 8px 32px 0 rgba(0, 0, 0, 0.24)',
      },
      fontFamily: {
        segoe: ['"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'slide-up': 'slideUp 0.25s cubic-bezier(0.1, 0.9, 0.2, 1) forwards',
        'fade-in': 'fadeIn 0.15s ease-out forwards',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.1, 0.9, 0.2, 1) forwards',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(15px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
