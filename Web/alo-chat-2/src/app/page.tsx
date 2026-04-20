"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Chuyển hướng luôn sang trang tin nhắn (có chứa Sidebar)
    router.replace("/chat");
  }, [router]);

  return <p className="text-center mt-10">Đang tải ứng dụng...</p>;
}
