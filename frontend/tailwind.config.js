/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          page: '#f8fafc',
          card: '#ffffff',
          muted: '#f1f5f9',
        },
        border: {
          subtle: '#e2e8f0',
          focus: '#10b981',
        },
        content: {
          primary: '#0f172a',
          secondary: '#475569',
          muted: '#64748b',
        },
        brand: {
          DEFAULT: '#059669',
          accent: '#059669',
          hover: '#047857',
          light: '#ecfdf5',
        },
        status: {
          success: '#16a34a',
          'success-surface': '#f0fdf4',
          warning: '#ca8a04',
          'warning-surface': '#fefce8',
          danger: '#dc2626',
          'danger-surface': '#fef2f2',
        },
      },
    },
  },
  plugins: [],
}
