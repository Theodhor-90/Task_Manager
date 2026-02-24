Now I have all the information needed. Let me produce the revised plan.

# Task 1 Implementation Plan: Shared UI Components

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/client/src/components/ui/loading-spinner.tsx` | Create | Reusable animated spinner with configurable size |
| 2 | `packages/client/src/components/ui/error-message.tsx` | Create | Dismissable error banner for displaying error states |
| 3 | `packages/client/src/components/ui/modal.tsx` | Create | Overlay modal with close-on-escape and click-outside |
| 4 | `packages/client/src/components/ui/confirm-dialog.tsx` | Create | Destructive action confirmation dialog built on Modal |
| 5 | `packages/client/package.json` | Modify | Add test devDependencies and `test` script |
| 6 | `packages/client/vitest.config.ts` | Create | Vitest configuration with jsdom environment |
| 7 | `packages/client/src/test/setup.ts` | Create | Test setup file for `@testing-library/jest-dom` matchers |

## 2. Dependencies

- **Runtime**: React 19 (already installed)
- **Styling**: Tailwind CSS 3.4 (already installed and configured)
- **Test devDependencies to install**: `vitest@^3.0.0`, `@testing-library/react@^16.0.0`, `@testing-library/jest-dom@^6.0.0`, `jsdom@^25.0.0` (vitest version matches `^3.0.0` used by server and shared packages)
- **No other tasks or components are prerequisites** — this is Task 1 of the phase

## 3. Implementation Details

### 3.0 Test Infrastructure Setup

This step must be completed before any tests can be written or run.

#### 3.0.1 Add devDependencies to `packages/client/package.json`

Add the following to the `devDependencies` object:

```json
"vitest": "^3.0.0",
"@testing-library/react": "^16.0.0",
"@testing-library/jest-dom": "^6.0.0",
"jsdom": "^25.0.0"
```

Add a `test` script to the `scripts` object:

```json
"test": "vitest run"
```

Then run `npm install` from the project root to install the new dependencies via npm workspaces.

#### 3.0.2 Create `packages/client/vitest.config.ts`

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    passWithNoTests: true,
  },
});
```

Key decisions:
- `environment: "jsdom"` — required for rendering React components in tests.
- `plugins: [react()]` — reuses the same Vite React plugin so JSX transforms work in tests.
- `setupFiles` — points to the test setup file that registers `@testing-library/jest-dom` matchers.
- `passWithNoTests: true` — matches the convention in the server vitest config.

#### 3.0.3 Create `packages/client/src/test/setup.ts`

```typescript
import "@testing-library/jest-dom";
```

This single import registers all custom matchers (e.g., `toBeInTheDocument()`, `toHaveClass()`) globally for all test files.

### 3.1 LoadingSpinner (`loading-spinner.tsx`)

**Purpose**: Render an animated SVG spinner, centered in its container, at one of three sizes.

**Named export**: `LoadingSpinner`

**Interface**:
```typescript
interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
}
```

**Size mapping**:
| Size | Tailwind class | Pixels |
|------|---------------|--------|
| `sm` | `h-4 w-4` | 16px |
| `md` | `h-8 w-8` | 32px |
| `lg` | `h-12 w-12` | 48px |

Default size: `md`.

**Implementation**:
- Outer `<div>` with `className="flex items-center justify-center"` for centering.
- Inner `<svg>` element with Tailwind's `animate-spin` class and `text-blue-600` color.
- The SVG is a circle spinner (standard Tailwind spinner pattern): a partially transparent circle with a visible arc. Specifically, use the well-known two-circle SVG pattern:
  - A full circle with `opacity-25` as the track
  - A partial arc path with `opacity-75` as the spinning indicator
- `viewBox="0 0 24 24"`, `fill="none"`, circle with `cx="12" cy="12" r="10"` and `stroke="currentColor"` `strokeWidth="4"`.
- The arc path: `M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z` with `fill="currentColor"`.
- Apply `role="status"` and `aria-label="Loading"` for accessibility.

**Styling patterns** (matching existing codebase):
- Uses `text-blue-600` to match the blue accent used in buttons and focus rings throughout the app.
- No custom CSS — only Tailwind utility classes.

### 3.2 ErrorMessage (`error-message.tsx`)

**Purpose**: Display a styled error banner with optional dismiss capability.

**Named export**: `ErrorMessage`

**Interface**:
```typescript
interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
}
```

**Implementation**:
- Outer `<div>` with `role="alert"` for accessibility.
- Styling: `rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700` — this matches the existing error display pattern already used in `login-page.tsx` (line 49: `rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700`), but slightly refined with `rounded-md` and `py-3` for more breathing room as a standalone component.
- Inner layout uses `flex items-center justify-between` so the message and dismiss button sit on the same line.
- Message text in a `<p>` element.
- When `onDismiss` is provided, render a dismiss button: a `<button>` with an `×` character, styled `text-red-500 hover:text-red-700`, with `aria-label="Dismiss"`.
- When `onDismiss` is not provided, no dismiss button is rendered.

### 3.3 Modal (`modal.tsx`)

**Purpose**: Render a centered overlay modal with backdrop, supporting multiple close mechanisms.

**Named export**: `Modal`

**Interface**:
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}
```

**Implementation**:

- **Early return**: If `isOpen` is `false`, return `null`.
- **Portal rendering**: Use `ReactDOM.createPortal` to render into `document.body`. This prevents z-index and overflow issues from parent containers.
- **Backdrop**: A `<div>` covering the full viewport with `fixed inset-0 z-50 flex items-center justify-center bg-black/50` (semi-transparent black overlay). The `onClick` on this backdrop calls `onClose` (click-outside-to-dismiss).
- **Content card**: A `<div>` inside the backdrop with `relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl`. This div calls `e.stopPropagation()` on its `onClick` to prevent clicks inside the modal from triggering the backdrop's close handler.
- **Close button**: An absolute-positioned button in the top-right corner (`absolute right-4 top-4`) rendering an `×` character with `text-gray-400 hover:text-gray-600`. Has `aria-label="Close"`.
- **Title**: If `title` is provided, render an `<h2>` with `mb-4 text-lg font-semibold text-gray-900`.
- **Children**: Rendered below the title.
- **Escape key**: A `useEffect` registers a `keydown` listener on `document` that calls `onClose` when `event.key === "Escape"`. The effect depends on `[isOpen, onClose]` and only registers when `isOpen` is `true`. Cleans up on unmount or when `isOpen` becomes `false`.
- **Body scroll lock**: A `useEffect` sets `document.body.style.overflow = "hidden"` when `isOpen` is `true` and restores it to `""` on cleanup.

**Import**: `import { createPortal } from "react-dom"`.

### 3.4 ConfirmDialog (`confirm-dialog.tsx`)

**Purpose**: A specialized modal for confirming destructive actions with cancel/confirm buttons.

**Named export**: `ConfirmDialog`

**Interface**:
```typescript
interface ConfirmDialogProps {
  isOpen: boolean;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}
```

**Implementation**:
- Renders a `<Modal>` component with `isOpen={isOpen}`, `onClose={onCancel}`, and `title="Confirm"`.
- Inside the modal children:
  - A `<p>` with `mb-6 text-sm text-gray-600` displaying the `message` prop.
  - A button row: `<div className="flex justify-end gap-3">` containing:
    - **Cancel button**: `<button>` with text "Cancel", styled `rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50`. Calls `onCancel` on click.
    - **Confirm button**: `<button>` with text from `confirmLabel` (default: `"Confirm"`), styled `rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700`. Calls `onConfirm` on click.
- Button styling follows the existing codebase patterns: `rounded-md`, `px-4 py-2`, `text-sm font-medium`, consistent hover states.

## 4. Contracts

### LoadingSpinner

**Input**: Optional `size` prop.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Controls spinner dimensions |

**Output**: Renders a centered animated SVG spinner.

**Example usage**:
```tsx
<LoadingSpinner />            // medium (32px) spinner
<LoadingSpinner size="sm" />  // small (16px) spinner
<LoadingSpinner size="lg" />  // large (48px) spinner
```

### ErrorMessage

**Input**:

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `message` | `string` | Yes | Error text to display |
| `onDismiss` | `() => void` | No | Callback when dismiss button is clicked |

**Output**: Renders a red alert banner. Dismiss button only shown when `onDismiss` is provided.

**Example usage**:
```tsx
<ErrorMessage message="Something went wrong" />
<ErrorMessage message="Invalid input" onDismiss={() => setError(null)} />
```

### Modal

**Input**:

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Controls visibility |
| `onClose` | `() => void` | Yes | Called on X click, backdrop click, or Escape |
| `title` | `string` | No | Optional heading |
| `children` | `ReactNode` | Yes | Modal body content |

**Output**: When `isOpen` is `true`, renders a portal with backdrop overlay and centered content card. When `false`, renders nothing.

**Example usage**:
```tsx
<Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Edit Project">
  <form>...</form>
</Modal>
```

### ConfirmDialog

**Input**:

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Controls visibility |
| `message` | `string` | Yes | Warning text |
| `confirmLabel` | `string` | No | Confirm button text (default: "Confirm") |
| `onConfirm` | `() => void` | Yes | Called when confirm button clicked |
| `onCancel` | `() => void` | Yes | Called when cancel button clicked or modal closed |

**Output**: Renders a Modal with warning message and cancel/confirm action buttons.

**Example usage**:
```tsx
<ConfirmDialog
  isOpen={showConfirm}
  message="This will permanently delete the project and all its tasks."
  confirmLabel="Delete"
  onConfirm={handleDelete}
  onCancel={() => setShowConfirm(false)}
/>
```

## 5. Test Plan

### Test Setup

- Test framework: Vitest + React Testing Library (installed in step 3.0)
- Test file location: `packages/client/src/components/ui/__tests__/` (following the convention of co-located tests)
- Each component gets its own test file

### 5.1 LoadingSpinner Tests (`loading-spinner.test.tsx`)

| # | Test | Description |
|---|------|-------------|
| 1 | renders with default size | Renders the spinner, verifies the SVG has `h-8 w-8` classes (md default) |
| 2 | renders with sm size | Pass `size="sm"`, verify SVG has `h-4 w-4` classes |
| 3 | renders with lg size | Pass `size="lg"`, verify SVG has `h-12 w-12` classes |
| 4 | has accessible role | Verify the SVG has `role="status"` |
| 5 | has animate-spin class | Verify the SVG has the `animate-spin` class |

### 5.2 ErrorMessage Tests (`error-message.test.tsx`)

| # | Test | Description |
|---|------|-------------|
| 1 | renders message text | Pass `message="Test error"`, verify text is in the document |
| 2 | has alert role | Verify the container has `role="alert"` |
| 3 | renders dismiss button when onDismiss provided | Pass `onDismiss`, verify button with `aria-label="Dismiss"` exists |
| 4 | does not render dismiss button when onDismiss omitted | Omit `onDismiss`, verify no dismiss button is present |
| 5 | calls onDismiss when dismiss button clicked | Click the dismiss button, verify the callback was called |

### 5.3 Modal Tests (`modal.test.tsx`)

| # | Test | Description |
|---|------|-------------|
| 1 | renders nothing when isOpen is false | Pass `isOpen={false}`, verify nothing is rendered |
| 2 | renders children when isOpen is true | Pass `isOpen={true}` with children, verify children are visible |
| 3 | renders title when provided | Pass `title="Test"`, verify `<h2>` with text "Test" exists |
| 4 | does not render title when omitted | Omit `title`, verify no `<h2>` |
| 5 | calls onClose when close button clicked | Click the X button, verify `onClose` was called |
| 6 | calls onClose when Escape key pressed | Fire `keydown` event with `key: "Escape"`, verify `onClose` was called |
| 7 | calls onClose when backdrop clicked | Click the backdrop overlay, verify `onClose` was called |
| 8 | does not call onClose when content card clicked | Click inside the modal content, verify `onClose` was NOT called |

### 5.4 ConfirmDialog Tests (`confirm-dialog.test.tsx`)

| # | Test | Description |
|---|------|-------------|
| 1 | renders nothing when isOpen is false | Pass `isOpen={false}`, verify nothing is rendered |
| 2 | renders message when open | Pass `isOpen={true}` and `message`, verify message text is visible |
| 3 | renders default confirm label | Omit `confirmLabel`, verify button text is "Confirm" |
| 4 | renders custom confirm label | Pass `confirmLabel="Delete"`, verify button text is "Delete" |
| 5 | calls onConfirm when confirm button clicked | Click the confirm button, verify `onConfirm` was called |
| 6 | calls onCancel when cancel button clicked | Click the cancel button, verify `onCancel` was called |
| 7 | calls onCancel when modal is closed via Escape | Press Escape, verify `onCancel` was called (since `onClose={onCancel}`) |

## 6. Implementation Order

1. **Test infrastructure setup** — Add devDependencies to `packages/client/package.json`, run `npm install` from the project root, create `packages/client/vitest.config.ts`, and create `packages/client/src/test/setup.ts`. Verify with `cd packages/client && npx vitest run` (should pass with no tests).
2. **`loading-spinner.tsx`** — No dependencies on other new components. Simplest component, establishes the `ui/` directory.
3. **`error-message.tsx`** — No dependencies on other new components. Second simplest.
4. **`modal.tsx`** — No dependencies on other new components, but more complex (portal, escape key, click-outside).
5. **`confirm-dialog.tsx`** — Depends on `Modal`, so must come after it.
6. **Tests** — Write tests for all four components after they are created. Tests can be written in parallel since they are independent, but all source files must exist first.

## 7. Verification Commands

```bash
# 1. Install new test dependencies (from project root)
npm install

# 2. Verify test infrastructure works (should pass with no tests initially)
cd packages/client && npx vitest run

# 3. Verify component files exist
ls packages/client/src/components/ui/

# 4. TypeScript compilation check
cd packages/client && npx tsc --noEmit

# 5. Run the dev server to verify no runtime errors
npm run dev

# 6. Run component tests
cd packages/client && npx vitest run src/components/ui/__tests__/

# 7. Verify named exports are correct (quick import check via tsc)
cd packages/client && npx tsc --noEmit
```