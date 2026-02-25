Now I have all the context I need. Let me produce the implementation plan.

# Task 2 Implementation Plan: `ProjectCard` Component

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/client/src/components/project-card.tsx` | Create | Clickable project card with edit/delete action buttons for use in the dashboard grid |
| 2 | `packages/client/src/components/__tests__/project-card.test.tsx` | Create | Unit tests for the ProjectCard component |

## 2. Dependencies

### Code Dependencies
- `Project` type from `@taskboard/shared` — typing for the `project` prop
- `Link` component from `react-router-dom` — wraps the card for navigation to `/projects/:id/board`

### Existing Interfaces to Consume

```typescript
// From @taskboard/shared
interface Project {
  _id: string;
  name: string;
  description?: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
}
```

### No Dependencies on Other Phase 2 Tasks
This component is a pure presentational component. It does not import `ProjectFormModal`, `ConfirmDialog`, or `useProjects()`. The parent (`DashboardPage`, wired in Task 3) is responsible for handling the `onEdit` and `onDelete` callbacks.

## 3. Implementation Details

### 3.1 `packages/client/src/components/project-card.tsx`

**Named export**: `ProjectCard`

**Props interface**:
```typescript
interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}
```

**JSX structure**:
```
<Link to={`/projects/${project._id}/board`}
  className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">

  <div className="flex items-start justify-between">
    <!-- Project name -->
    <h3 className="font-medium text-gray-900">{project.name}</h3>

    <!-- Action buttons container -->
    <div className="flex gap-1">
      <!-- Edit button (pencil icon) -->
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(project); }}
        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        aria-label="Edit project"
      >
        <svg ... pencil icon ... />
      </button>

      <!-- Delete button (trash icon) -->
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(project); }}
        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"
        aria-label="Delete project"
      >
        <svg ... trash icon ... />
      </button>
    </div>
  </div>

  <!-- Truncated description (conditional) -->
  {project.description && (
    <p className="mt-1 line-clamp-2 text-sm text-gray-500">{project.description}</p>
  )}

  <!-- Creation date -->
  <p className="mt-2 text-xs text-gray-400">
    {new Date(project.createdAt).toLocaleDateString()}
  </p>
</Link>
```

**SVG icons** (inline, 16x16, using Heroicons-style paths):

Edit (pencil) icon:
```tsx
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
  <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
</svg>
```

Delete (trash) icon:
```tsx
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
  <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 01.78.72l.5 6a.75.75 0 01-1.5.12l-.5-6a.75.75 0 01.72-.78zm2.06.72a.75.75 0 011.5-.12l.5 6a.75.75 0 11-1.5.12l-.5-6z" clipRule="evenodd" />
</svg>
```

**Key design decisions**:
- The entire card is wrapped in a `<Link>` for primary navigation — this matches the phase spec requirement "Wraps card content in `<Link>`"
- Action buttons use `e.preventDefault()` and `e.stopPropagation()` to prevent `<Link>` navigation when clicking edit/delete — this is explicitly required by the spec
- Card styling (`rounded-lg border border-gray-200 bg-white p-4 shadow-sm`) matches the existing inline card in `dashboard-page.tsx` and the spec requirement
- `hover:shadow-md transition-shadow` added on the Link to give visual feedback that the card is clickable
- Delete button hover uses `hover:text-red-600` to visually differentiate the destructive action from edit
- `aria-label` attributes on buttons for accessibility
- Description uses `line-clamp-2` matching the existing dashboard pattern
- Date formatting uses `toLocaleDateString()` matching the existing dashboard pattern
- No context usage — this is a pure presentational component; all logic is delegated to parent via callbacks

## 4. Contracts

### Props Input

```typescript
<ProjectCard
  project={{
    _id: "proj1",
    name: "My Project",
    description: "A description of the project",
    owner: "user1",
    createdAt: "2025-01-15T00:00:00Z",
    updatedAt: "2025-01-15T00:00:00Z",
  }}
  onEdit={(project) => { /* open edit modal */ }}
  onDelete={(project) => { /* open confirm dialog */ }}
/>
```

### Outputs/Side effects
- Clicking the card body navigates to `/projects/:id/board` via React Router `<Link>`
- Clicking the edit button calls `onEdit(project)` — does NOT navigate
- Clicking the delete button calls `onDelete(project)` — does NOT navigate
- No direct API calls or state mutations — purely presentational

## 5. Test Plan

### Test file: `packages/client/src/components/__tests__/project-card.test.tsx`

**Test setup**:
- Wrap renders in `<MemoryRouter>` since `ProjectCard` uses `<Link>` from react-router-dom
- Create a `mockProject` fixture matching the `Project` type
- Create a `mockProjectNoDescription` fixture without a description
- Helper: `renderCard(props?: Partial<ProjectCardProps>)` with sensible defaults (`project: mockProject, onEdit: vi.fn(), onDelete: vi.fn()`)

**Mock project fixtures**:
```typescript
const mockProject: Project = {
  _id: "proj1",
  name: "Project Alpha",
  description: "First project description",
  owner: "user1",
  createdAt: "2025-01-15T00:00:00Z",
  updatedAt: "2025-01-15T00:00:00Z",
};

const mockProjectNoDescription: Project = {
  _id: "proj2",
  name: "Project Beta",
  owner: "user1",
  createdAt: "2025-02-10T00:00:00Z",
  updatedAt: "2025-02-10T00:00:00Z",
};
```

**Tests** (10 test cases):

| # | Test Name | Description |
|---|-----------|-------------|
| 1 | `renders project name` | Render with `mockProject`, assert heading text is "Project Alpha" |
| 2 | `renders project description when present` | Render with `mockProject`, assert "First project description" is in the document |
| 3 | `does not render description when absent` | Render with `mockProjectNoDescription`, assert no `.text-gray-500` paragraph (use same pattern as existing dashboard test: check via `queryByText` or DOM inspection) |
| 4 | `renders formatted creation date` | Render with `mockProject`, assert `new Date("2025-01-15T00:00:00Z").toLocaleDateString()` is in the document |
| 5 | `links to the board route` | Render with `mockProject`, find the link element, assert `href` is `/projects/proj1/board` |
| 6 | `calls onEdit with project when edit button clicked` | Render with `onEdit: vi.fn()`, click the edit button (find by `aria-label="Edit project"`), assert `onEdit` was called with `mockProject` |
| 7 | `calls onDelete with project when delete button clicked` | Render with `onDelete: vi.fn()`, click the delete button (find by `aria-label="Delete project"`), assert `onDelete` was called with `mockProject` |
| 8 | `edit button does not trigger navigation` | Click the edit button, verify the link was not followed — assert that `onEdit` was called but the MemoryRouter location stays at `/` (or simply assert the link click event was prevented via mock) |
| 9 | `delete button does not trigger navigation` | Click the delete button, verify the link was not followed — same approach as test 8 |
| 10 | `renders edit and delete action buttons` | Render with `mockProject`, assert both buttons with `aria-label="Edit project"` and `aria-label="Delete project"` are in the document |

**Preventing navigation verification (tests 8 & 9)**:
Since we're using `MemoryRouter`, we can set up a route listener or check that `onEdit`/`onDelete` were called while verifying no navigation occurred. The simplest pattern:
```typescript
// Wrap in MemoryRouter with a Routes setup, and after clicking the button,
// assert we're still on "/" (the initial route) by checking the rendered content
// is still present. Or more directly, just verify the callback was called and
// that's sufficient since e.preventDefault() + e.stopPropagation() is the mechanism.
```

Actually, the most practical approach is to:
1. Render inside `<MemoryRouter initialEntries={["/"]}><Routes><Route path="/" element={<ProjectCard ... />} /><Route path="/projects/:id/board" element={<div data-testid="board">Board</div>} /></Routes></MemoryRouter>`
2. Click the edit/delete button
3. Assert that `screen.queryByTestId("board")` is NOT in the document (navigation didn't happen)
4. Assert that the callback was called

**Async patterns**: None needed — this component has no async operations. All tests are synchronous.

## 6. Implementation Order

1. **Create `project-card.tsx`** — implement the component with Link wrapping, project info rendering, action buttons with event propagation prevention, and SVG icons
2. **Create `project-card.test.tsx`** — implement all 10 tests
3. **Run tests** — verify all pass
4. **Run type check** — verify no TypeScript errors

## 7. Verification Commands

```bash
# Run only the new test file
cd /Users/theodhor/Desktop/Portfolio/Task_Manager && npx -w packages/client vitest run src/components/__tests__/project-card.test.tsx

# Run all client tests to check for regressions
cd /Users/theodhor/Desktop/Portfolio/Task_Manager && npm run test -w packages/client

# Type check the client package
cd /Users/theodhor/Desktop/Portfolio/Task_Manager && npx -w packages/client tsc --noEmit
```