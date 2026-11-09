# @workspace/ui - Design System Standards

## Overview

This package contains shared UI components based on shadcn/ui, used across all frontend applications.

---

## Technology Stack

- **Base**: shadcn/ui components
- **Styling**: Tailwind CSS v4
- **Icons**: lucide-react

---

## CRITICAL: Always Use shadcn/ui Components

**NEVER create custom components when shadcn/ui provides one.** This is a strict requirement.

### Before Creating Any Component:

1. **CHECK** if shadcn/ui has the component: https://ui.shadcn.com/docs/components
2. **ADD** the component using CLI: `pnpm dlx shadcn@latest add [component]`
3. **ONLY** create custom components if shadcn/ui doesn't provide one

### Common Components (USE THESE):

| Need | shadcn Component | DON'T USE |
|------|------------------|-----------|
| Text input | `Input` | `<input>` |
| Dropdown | `Select` | `<select>` |
| Checkbox | `Checkbox` | `<input type="checkbox">` |
| Radio | `RadioGroup` | `<input type="radio">` |
| Button | `Button` | `<button>` |
| Form | `Form` (with react-hook-form) | manual form handling |
| Modal | `Dialog` | custom modals |
| Toast | `Sonner` or `Toast` | custom notifications |

---

## Component Standards

- **ALWAYS** use shadcn/ui as the foundation
- Components must be fully typed with TypeScript
- Export components from the package index
- Use `cn()` utility for class merging

### Adding New Components

1. Use shadcn CLI when possible: `pnpm dlx shadcn@latest add [component]`
2. After adding, move from `@/components/` to `src/components/`
3. Fix imports: `@/lib/utils` → `../lib/utils`
4. Fix radix imports: `radix-ui` → `@radix-ui/react-[component]`
5. Customize only when necessary
6. Keep components generic and reusable
7. Document props with JSDoc comments when behavior isn't obvious

---

## Styling Standards

- **NEVER** hardcode colors — use CSS variables from `globals.css`
- All colors must use the theme system (`--primary`, `--background`, etc.)
- Support both light and dark modes
- Use semantic color names (`destructive`, `muted`, `accent`)
- If a new color is needed, add it as a CSS variable in `src/styles/globals.css` (both `:root` and `.dark`), map it in `@theme inline`, then use it via Tailwind

### Color Token Usage

```typescript
// BAD
className="bg-[#0D1B2A] text-white"

// GOOD
className="bg-card text-card-foreground"
```

### Gradients

- Gradients MUST be defined as reusable classes in `src/styles/globals.css` — NEVER inline gradient definitions in components
- Define in `@layer base` or `@layer utilities` so they are available everywhere
- Use CSS variables for gradient color stops to support dark mode

```css
/* globals.css — GOOD */
@layer utilities {
  .gradient-primary {
    background: linear-gradient(to right, var(--primary), var(--accent));
  }
}
```

```typescript
// Component — GOOD
className="gradient-primary"

// Component — BAD
className="bg-gradient-to-r from-[#6366f1] to-[#818cf8]"
```

---

## Export Pattern

- **ALWAYS** use named exports
- Export from component files, not barrel files when possible
- Keep exports organized by component type

```typescript
// components/button.tsx
export { Button, buttonVariants } from "./button";
```

---

## Accessibility

- All interactive components must be keyboard accessible
- Use proper ARIA attributes
- Ensure sufficient color contrast
- Test with screen readers when adding new components
