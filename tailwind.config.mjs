/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#FAFAF8',
        ink: '#1A1A1A',
        muted: '#6B7280',
        ocean: {
          DEFAULT: '#1B6CA8',
          dark: '#155a8a',
          light: '#2580c1',
        },
        sand: {
          DEFAULT: '#D4A96A',
          light: '#e8c897',
          dark: '#b8893e',
        },
        whatsapp: '#25D366',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
