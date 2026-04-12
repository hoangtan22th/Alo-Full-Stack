import { Navigate, Outlet } from "react-router-dom";
// NHỚ IMPORT ZUSTAND VÀO ĐÂY NÈ ÔNG
import { useAuthStore } from "@/store/useAuthStore";

export default function ProtectedRoute() {
  // Bỏ cái localStorage đi, lấy thẳng từ Store ra cho đồng bộ với PublicRoute
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
