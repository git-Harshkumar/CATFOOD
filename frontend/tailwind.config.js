/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neo: {
          bg: '#FAF6EC',
          ink: '#1A1A1A',
          'pastel-purple': '#C9B8F5',
          'pastel-orange': '#F5A868',
          'pastel-yellow': '#F5D876',
          'pastel-green': '#8FD6B0',
          'pastel-blue': '#A5C8F2',
          'pastel-pink': '#F5A8C8',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
      },
      borderWidth: {
        '3': '3px',
      },
      boxShadow: {
        'neo': '4px 4px 0px 0px #1A1A1A',
        'neo-lg': '8px 8px 0px 0px #1A1A1A',
        'neo-active': '2px 2px 0px 0px #1A1A1A',
      },
      borderRadius: {
        'neo': '1.5rem',
      }
    },
  },
  plugins: [],
}
