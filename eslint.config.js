export default [
    {
        ignores: ['dist/', 'node_modules/', '.astro/', '.vercel/', 'coverage/', '*.min.js', 'public/runtime-config.js', 'eslint.config.js'],
    },
    {
        files: ["src/**/*.{js,ts,jsx,tsx}", "*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                window: "readonly",
                document: "readonly",
                console: "readonly",
                process: "readonly",
                globalThis: "readonly",
            },
        },
        rules: {
            // TypeScript-specific rules
            "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
            "@typescript-eslint/explicit-function-return-types": ["warn", { allowExpressions: true }],
            "@typescript-eslint/no-explicit-any": "warn",

            // Code quality
            "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
            "no-console": ["warn", { allow: ["warn", "error"] }],
            "no-debugger": "error",
            "no-var": "warn",
            "prefer-const": "warn",
            "eqeqeq": ["warn", "always"],

            // Code style
            "indent": ["warn", 2],
            "quotes": ["warn", "single", { avoidEscape: true }],
            "semi": ["warn", "always"],
            "comma-dangle": ["warn", "always-multiline"],
            "object-curly-spacing": ["warn", "always"],
            "array-bracket-spacing": ["warn", "never"],
            "space-before-function-paren": ["warn", { anonymous: "always", named: "never", asyncArrow: "always" }],
            "keyword-spacing": "warn",
            "space-infix-ops": "warn",
            "eol-last": ["warn", "always"],
            "no-trailing-spaces": "warn",
            "linebreak-style": ["warn", "unix"],
            "curly": ["warn", "all"],
            "brace-style": ["warn", "1tbs"],
        },
    },
];
