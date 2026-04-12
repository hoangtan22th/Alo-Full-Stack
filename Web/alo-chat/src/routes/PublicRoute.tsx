import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";

export default function PublicRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isAuthenticated) {
    // Đã có token xịn thì mới cho vào trong
    return <Navigate to="/contacts/friends" replace />;
  }

  return <Outlet />;
}