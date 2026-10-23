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
        serif: ['"Instrument Serif"', 'ui-serif', 'Georgia', 'serif'],
      },
      // Exaggerated, concentric radii: cards sit in a tray 6px larger than themselves.
      borderRadius: { DEFAULT: '10px', md: '12px', lg: '20px', xl: '24px', '2xl': '28px', '3xl': '32px' },
      maxWidth: { content: '1240px' },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.32, 0.72, 0, 1)',
        spring: 'cubic-bezier(0.32, 0.72, 0, 1)',
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      transitionDuration: { DEFAULT: '300ms' },
      boxShadow: {
        ambient: 'var(--shadow-ambient)',
        float: 'var(--shadow-float)',
      },
    },
  },
  plugins: [],
};
