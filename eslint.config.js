import jasmine from "eslint-plugin-jasmine"
import js from "@eslint/js"
import {jsdoc} from "eslint-plugin-jsdoc"
import globals from "globals"
import {defineConfig} from "eslint/config"

export default defineConfig([
  jasmine.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    plugins: {jasmine, js},
    extends: ["js/recommended"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.jasmine
      }
    },
  },
  jsdoc({
    config: "flat/recommended",
    rules: {
      "jsdoc/reject-any-type": "off",
      "jsdoc/require-param-description": "off",
      "jsdoc/require-property-description": "off",
      "jsdoc/require-returns-description": "off"
    }
  }),
  {
    rules: {
      "react/display-name": "off",
      "react/no-direct-mutation-state": "off",
      "react/prop-types": "off"
    }
  }
])
