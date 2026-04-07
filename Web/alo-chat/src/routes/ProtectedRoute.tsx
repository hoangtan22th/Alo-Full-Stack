import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute() {
  // Kiểm tra xem có token trong máy không
  const token = localStorage.getItem("accessToken");
  const isAuthenticated =
    token && token !== "undefined" && token !== "null" && token.trim() !== "";

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
