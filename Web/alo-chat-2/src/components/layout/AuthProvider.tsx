"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { useRouter, usePathname } from "next/navigation";
import Swal from "sweetalert2";
import { socketService } from "../../services/socketService";
import { toast } from "sonner";

const publicRoutes = ["/login", "/register"];

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const listenersAttached = useRef(false);

  // 1. Chỉ đánh dấu mounted một lần duy nhất
  useEffect(() => {
    setMounted(true);
  }, []);

  // 2. Logic Socket - Tách biệt hoàn toàn
  useEffect(() => {
    if (!mounted) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (isAuthenticated || token) {
      if (!socketService.connected) socketService.connect();
    } else {
      socketService.disconnect();
    }
  }, [mounted, isAuthenticated]);

  // 3. Bảo vệ Route - Sử dụng logic đơn giản nhất có thể
  useEffect(() => {
    if (!mounted) return;
    
    const token = localStorage.getItem("accessToken");
    const isAuth = isAuthenticated || !!token;
    const isPublicPath = publicRoutes.some(r => pathname?.startsWith(r));

    // CHỈ redirect nếu thực sự cần thiết và KHÔNG đang ở trang đó
    if (!isAuth && !isPublicPath) {
      console.log("🛡️ [Auth] Unauthenticated -> /login");
      router.replace("/login");
    } else if (isAuth && isPublicPath) {
      console.log("🛡️ [Auth] Authenticated -> /chat");
      router.replace("/chat");
    }
  }, [mounted, isAuthenticated, pathname]); // Bỏ router khỏi deps nếu có thể

  // 4. Social Handlers
  const handleFriendRequestReceived = useCallback((data: any) => {
    toast.info("👤 Lời mời kết bạn mới!", {
      description: `${data.requesterName || "Ai đó"} muốn kết bạn.`,
      action: { label: "Xem", onClick: () => router.push("/contacts/requests") },
    });
    window.dispatchEvent(new CustomEvent("new_friend_request", { detail: data }));
  }, [router]);

  const handleFriendRequestAccepted = useCallback((data: any) => {
    toast.success("🎉 Bạn mới!", { description: `${data.accepterName || "Ai đó"} đã đồng ý.` });
    window.dispatchEvent(new CustomEvent("friend_list_updated", { detail: data }));
  }, []);

  const handleFriendListUpdated = useCallback((data: any) => {
    window.dispatchEvent(new CustomEvent("friend_list_updated", { detail: data }));
  }, []);

  // 5. Gắn listener
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!mounted || (!isAuthenticated && !token) || listenersAttached.current) return;

    socketService.onFriendRequestReceived(handleFriendRequestReceived);
    socketService.onFriendRequestAccepted(handleFriendRequestAccepted);
    socketService.onFriendListUpdated(handleFriendListUpdated);
    listenersAttached.current = true;
  }, [mounted, isAuthenticated, handleFriendRequestReceived, handleFriendRequestAccepted, handleFriendListUpdated]);

  // Nếu chưa mounted (SSR), không render gì để tránh lệch Hydration
  if (!mounted) return null;

  return <>{children}</>;
}
