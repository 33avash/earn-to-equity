/** @type {import('tailwindcss').Config} */
const rgb = (v) => `rgb(var(${v}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic tokens (see src/index.css)
        background: rgb('--background'),
        foreground: rgb('--foreground'),
        card: rgb('--card'),
        muted: { DEFAULT: rgb('--muted'), foreground: rgb('--muted-foreground') },
        border: rgb('--border'),
        accent: { DEFAULT: rgb('--accent'), subtle: rgb('--accent-subtle'), foreground: rgb('--accent-foreground') },
        success: rgb('--success'),
        warning: rgb('--warning'),
        ring: rgb('--ring'),
        // Legacy names, aliased to the semantic tokens
        ivory: rgb('--c-ivory'),
        surface: rgb('--c-surface'),
        forest: rgb('--c-forest'),
        evergreen: rgb('--c-evergreen'),
        sage: rgb('--c-sage'),
        mint: rgb('--c-mint'),
        charcoal: rgb('--c-charcoal'),
        grey: rgb('--c-grey'),
        champagne: rgb('--c-champagne'),
        line: rgb('--c-line'),
        danger: rgb('--c-danger'),
        onbrand: rgb('--c-onbrand'),
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
        display: ['Geist', 'system-ui', 'sans-serif'],
      },
      borderRadius: { DEFAULT: '6px', md: '8px', lg: '12px' },
      maxWidth: { content: '1200px' },
    },
  },
  plugins: [],
};
