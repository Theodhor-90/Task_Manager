import { BrowserRouter, Route, Routes } from "react-router-dom";
import { PRIORITIES } from "@taskboard/shared";
import { AuthProvider } from "./context/auth-context";
import { ProtectedRoute } from "./components/protected-route";

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
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/projects/:id/board" element={<BoardPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
