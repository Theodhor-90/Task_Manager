import { BrowserRouter, Route, Routes } from "react-router-dom";
import type { Priority } from "@taskboard/shared";
import { PRIORITIES } from "@taskboard/shared";

function LoginPage() {
  return <h1>Login</h1>;
}

function DashboardPage() {
  return <h1>Dashboard</h1>;
}

function BoardPage() {
  return (
    <div>
      <h1>Board</h1>
      <p>Priority levels: {PRIORITIES.join(", ")}</p>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<DashboardPage />} />
        <Route path="/projects/:id/board" element={<BoardPage />} />
      </Routes>
    </BrowserRouter>
  );
}
