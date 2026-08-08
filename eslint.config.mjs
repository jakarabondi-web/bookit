/**
 * ESLint flat config.
 *
 * Next 16 dropped the `next lint` wrapper, so ESLint is invoked directly and
 * the config that `next lint` used to assemble behind the scenes lives here.
 * `eslint-config-next` ships both halves as flat-config arrays: the rules for
 * React and Core Web Vitals, and the TypeScript layer on top.
 */
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const config = [
  {
    // Build output and coverage — nothing here is hand-written.
    ignores: [".next/**", "coverage/**", "next-env.d.ts"],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      // A leading underscore marks a parameter kept for signature compatibility
      // — `RiskService.assess` takes an actor it does not use yet, and dropping
      // it would change the call signature. Same convention for caught errors.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // `src/server/container.ts` breaks the checkout/payments cycle with a
      // binding declared first and assigned once the other side exists. The
      // closures that read it only run after that, but the rule cannot see it,
      // and `const` is not an option for a value that arrives later.
      "prefer-const": ["error", { ignoreReadBeforeAssign: true }],
    },
  },
];

export default config;
