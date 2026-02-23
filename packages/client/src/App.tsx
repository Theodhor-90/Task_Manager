import { BrowserRouter, Route, Routes } from "react-router-dom";

function LoginPage() {
  return <h1>Login</h1>;
}

function DashboardPage() {
  return <h1>Dashboard</h1>;
}

function BoardPage() {
  return <h1>Board</h1>;
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
