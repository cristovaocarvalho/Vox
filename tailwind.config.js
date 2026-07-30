/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js,ts,jsx,tsx}",
    "./src/index.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        background: '#0D0D0F',
        surface: '#16161A',
        'surface-elevated': '#1E1E24',
        border: '#2A2A35',
        accent: '#FFFFFF',
        'accent-hover': '#E2E8F0',
        'text-primary': '#E8E8F0',
        'text-secondary': '#8888A0',
        'text-disabled': '#444455',
        success: '#4ADE80',
        error: '#F87171',
        warning: '#FBBF24'
      }
    }
  },
  plugins: []
}
