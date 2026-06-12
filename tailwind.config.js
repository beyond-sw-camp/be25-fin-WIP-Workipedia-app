/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Workipedia 브랜드 (웹 로그인/소스카드에서 추출)
        brand: '#208AEF',
        brandDark: '#0f172a',
        ink: '#1c1917',
        muted: '#717182',
      },
    },
  },
  plugins: [],
};
