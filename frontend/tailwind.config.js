/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Premium corporate pink — primary brand color.
        primary: {
          50: '#fdeff7',
          100: '#fadeee', // light pink
          200: '#f6c0df',
          300: '#f19dcd',
          400: '#ed7dbc',
          500: '#eb74b8',
          600: '#ea6bb3', // base — brand color
          700: '#e02891', // dark primary
          800: '#c41c7b',
          900: '#9c1662',
          950: '#5d0d3b',
        },
        // Warm amber — achievement / certification gold. Kept distinct from
        // primary pink so certification cards/badges stay visually separate.
        accent: {
          50: '#fdf6e8',
          100: '#faeac2',
          200: '#f4d488',
          300: '#edba4d',
          400: '#e3a008',
          500: '#d98e04',
          600: '#b57303',
          700: '#8f5a03',
          800: '#6b4302',
          900: '#4a2e02',
        },
        paper: {
          light: '#fff8fc',
          dark: '#1a0e16',
        },
        surface: {
          light: '#ffffff',
          dark: '#241521',
        },
        ink: {
          light: '#241221',
          dark: '#f6e8f1',
        },
        success: '#2f855a',
        warning: '#c9820a',
        danger: '#c1443b',
      },
      fontFamily: {
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
        body: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        card: '16px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(181, 23, 95, 0.06), 0 8px 20px rgba(214, 51, 132, 0.08)',
        'card-hover': '0 4px 10px rgba(181, 23, 95, 0.10), 0 12px 28px rgba(214, 51, 132, 0.12)',
      },
    },
  },
  plugins: [],
};
