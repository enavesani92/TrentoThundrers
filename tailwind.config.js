const c = (name) => `rgb(var(--${name}-rgb) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        yellow: c('thunder-yellow'),
        navy: { DEFAULT: c('thunder-navy'), deep: c('thunder-navy-deep') },
        blue: c('thunder-blue'),
        ink: c('thunder-white'),
        steel: c('thunder-steel'),
        success: c('success'),
        danger: c('danger'),
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
