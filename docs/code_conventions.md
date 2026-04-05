## Naming Conventions

- Vue Components should always be in PascalCase (`BlockEditor.vue`) and always multi-word.
- TypeScript files should always be in camelCase (`blockStore.ts`).
- API routes should be in kebab-case (`/api/blocks`).
- Tests should either end with `.test.ts` or `.spec.ts`
- Variables must be in camelCase (`blockData`), constants in UPPER_SNAKE_CASE (`MAX_BLOCKS`).

## TypeScript/JavaScript

- Prefer Type over Interface for defining types, unless you need declaration merging or to describe an object with callable properties.
- Prefer arrow functions for all function definitions, except when defining methods on classes or objects.
- Avoid using `any` type; use `unknown` if you need to represent an unknown type and want to enforce type checking when using it.
- Avoid generic types or types that are too broad (e.g. `Record<string, string>`)
- Break down long types with smaller ones, like splitting profile props from user to have `User` and `UserProfile`.
- Avoid multiple if clauses and nested ternaries; prefer early returns and guard clauses for better readability.
- Function parameters cannot be more than 3, and if they are, consider refactoring to use an options object or breaking the function into smaller ones.
- Format dates and numeric values with the EcmaScript Internationalization API (`Intl.DateTimeFormat`, `Intl.NumberFormat`, `Intl.RelativeTimeFormat`) to ensure proper localization and formatting across different locales.

## CSS

- Use CSS nesting whenever possible, but avoid deep nesting (more than 3 levels) to maintain readability and prevent overly specific selectors.
- Use container queries to handle responsive design on components.
- Reuse values with custom properties (CSS variables) to maintain consistency and make it easier to update styles across the app. Never use hardcoded colors, use tokens and preferably oklch values.
- Avoid using !important to override styles, instead use specificity and cascade layers (@layer)
- Prefer gap over margin for spacing between elements in flex and grid layouts.
- RTL/LTR Support: Always use logical properties (e.g., margin-inline-start, padding-block-end) instead of physical properties (e.g., margin-left, padding-bottom) to ensure proper support for both left-to-right and right-to-left languages.
- Prefer rem units for font sizes and spacing.
- Use the `:is()` CSS pseudo-class to group selectors that share the same styles, reducing redundancy and improving maintainability.

## Comments

- Functions should be self-explanatory and not require many comments to being with. But when necessary, use JSDoc style comments for functions, especially if they are part of a public API or have complex logic.
- Avoid vague or redundant comments that only explain what the code is doing without providing additional context or reasoning. Instead, focus on explaining why certain decisions were made or any non-obvious behavior.

## Framework

- use `defineModel()` to implement a two-way binding.
- Use @vueuse/core composables for common logic that can be reused across components, such as fetching data, managing state, or handling user interactions. This promotes code reuse and separation of concerns.
- Use built-in `useState()` Nuxt for state management to avoid hydration issues..
- use `v-bind()` to bind dynamic attributes and props in templates on CSS.
- Avoid using DOM queries directly such as `document.querySelector()` or `getElementById()`. Instead, use Vue's template refs (`ref`) or `useTemplateRef()` to access DOM elements in a reactive way.

## Tests

- Do not test implementation details, only test the expected behavior of the component or function/composable.
