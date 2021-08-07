module.exports = {
    extends: ["eslint:recommended", "prettier"],
    env: {
        es6: true,
        jest: true,
        browser: true,
    },
    parserOptions: {
        ecmaVersion: 2018,
        sourceType: "module",
        ecmaFeatures: {
            jsx: true,
            impliedStrict: true,
            experimentalObjectRestSpread: true,
        },
    },
    plugins: ["react", "prettier"],
    rules: {
        "react/jsx-indent": [1, 4],
        "react/jsx-filename-extension": [1, {extensions: [".js", ".jsx"]}],
        "no-useless-constructor": "off",
        curly: ["error", "all"],
        "object-curly-spacing": ["error", "never"],
        quotes: ["error", "double", {allowTemplateLiterals: true}],
        "max-classes-per-file": ["off", 2],
        "import/prefer-default-export": "off",
        "no-return-await": "error",
        "no-underscore-dangle": ["error", {allow: ["_id", "__v", "__t"]}],
        "no-throw-literal": "error",
        "no-self-compare": "error",
        "no-param-reassign": ["error", {props: false}],
        "no-unreachable": "error",
        "no-console": "off",
        "class-methods-use-this": ["warn"],
        radix: ["warn", "as-needed"],
        yoda: ["error", "never", {exceptRange: true}],
        "no-unused-vars": "off",
        "no-shadow": "off",
        camelcase: ["off"],
        "no-use-before-define": "off",
    },
    settings: {
        "import/resolver": {
            node: {
                extensions: [".js"],
            },
        },
    },
};
