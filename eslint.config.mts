import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config({
  files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
  extends: [js.configs.recommended, ...tseslint.configs.recommended],
  languageOptions: {
    globals: globals.browser,
  },
  rules: {
    // Отключаем ошибку на использование any
    "@typescript-eslint/no-explicit-any": "off",
  },
});
