/** @type {import('tailwindcss').Config} */
export default {
  prefix: 'tw-',
  darkMode: ['selector', '[data-bs-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  corePlugins: { preflight: false }, // don't reset styles Bootstrap relies on
  theme: { extend: {} },
  plugins: [],
};
