/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        yellow: 'var(--thunder-yellow)',
        navy: { DEFAULT: 'var(--thunder-navy)', deep: 'var(--thunder-navy-deep)' },
        blue: 'var(--thunder-blue)',
        ink: 'var(--thunder-white)',
        steel: 'var(--thunder-steel)',
        success: 'var(--success)',
        danger: 'var(--danger)',
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      minHeight: { tap: '56px', cta: '64px' },
      minWidth: { tap: '56px' },
    },
  },
  plugins: [],
};
