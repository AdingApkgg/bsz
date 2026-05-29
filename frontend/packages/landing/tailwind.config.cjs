/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("@bsz/shared/tailwind-preset")],
  content: ["./src/**/*.{ts,tsx,html}", "./index.html", "../shared/src/**/*.{ts,tsx}"],
  plugins: [require("tailwindcss-animate")],
};
