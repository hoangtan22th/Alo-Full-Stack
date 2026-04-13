import { Navigate, Outlet } from "react-router-dom";

export default function PublicRoute() {
  const token = localStorage.getItem("accessToken");
  const isAuthenticated =
    token && token !== "undefined" && token !== "null" && token.trim() !== "";

  if (isAuthenticated) {
    return <Navigate to="/contacts/friends" replace />;
  }

  return <Outlet />;
}
