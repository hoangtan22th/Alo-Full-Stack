export function formatLastActive(lastActive?: number) {
  if (!lastActive) return "Chưa truy cập";

  const diffInMinutes = Math.floor((Date.now() - lastActive) / 60000);

  if (diffInMinutes < 1) return "Vừa mới truy cập";
  if (diffInMinutes < 60) return `Hoạt động ${diffInMinutes} phút trước`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `Hoạt động ${diffInHours} giờ trước`;

  return `Hoạt động ${Math.floor(diffInHours / 24)} ngày trước`;
}
