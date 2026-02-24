import { PRIORITIES } from "@taskboard/shared";

export function BoardPage() {
  return (
    <div>
      <h1>Board</h1>
      <p>Priority levels: {PRIORITIES.join(", ")}</p>
    </div>
  );
}
