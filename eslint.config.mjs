import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });
const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["scripts/**/*.cjs", "tests/**/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
];
export default config;
