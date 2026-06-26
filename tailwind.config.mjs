/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#FAFAF5',
        ink: '#1A1A1A',
        muted: '#6B7280',
        brown: '#57392E',
        terracotta: '#B28471',
        sand: '#E6C497',
        rose: '#C1A8A1',
        steel: '#7D98AB',
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
