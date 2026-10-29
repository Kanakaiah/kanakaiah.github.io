/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--bg-color)',
        'glass-bg': 'var(--glass-bg)',
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        muted: 'var(--text-muted)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-light': 'var(--accent-light)',
        gold: 'var(--gold)',
        card: 'var(--card-bg)',
        'card-elevated': 'var(--card-bg-elevated)',
        'card-border': 'var(--card-border)',
        'card-border-hover': 'var(--card-border-hover)',
        'card-hover': 'var(--card-hover)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        system: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        figtree: ['Figtree', 'sans-serif'],
        publicsans: ['"Public Sans"', 'sans-serif'],
        roboto: ['Figtree', 'Roboto', 'sans-serif'],
        opensans: ['"Public Sans"', '"Open Sans"', 'sans-serif'],
        heading: ['var(--font-heading)', 'Georgia', 'serif'],
        serif: ['Merriweather', 'Georgia', 'serif'],
        hyper: ['"Atkinson Hyperlegible"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
