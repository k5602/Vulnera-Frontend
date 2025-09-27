/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        'mono': ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      colors: {
        'cyber': {
          50: '#f0ffff',
          100: '#ccfffe',
          200: '#99fffc',
          300: '#5cfffa',
          400: '#1affef',
          500: '#00e5d1',
          600: '#00b8a6',
          700: '#009688',
          800: '#00766a',
          900: '#004d40',
          950: '#002e26',
        },
        'matrix': {
          50: '#f0fff4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.8s ease-in-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'scan': 'scan 3s linear infinite',
        'terminal': 'terminal 1s ease-in-out infinite',
      }
    }
  },
  plugins: [],
}
