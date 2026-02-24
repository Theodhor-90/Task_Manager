## Objective

Create the reusable UI primitives that the rest of Phase 1 (and Phase 2) depend on. These are foundational components used across the entire authenticated UI.

## Deliverables

### 1. LoadingSpinner
- **File**: `packages/client/src/components/ui/loading-spinner.tsx` (Create)
- A centered spinner component accepting an optional `size` prop (`sm | md | lg`)
- Uses Tailwind's `animate-spin` on an SVG circle
- Named export: `LoadingSpinner`

### 2. ErrorMessage
- **File**: `packages/client/src/components/ui/error-message.tsx` (Create)
- A styled error banner accepting a `message: string` prop and an optional `onDismiss` callback
- Red background, white text, dismiss button
- Named export: `ErrorMessage`

### 3. Modal
- **File**: `packages/client/src/components/ui/modal.tsx` (Create)
- An overlay modal with a white content card, close button (X), click-outside-to-dismiss, and Escape key to close
- Props: `isOpen: boolean`, `onClose: () => void`, `title?: string`, `children: ReactNode`
- Named export: `Modal`

### 4. ConfirmDialog
- **File**: `packages/client/src/components/ui/confirm-dialog.tsx` (Create)
- Extends `Modal` with a warning message, a "Cancel" button, and a destructive "Confirm" button (red)
- Props: `message: string`, `confirmLabel?: string`, `onConfirm: () => void`, `onCancel: () => void`, `isOpen: boolean`
- Named export: `ConfirmDialog`

## Constraints

- TypeScript strict mode, named exports only
- Tailwind CSS for all styling — no external UI library dependencies
- Follow existing project conventions: kebab-case filenames, PascalCase component names
- Components go in `packages/client/src/components/ui/` directory

## Dependencies

- None — this is the first task in the phase

## Verification

1. All four files exist and compile without TypeScript errors
2. Each component is importable via named export
3. `LoadingSpinner` renders an animated SVG spinner at three sizes
4. `ErrorMessage` displays a red banner with message text and optional dismiss button
5. `Modal` renders an overlay, supports close via X button, click-outside, and Escape key
6. `ConfirmDialog` renders inside a Modal with cancel and confirm (red) buttons
7. `npm run dev` starts without errors with the new components in place