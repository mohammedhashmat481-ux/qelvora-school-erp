/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        saas: {
          sidebar: '#172B4D',
          hover: '#29456D',
          activeBg: '#DBEAFE',
          activeText: '#172B4D',
          sidebarText: '#F3F6FC',
          pageBg: '#F7F9FC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          btn: '#29456D',
          btnHover: '#172B4D',
          heading: '#172B4D',
          body: '#334155',
          secondary: '#64748B',
          inputBg: '#FFFFFF',
          inputBorder: '#CBD5E1',
          tableHeader: '#EFF4FA',
          tableHover: '#F1F6FD',
          focusRing: '#93C5FD',
        },
        primary: {
          50: '#F7F9FC',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#29456D',
          600: '#29456D',
          700: '#172B4D',
          800: '#172B4D',
          900: '#0F1E36',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 2s ease-in-out infinite',
        'fadeIn': 'fadeIn 0.3s ease-out',
        'popIn': 'popIn 0.5s ease-out',
      },
      keyframes: {
        scan: {
          '0%, 100%': { transform: 'translateY(-100%)' },
          '50%': { transform: 'translateY(100%)' },
        },
      },
    },
  },
  plugins: [],
};
