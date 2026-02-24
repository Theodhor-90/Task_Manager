import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/auth-context";
import { ProtectedRoute } from "./components/protected-route";
import { LoginPage } from "./pages/login-page";
import { DashboardPage } from "./pages/dashboard-page";
import { BoardPage } from "./pages/board-page";

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
