/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // 自定义暗色主题配色
        'hub': {
          'bg': '#0a0a0f',
          'card': '#12121a',
          'card-hover': '#1a1a25',
          'border': '#2a2a3a',
          'accent': '#6366f1',
          'accent-hover': '#818cf8',
          'text': '#e4e4e7',
          'text-muted': '#71717a',
          'success': '#22c55e',
          'warning': '#f59e0b',
          'danger': '#ef4444',
        },
      },
      fontFamily: {
        sans: ['JetBrains Mono', 'SF Pro Display', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};

