/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        // Qelvora International School Design Tokens
        bg: '#F8F7F3',
        surface: '#FFFFFF',
        'surface-2': '#F3F1EA',
        border: '#E4E2DA',
        text: '#1F2937',
        'text-muted': '#5B6676',

        // Dynamic Accent Token (Picks up active role automatically)
        accent: {
          DEFAULT: 'var(--accent)',
          soft: 'var(--accent-soft)',
          hover: 'var(--accent-hover)',
          admin: '#3F6486',
          'admin-soft': '#E6EDF4',
          'admin-hover': '#345575',
          teacher: '#4F7A64',
          'teacher-soft': '#E7F0EA',
          'teacher-hover': '#416650',
          family: '#4A6F94',
          'family-soft': '#E8EFF6',
          'family-hover': '#3E5F80',
        },

        // Decorative Gold (Restricted to small touches)
        gold: {
          DEFAULT: '#B8864B',
          text: '#8A6228',
          soft: '#F9F5EC',
        },

        // Semantic Status Tokens (Clear meaning + soft tint)
        status: {
          success: '#2F7D5B',
          'success-soft': '#EAF4EF',
          warning: '#B7791F',
          'warning-soft': '#FAF0DE',
          danger: '#B42318',
          'danger-soft': '#FBEAE8',
          info: '#2B6CB0',
          'info-soft': '#EBF2FA',
        },

        // Compatibility Palette Mappings
        qelvora: {
          navy: '#3F6486',
          navyLight: '#E6EDF4',
          navyDark: '#345575',
          pageBg: '#F8F7F3',
          card: '#FFFFFF',
          textPrimary: '#1F2937',
          textSecondary: '#5B6676',
          border: '#E4E2DA',
          activeBg: 'var(--accent-soft)',
          activeText: 'var(--accent)',
        },
        role: {
          admin: '#3F6486',
          adminBg: '#E6EDF4',
          teacher: '#4F7A64',
          teacherDark: '#416650',
          teacherBg: '#E7F0EA',
          teacherLight: '#E7F0EA',
          student: '#4A6F94',
          studentDark: '#3E5F80',
          studentBg: '#E8EFF6',
          studentLight: '#E8EFF6',
          parent: '#4A6F94',
          parentBg: '#E8EFF6',
        },
        semantic: {
          success: '#2F7D5B',
          successBg: '#EAF4EF',
          warning: '#B7791F',
          warningBg: '#FAF0DE',
          danger: '#B42318',
          dangerBg: '#FBEAE8',
          info: '#2B6CB0',
          infoBg: '#EBF2FA',
          neutral: '#5B6676',
          neutralBg: '#F3F1EA',
        },
        saas: {
          sidebar: '#FFFFFF',
          hover: '#F3F1EA',
          activeBg: 'var(--accent-soft)',
          activeText: 'var(--accent)',
          sidebarText: '#5B6676',
          pageBg: '#F8F7F3',
          card: '#FFFFFF',
          secondaryBg: '#F3F1EA',
          border: '#E4E2DA',
          divider: '#E4E2DA',
          btn: 'var(--accent)',
          btnHover: 'var(--accent-hover)',
          heading: '#1F2937',
          body: '#1F2937',
          secondary: '#5B6676',
          muted: '#8A9AAF',
          inputBg: '#FFFFFF',
          inputBorder: '#E4E2DA',
          tableHeader: '#F3F1EA',
          tableHover: '#F8F7F3',
          focusRing: 'var(--accent)',
          success: '#2F7D5B',
          successBg: '#EAF4EF',
          warning: '#B7791F',
          warningBg: '#FAF0DE',
          danger: '#B42318',
          dangerBg: '#FBEAE8',
          info: '#2B6CB0',
          infoBg: '#EBF2FA',
        },
      },
      boxShadow: {
        'subtle': '0 1px 2px rgba(31, 41, 55, 0.05)',
        'card': '0 1px 2px rgba(31, 41, 55, 0.05), 0 0 0 1px #E4E2DA',
        'card-hover': '0 4px 12px rgba(31, 41, 55, 0.06), 0 0 0 1px #E4E2DA',
        'modal': '0 8px 30px rgba(31, 41, 55, 0.12)',
        'drawer': '0 20px 25px -5px rgba(31, 41, 55, 0.15)',
      },
      borderRadius: {
        'lg': '0.625rem', // 10px
        'xl': '0.75rem',  // 12px
        '2xl': '1rem',    // 16px
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 2s ease-in-out infinite',
        'fadeIn': 'fadeIn 0.2s ease-out',
        'popIn': 'popIn 0.25s ease-out',
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
