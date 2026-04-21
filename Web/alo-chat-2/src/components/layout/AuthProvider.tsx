"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { useRouter, usePathname } from "next/navigation";
import Swal from "sweetalert2";
import { socketService } from "../../services/socketService";
import { toast } from "sonner";

const publicRoutes = ["/login", "/register"];

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, user, logout, fetchProfile } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const listenersAttached = useRef(false);

  // 1. Chỉ đánh dấu mounted một lần duy nhất + Fetch Profile nếu thiếu
  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("accessToken");
    if (token && !user) {
      console.log("🔄 [Auth] Profile missing on reload, fetching...");
      fetchProfile();
    }
  }, [user, fetchProfile]);

  // 2. Logic Socket - Tách biệt hoàn toàn
  useEffect(() => {
    if (!mounted) return;
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("accessToken")
        : null;
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
    const isPublicPath = publicRoutes.some((r) => pathname?.startsWith(r));

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
  const handleFriendRequestReceived = useCallback(
    (data: any) => {
      toast.info("👤 Lời mời kết bạn mới!", {
        description: `${data.requesterName || "Ai đó"} muốn kết bạn.`,
        action: {
          label: "Xem",
          onClick: () => router.push("/contacts/requests"),
        },
      });
      window.dispatchEvent(
        new CustomEvent("new_friend_request", { detail: data }),
      );
    },
    [router],
  );

  const handleFriendRequestAccepted = useCallback((data: any) => {
    toast.success("🎉 Bạn mới!", {
      description: `${data.accepterName || "Ai đó"} đã đồng ý.`,
    });
    window.dispatchEvent(
      new CustomEvent("friend_list_updated", { detail: data }),
    );
  }, []);

  const handleFriendListUpdated = useCallback((data: any) => {
    window.dispatchEvent(
      new CustomEvent("friend_list_updated", { detail: data }),
    );
  }, []);

  const handleReminderDue = useCallback(
    (data: { title: string; conversationId: string }) => {
      toast("⏰ Nhắc hẹn!", {
        description: `Đã đến giờ: ${data.title}`,
        action: {
          label: "Đến xem",
          onClick: () => router.push(`/chat/${data.conversationId}`),
        },
        duration: 10000,
      });
    },
    [router],
  );

  const handleMessageReceived = useCallback(
    (data: any) => {
      const msg = data.message || data;
      // Nhắc hẹn nhóm (System message)
      if (msg.type === "system" && msg.metadata?.isReminder) {
        toast("📢 Nhắc hẹn nhóm!", {
          description: msg.metadata.title || msg.content,
          action: {
            label: "Đến xem",
            onClick: () => router.push(`/chat/${msg.conversationId}`),
          },
          duration: 10000,
        });
      }
    },
    [router],
  );

  // Luôn bắt sự kiện force_logout trên toàn trình duyệt
  useEffect(() => {
    if (!mounted) return;

    const handleForceLogout = (e: Event) => {
      const customEvent = e as CustomEvent;
      const msg =
        customEvent.detail?.message ||
        "Phiên đăng nhập của bạn đã hết hạn, hoặc bị đăng xuất từ nơi khác.";

      Swal.fire({
        icon: "warning",
        title: "Thông báo",
        text: msg,
        confirmButtonText: "Đóng",
        allowOutsideClick: false,
      }).then(() => {
        logout();
        socketService.disconnect();
        router.replace("/login");
      });
    };

    window.addEventListener("force_logout", handleForceLogout);
    return () => {
      window.removeEventListener("force_logout", handleForceLogout);
    };
  }, [mounted, logout, router]);

  // 5. Gắn listener
  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("accessToken")
        : null;
    if (!mounted || (!isAuthenticated && !token) || listenersAttached.current)
      return;

    const unsubs = [
      socketService.onFriendRequestReceived(handleFriendRequestReceived),
      socketService.onFriendRequestAccepted(handleFriendRequestAccepted),
      socketService.onFriendListUpdated(handleFriendListUpdated),
      socketService.onReminderDue(handleReminderDue),
      socketService.onMessageReceived(handleMessageReceived),
    ];

    listenersAttached.current = true;

    return () => {
      unsubs.forEach((unsub) => unsub());
      listenersAttached.current = false;
    };
  }, [
    mounted,
    isAuthenticated,
    handleFriendRequestReceived,
    handleFriendRequestAccepted,
    handleFriendListUpdated,
    handleReminderDue,
    handleMessageReceived,
  ]);

  // Luôn render children để tránh lệch Hydration giữa Server và Client
  return <>{children}</>;
}
