/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ivory: 'rgb(var(--c-ivory) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        forest: 'rgb(var(--c-forest) / <alpha-value>)',
        evergreen: 'rgb(var(--c-evergreen) / <alpha-value>)',
        sage: 'rgb(var(--c-sage) / <alpha-value>)',
        mint: 'rgb(var(--c-mint) / <alpha-value>)',
        charcoal: 'rgb(var(--c-charcoal) / <alpha-value>)',
        grey: 'rgb(var(--c-grey) / <alpha-value>)',
        champagne: 'rgb(var(--c-champagne) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
        onbrand: 'rgb(var(--c-onbrand) / <alpha-value>)',
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: { DEFAULT: '4px', md: '6px' },
      maxWidth: { content: '1200px' },
    },
  },
  plugins: [],
};
