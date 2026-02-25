Confirmed — `Markdown` is a default export. Now I'll produce the revised plan.

# Task 5 Plan — Markdown Description Editor with Preview Toggle

## 1. Deliverables

| # | File / Artifact | Action | Purpose |
|---|----------------|--------|---------|
| 1 | `packages/client/src/components/task-detail-panel.tsx` | **Modify** | Add description section with Write/Preview tabs below the title, using `react-markdown` for rendered preview |
| 2 | `packages/client/src/components/__tests__/task-detail-panel.test.tsx` | **Modify** | Add unit tests for the description section: Write mode textarea, Preview mode markdown rendering, tab switching, save on blur, placeholder for empty description |
| 3 | `packages/client/src/index.css` | **Modify** | Add `prose-custom` CSS class for basic markdown preview styling |

---

## 2. Dependencies

- **Sibling tasks (completed)**:
  - Task 1: `react-markdown` v10.1.0 installed in `packages/client`
  - Task 4: `TaskDetailPanel` component exists with title editing, loading/error states, and close behavior
- **Existing infrastructure**:
  - `packages/client/src/context/board-context.tsx` — `useBoard()` provides `updateTask(taskId, updates)` (from Task 3)
  - `packages/client/src/api/tasks.ts` — `UpdateTaskInput` includes `description?: string`
  - `react-markdown` v10 — exports `Markdown` as a **default export**; accepts `children` (string) prop for markdown content
- **Not available**: `@tailwindcss/typography` is not installed, so the `prose` class is unavailable. Markdown preview styling must use manual CSS via a `prose-custom` class.

---

## 3. Implementation Details

### 3.1 Modify `packages/client/src/components/task-detail-panel.tsx`

#### 3.1.1 New import

Add at the top of the file, after the existing imports:

```typescript
import Markdown from "react-markdown";
```

Note: `react-markdown` v10 exports `Markdown` as a **default export** (`export { Markdown as default }` in `index.d.ts`). The correct import syntax is `import Markdown from "react-markdown"` — not a named import.

#### 3.1.2 New state variables

Add inside the `TaskDetailPanel` function, after the existing state declarations (`isEditingTitle`, `editTitle`):

```typescript
const [descriptionTab, setDescriptionTab] = useState<"write" | "preview">("preview");
const [editDescription, setEditDescription] = useState("");
```

- `descriptionTab` — tracks which tab is active; defaults to `"preview"` (spec: default to Preview if description exists, Write if empty — handled in the data loading effect)
- `editDescription` — the current textarea value; initialized from the loaded task's description

#### 3.1.3 Initialize description state from loaded task

In the existing data loading `useEffect` (where `setTask(response.data)` is called), add initialization of the description state after setting the task:

```typescript
// Inside the existing load() function, after: setTask(response.data);
setEditDescription(response.data.description ?? "");
setDescriptionTab(response.data.description ? "preview" : "write");
```

This sets the default tab per the spec: "Write" if description is empty, "Preview" if description exists.

#### 3.1.4 Description save handler

Add after the title editing handlers:

```typescript
async function handleDescriptionBlur() {
  if (!task) return;
  const currentDescription = task.description ?? "";
  if (editDescription === currentDescription) return;
  try {
    const updated = await updateTask(taskId, { description: editDescription });
    setTask(updated);
  } catch {
    // Revert to current description on failure
    setEditDescription(task.description ?? "");
  }
}
```

**Key design decisions**:
- Only triggers API call if the description actually changed (compared to the originally loaded value in `task.description`)
- On success, updates local `task` state with the returned `Task` from `updateTask` — this keeps the panel in sync with board context
- On failure, reverts `editDescription` to the current saved value
- Follows the same pattern as `handleTitleSave` for error handling

#### 3.1.5 Description section JSX

Add inside the `{!isLoading && !error && task && ( ... )}` block, after the status label `<span>`:

```tsx
{/* Description section */}
<div className="mt-6">
  <div className="flex border-b border-gray-200">
    <button
      className={`px-4 py-2 text-sm font-medium ${
        descriptionTab === "write"
          ? "border-b-2 border-blue-500 text-blue-600"
          : "text-gray-500 hover:text-gray-700"
      }`}
      onClick={() => setDescriptionTab("write")}
    >
      Write
    </button>
    <button
      className={`px-4 py-2 text-sm font-medium ${
        descriptionTab === "preview"
          ? "border-b-2 border-blue-500 text-blue-600"
          : "text-gray-500 hover:text-gray-700"
      }`}
      onClick={() => setDescriptionTab("preview")}
    >
      Preview
    </button>
  </div>

  {descriptionTab === "write" ? (
    <textarea
      value={editDescription}
      onChange={(e) => setEditDescription(e.target.value)}
      onBlur={handleDescriptionBlur}
      className="mt-2 w-full min-h-[150px] rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      placeholder="Add a description..."
      aria-label="Task description"
    />
  ) : (
    <div className="prose-custom mt-2 min-h-[150px] text-sm text-gray-900">
      {editDescription.trim() ? (
        <Markdown>{editDescription}</Markdown>
      ) : (
        <p className="italic text-gray-400">Add a description...</p>
      )}
    </div>
  )}
</div>
```

**Key layout/styling decisions**:

- **Tab bar**: Two buttons styled as tabs with a bottom border. The active tab has a blue bottom border and blue text; inactive tabs have gray text. The tabs sit inside a `flex` container with a bottom border.
- **Textarea**: Full-width, `min-h-[150px]` for reasonable editing space, standard input styling matching the title input pattern. Has a `placeholder` of "Add a description..." when empty.
- **Preview area**: Same `min-h-[150px]` to prevent layout shift when switching tabs. Uses a `prose-custom` class for markdown styling (see 3.1.6).
- **Empty state**: When description is empty/whitespace in Preview mode, shows italic gray placeholder text "Add a description..." per the spec.
- **`Markdown` component**: `react-markdown` v10's default-exported `Markdown` component takes the markdown string as `children`.

#### 3.1.6 Markdown styling approach

Since `@tailwindcss/typography` is not installed, the rendered markdown will use browser defaults for elements like `<h1>`, `<p>`, `<ul>`, `<a>`, `<code>`, etc. To provide basic readable formatting without installing a new plugin, add a `prose-custom` CSS class with manual styling.

Add to `packages/client/src/index.css` after the `@tailwind utilities;` line:

```css
/* Markdown preview styling */
.prose-custom h1 { font-size: 1.5em; font-weight: 700; margin: 0.5em 0; }
.prose-custom h2 { font-size: 1.25em; font-weight: 600; margin: 0.5em 0; }
.prose-custom h3 { font-size: 1.125em; font-weight: 600; margin: 0.5em 0; }
.prose-custom p { margin: 0.5em 0; }
.prose-custom ul { list-style-type: disc; padding-left: 1.5em; margin: 0.5em 0; }
.prose-custom ol { list-style-type: decimal; padding-left: 1.5em; margin: 0.5em 0; }
.prose-custom li { margin: 0.25em 0; }
.prose-custom a { color: #2563eb; text-decoration: underline; }
.prose-custom code { background-color: #f3f4f6; padding: 0.125em 0.25em; border-radius: 0.25em; font-size: 0.875em; }
.prose-custom pre { background-color: #f3f4f6; padding: 0.75em; border-radius: 0.375em; overflow-x: auto; margin: 0.5em 0; }
.prose-custom pre code { background-color: transparent; padding: 0; }
.prose-custom blockquote { border-left: 3px solid #d1d5db; padding-left: 0.75em; color: #6b7280; margin: 0.5em 0; }
.prose-custom hr { border-color: #e5e7eb; margin: 1em 0; }
.prose-custom strong { font-weight: 600; }
```

#### 3.1.7 Escape key interaction with description editing

The existing Escape key handler (from Task 4) handles two cases: cancel title editing, or close the panel. We do **not** need to add a third case for description editing because:

- The textarea does not have an explicit "editing mode" toggle (it's always visible when the Write tab is active)
- Escape should close the panel even while the textarea is focused, since there's no "cancel" concept for the description (blur saves, and the user can undo by editing again)
- The textarea blur event will fire when the panel closes (since the panel unmounts), triggering `handleDescriptionBlur` — this is acceptable behavior: saving the description on panel close is a reasonable UX. The user expects their edits to persist. The spec says "description saves on blur," and closing the panel triggers blur.

---

### 3.2 Modify `packages/client/src/index.css`

Add the `prose-custom` CSS block described in 3.1.6, after the `@tailwind utilities;` line.

---

### 3.3 Modify `packages/client/src/components/__tests__/task-detail-panel.test.tsx`

#### 3.3.1 Mock `react-markdown`

Add a mock for `react-markdown` at the top of the file, alongside the existing mocks. Since `Markdown` is a **default export**, the mock must use the `default` key:

```typescript
vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => (
    <div data-testid="markdown-preview">{children}</div>
  ),
}));
```

This provides a simple mock that renders the markdown content as plain text with a `data-testid` for easy assertion. We don't need to test actual markdown rendering (that's `react-markdown`'s responsibility) — we only need to verify that the correct content is passed to the Markdown component.

#### 3.3.2 Update mock task fixtures

The existing `mockTask` already has `description: "Some description"`, which is suitable for testing Preview mode defaults. Add an additional fixture for tests that need an empty description:

```typescript
const mockTaskNoDescription: Task = {
  ...mockTask,
  _id: "task2",
  description: "",
};
```

#### 3.3.3 New test cases

Add the following tests after the existing tests (after the "panel does not close on click inside panel content" test):

**Test 1: defaults to Preview tab when description exists**

```typescript
it("defaults to Preview tab when description exists", async () => {
  vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
  vi.mocked(useBoard).mockReturnValue({ updateTask: vi.fn() } as any);

  renderPanel();

  await waitFor(() => {
    expect(screen.getByTestId("markdown-preview")).toBeInTheDocument();
  });

  // Preview tab should be active (has blue styling)
  const previewTab = screen.getByRole("button", { name: "Preview" });
  expect(previewTab).toHaveClass("text-blue-600");
});
```

**Test 2: defaults to Write tab when description is empty**

```typescript
it("defaults to Write tab when description is empty", async () => {
  vi.mocked(fetchTask).mockResolvedValue({ data: mockTaskNoDescription } as any);
  vi.mocked(useBoard).mockReturnValue({ updateTask: vi.fn() } as any);

  renderPanel();

  await waitFor(() => {
    expect(screen.getByLabelText("Task description")).toBeInTheDocument();
  });

  const writeTab = screen.getByRole("button", { name: "Write" });
  expect(writeTab).toHaveClass("text-blue-600");
});
```

**Test 3: renders textarea in Write tab with current description**

```typescript
it("renders textarea in Write tab with current description", async () => {
  vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
  vi.mocked(useBoard).mockReturnValue({ updateTask: vi.fn() } as any);

  renderPanel();

  await waitFor(() => {
    expect(screen.getByTestId("markdown-preview")).toBeInTheDocument();
  });

  // Switch to Write tab
  fireEvent.click(screen.getByRole("button", { name: "Write" }));

  const textarea = screen.getByLabelText("Task description") as HTMLTextAreaElement;
  expect(textarea).toBeInTheDocument();
  expect(textarea.value).toBe("Some description");
});
```

**Test 4: renders markdown in Preview tab**

```typescript
it("renders markdown content in Preview tab", async () => {
  vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
  vi.mocked(useBoard).mockReturnValue({ updateTask: vi.fn() } as any);

  renderPanel();

  await waitFor(() => {
    expect(screen.getByTestId("markdown-preview")).toHaveTextContent("Some description");
  });
});
```

**Test 5: tab switching works between Write and Preview**

```typescript
it("switches between Write and Preview tabs", async () => {
  vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
  vi.mocked(useBoard).mockReturnValue({ updateTask: vi.fn() } as any);

  renderPanel();

  await waitFor(() => {
    expect(screen.getByTestId("markdown-preview")).toBeInTheDocument();
  });

  // Switch to Write
  fireEvent.click(screen.getByRole("button", { name: "Write" }));
  expect(screen.getByLabelText("Task description")).toBeInTheDocument();
  expect(screen.queryByTestId("markdown-preview")).not.toBeInTheDocument();

  // Switch back to Preview
  fireEvent.click(screen.getByRole("button", { name: "Preview" }));
  expect(screen.getByTestId("markdown-preview")).toBeInTheDocument();
  expect(screen.queryByLabelText("Task description")).not.toBeInTheDocument();
});
```

**Test 6: description saves on blur when changed**

```typescript
it("description saves on blur when changed", async () => {
  const mockUpdateTask = vi.fn().mockResolvedValue({
    ...mockTask,
    description: "Updated description",
  });
  vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
  vi.mocked(useBoard).mockReturnValue({ updateTask: mockUpdateTask } as any);

  renderPanel();

  await waitFor(() => {
    expect(screen.getByTestId("markdown-preview")).toBeInTheDocument();
  });

  // Switch to Write tab
  fireEvent.click(screen.getByRole("button", { name: "Write" }));

  const textarea = screen.getByLabelText("Task description");
  fireEvent.change(textarea, { target: { value: "Updated description" } });
  fireEvent.blur(textarea);

  await waitFor(() => {
    expect(mockUpdateTask).toHaveBeenCalledWith("task1", { description: "Updated description" });
  });
});
```

**Test 7: description does not save on blur when unchanged**

```typescript
it("description does not save on blur when unchanged", async () => {
  const mockUpdateTask = vi.fn();
  vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
  vi.mocked(useBoard).mockReturnValue({ updateTask: mockUpdateTask } as any);

  renderPanel();

  await waitFor(() => {
    expect(screen.getByTestId("markdown-preview")).toBeInTheDocument();
  });

  // Switch to Write tab
  fireEvent.click(screen.getByRole("button", { name: "Write" }));

  const textarea = screen.getByLabelText("Task description");
  fireEvent.blur(textarea);

  expect(mockUpdateTask).not.toHaveBeenCalled();
});
```

**Test 8: empty description shows placeholder in Preview mode**

```typescript
it("shows placeholder when description is empty in Preview mode", async () => {
  vi.mocked(fetchTask).mockResolvedValue({ data: mockTaskNoDescription } as any);
  vi.mocked(useBoard).mockReturnValue({ updateTask: vi.fn() } as any);

  renderPanel();

  await waitFor(() => {
    expect(screen.getByLabelText("Task description")).toBeInTheDocument();
  });

  // Switch to Preview tab
  fireEvent.click(screen.getByRole("button", { name: "Preview" }));

  expect(screen.getByText("Add a description...")).toBeInTheDocument();
  expect(screen.queryByTestId("markdown-preview")).not.toBeInTheDocument();
});
```

**Test 9: description save failure reverts to current description**

```typescript
it("description save failure reverts to current description", async () => {
  const mockUpdateTask = vi.fn().mockRejectedValue(new Error("Save failed"));
  vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
  vi.mocked(useBoard).mockReturnValue({ updateTask: mockUpdateTask } as any);

  renderPanel();

  await waitFor(() => {
    expect(screen.getByTestId("markdown-preview")).toBeInTheDocument();
  });

  // Switch to Write tab
  fireEvent.click(screen.getByRole("button", { name: "Write" }));

  const textarea = screen.getByLabelText("Task description") as HTMLTextAreaElement;
  fireEvent.change(textarea, { target: { value: "Bad description" } });
  fireEvent.blur(textarea);

  await waitFor(() => {
    expect(mockUpdateTask).toHaveBeenCalled();
  });

  // After failure, textarea value should revert
  await waitFor(() => {
    expect((screen.getByLabelText("Task description") as HTMLTextAreaElement).value).toBe("Some description");
  });
});
```

**Test 10: Preview tab shows updated content after editing in Write tab**

```typescript
it("Preview tab shows updated content after editing in Write tab", async () => {
  const mockUpdateTask = vi.fn().mockResolvedValue({
    ...mockTask,
    description: "New content",
  });
  vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
  vi.mocked(useBoard).mockReturnValue({ updateTask: mockUpdateTask } as any);

  renderPanel();

  await waitFor(() => {
    expect(screen.getByTestId("markdown-preview")).toBeInTheDocument();
  });

  // Switch to Write, edit, blur to save
  fireEvent.click(screen.getByRole("button", { name: "Write" }));
  const textarea = screen.getByLabelText("Task description");
  fireEvent.change(textarea, { target: { value: "New content" } });
  fireEvent.blur(textarea);

  await waitFor(() => {
    expect(mockUpdateTask).toHaveBeenCalled();
  });

  // Switch to Preview
  fireEvent.click(screen.getByRole("button", { name: "Preview" }));

  expect(screen.getByTestId("markdown-preview")).toHaveTextContent("New content");
});
```

---

## 4. Contracts

### Description Section Internal Interface

This is not a separate component — the description section is rendered inline within `TaskDetailPanel`. No new props or exports are introduced.

| State Variable | Type | Initial Value | Purpose |
|---------------|------|---------------|---------|
| `descriptionTab` | `"write" \| "preview"` | `"preview"` if description exists, `"write"` if empty | Active tab selection |
| `editDescription` | `string` | `task.description ?? ""` | Current textarea content |

### Interactions and Effects

| User Action | Internal Effect | External Effect (via BoardContext) |
|-------------|----------------|-----------------------------------|
| Click "Write" tab | `setDescriptionTab("write")` | None |
| Click "Preview" tab | `setDescriptionTab("preview")` | None |
| Type in textarea | `setEditDescription(value)` | None |
| Blur textarea (description changed) | Calls `updateTask(taskId, { description })`, updates local `task` state | Patches task in `BoardContext.tasks` |
| Blur textarea (description unchanged) | No-op | None |
| Blur textarea (save fails) | Reverts `editDescription` to `task.description` | None |

### `Markdown` Component Usage

```tsx
import Markdown from "react-markdown";

<Markdown>{editDescription}</Markdown>
```

The `Markdown` component is the **default export** of `react-markdown` v10. It accepts:
- `children: string` — the markdown content to render
- Returns React elements representing the rendered HTML

---

## 5. Test Plan

All tests are added to the existing file `packages/client/src/components/__tests__/task-detail-panel.test.tsx`.

### Test Setup Modifications

1. Add `vi.mock("react-markdown")` with a mock that uses the `default` key (since `Markdown` is a default export), rendering content in a `data-testid="markdown-preview"` div
2. Add `mockTaskNoDescription` fixture (task with empty description)
3. No new test helpers needed — the existing `renderPanel` function is sufficient

### Per-Test Specification

| # | Test Name | Setup | Action | Assertion |
|---|-----------|-------|--------|-----------|
| 1 | defaults to Preview tab when description exists | `fetchTask` resolves with `mockTask` (has description) | Render panel, wait for load | `markdown-preview` testid visible; Preview tab has `text-blue-600` class |
| 2 | defaults to Write tab when description is empty | `fetchTask` resolves with `mockTaskNoDescription` | Render panel, wait for load | `Task description` textarea visible; Write tab has `text-blue-600` class |
| 3 | renders textarea in Write tab with current description | `fetchTask` resolves with `mockTask` | Load, click Write tab | Textarea visible with value `"Some description"` |
| 4 | renders markdown content in Preview tab | `fetchTask` resolves with `mockTask` | Load | `markdown-preview` contains `"Some description"` |
| 5 | switches between Write and Preview tabs | `fetchTask` resolves with `mockTask` | Click Write → verify textarea; click Preview → verify markdown | Tab content toggles correctly; only one view visible at a time |
| 6 | description saves on blur when changed | `fetchTask` resolves, `updateTask` mock resolves | Switch to Write, change textarea, blur | `updateTask` called with `("task1", { description: "Updated description" })` |
| 7 | description does not save on blur when unchanged | `fetchTask` resolves, `updateTask` mock | Switch to Write, blur without changing | `updateTask` NOT called |
| 8 | shows placeholder when description is empty in Preview mode | `fetchTask` resolves with `mockTaskNoDescription` | Switch to Preview tab | "Add a description..." italic text visible; `markdown-preview` NOT visible |
| 9 | description save failure reverts to current description | `fetchTask` resolves, `updateTask` rejects | Switch to Write, change textarea, blur | After error, textarea value reverts to `"Some description"` |
| 10 | Preview tab shows updated content after editing | `fetchTask` resolves, `updateTask` resolves with new description | Edit in Write, blur, switch to Preview | `markdown-preview` shows `"New content"` |

---

## 6. Implementation Order

1. **Step 1**: Add markdown preview CSS to `packages/client/src/index.css` — the `prose-custom` class styles
2. **Step 2**: Modify `packages/client/src/components/task-detail-panel.tsx`:
   - Add `import Markdown from "react-markdown";` (default import)
   - Add `descriptionTab` and `editDescription` state variables
   - Initialize description state in the data loading effect (after `setTask`)
   - Add `handleDescriptionBlur` function
   - Add description section JSX (tabs + textarea/preview) after the status label
3. **Step 3**: Modify `packages/client/src/components/__tests__/task-detail-panel.test.tsx`:
   - Add `vi.mock("react-markdown")` mock using `{ default: ... }` pattern
   - Add `mockTaskNoDescription` fixture
   - Add all 10 new test cases
4. **Step 4**: Verify TypeScript compiles: `npm run build -w packages/client`
5. **Step 5**: Run tests: `npm run test -w packages/client`

---

## 7. Verification Commands

```bash
# 1. Verify the Markdown default import exists
grep 'import Markdown from "react-markdown"' packages/client/src/components/task-detail-panel.tsx

# 2. Verify prose-custom CSS exists
grep "prose-custom" packages/client/src/index.css

# 3. Verify description section exists in the component
grep "Task description" packages/client/src/components/task-detail-panel.tsx

# 4. Verify TypeScript compiles
npm run build -w packages/client

# 5. Run all client tests (should pass including 10 new description tests)
npm run test -w packages/client
```

All five commands should succeed (grep finds matches, build and test exit with code 0).