/** @type {import('tailwindcss').Config} */
export default {
  prefix: 'tw-',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  corePlugins: { preflight: false }, // don't reset styles Bootstrap relies on
  theme: { extend: {} },
  plugins: [],
};
