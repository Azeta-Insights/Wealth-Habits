/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        olive: {
          50: '#F4F7F4',
          100: '#E4ECE4',
          200: '#C7D9C7',
          300: '#A3BFB3',
          400: '#759A7E',
          500: '#53775B',
          600: '#406047',
          700: '#344D3A',
          800: '#2B3E30',
          900: '#233227',
          DEFAULT: '#3D5A45',
        },
        sand: {
          50: '#FDFBF7',
          100: '#F8F4EC',
          200: '#EFE9DE',
          300: '#E2D9CA',
          400: '#C9BBA8',
          500: '#AB9983',
          DEFAULT: '#FDFBF7',
        },
        need: {
          bg: '#EAF5EC',
          text: '#20603D',
          border: '#BFE3C7',
        },
        want: {
          bg: '#FEF3EB',
          text: '#B25E1A',
          border: '#FCD8BD',
        }
      },
      fontFamily: {
        serif: ['Lora', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
