/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0a0f',
          secondary: '#12121a',
          card: '#1a1a2e',
        },
        gold: {
          DEFAULT: '#d4af37',
          bright: '#f4d03f',
        },
        text: {
          primary: '#ffffff',
          secondary: '#a0a0b0',
        },
        india: '#ff4444',
        china: '#00ffff',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #f4d03f, #d4af37, #f4d03f)',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      fontSize: {
        h1: 'clamp(2rem, 6vw, 4rem)',
        h2: 'clamp(1.5rem, 4vw, 3rem)',
        h3: 'clamp(1.25rem, 3vw, 2rem)',
        body: 'clamp(1rem, 2vw, 1.25rem)',
      },
      transitionTimingFunction: {
        cinematic: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      screens: {
        tablet: '768px',
        desktop: '1024px',
      },
    },
  },
  plugins: [],
}
