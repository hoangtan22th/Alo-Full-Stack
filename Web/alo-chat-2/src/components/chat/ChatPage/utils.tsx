import React from "react";

export function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatListTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const getMediaUrl = (url: string | undefined): string => {
  if (!url) return "";
  if (
    url.startsWith("http") ||
    url.startsWith("blob:") ||
    url.startsWith("data:")
  ) {
    return url;
  }
  const backendHost =
    process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ||
    "http://localhost:8888";
  return `${backendHost}${url.startsWith("/") ? "" : "/"}${url}`;
};

export function renderContentWithMentions(content: string, members: any[], userCache: any) {
  if (!content) return content;

  // Thu thập danh sách tên để match (bao gồm @Tất cả)
  const mentionNames = ["Tất cả"];
  members.forEach(m => {
    const name = userCache[String(m.userId || m._id)]?.name;
    if (name) mentionNames.push(name);
  });

  // Tạo regex để match @NAME
  const sortedNames = [...mentionNames].sort((a, b) => b.length - a.length);
  const regex = new RegExp(`@(${sortedNames.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join("|")})`, "g");

  const parts = content.split(regex);
  if (parts.length === 1) return content;

  const result: (string | React.JSX.Element)[] = [];

  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) {
      result.push(
        <span key={i} className="text-blue-800 font-black px-0.5">
          @{parts[i]}
        </span>
      );
    } else if (parts[i]) {
      result.push(parts[i]);
    }
  }

  return React.createElement(React.Fragment, null, result);
}
