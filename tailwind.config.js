/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0a0e1a',
        'bg-secondary': '#12182b',
        'bg-tertiary': '#1a2137',
        'accent-primary': '#5b8def',
        'accent-hover': '#4a7de8',
        'text-primary': '#e8edf5',
        'text-secondary': '#9ca9c4',
        'text-tertiary': '#6b7a99',
      },
      fontFamily: {
        display: ['Lexend Deca', 'sans-serif'],
        body: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        'sm-dark': '0 1px 3px rgba(0, 0, 0, 0.4)',
        'md-dark': '0 4px 12px rgba(0, 0, 0, 0.5)',
        'lg-dark': '0 8px 24px rgba(0, 0, 0, 0.6)',
        'glow': '0 0 20px rgba(91, 141, 239, 0.2)',
      },
      transitionDuration: {
        '250': '250ms',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
