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
        card: 'var(--card-bg)',
        'card-elevated': 'var(--card-bg-elevated)',
        'card-border': 'var(--card-border)',
        'card-hover': 'var(--card-hover)',
      },
      fontFamily: {
        sans: ['var(--font-primary)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-heading)', 'system-ui', 'sans-serif'],
        serif: ['Merriweather', 'Georgia', 'serif'],
        hyper: ['"Atkinson Hyperlegible"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
