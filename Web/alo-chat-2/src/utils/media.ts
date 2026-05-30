export const getMediaUrl = (url: string | undefined): string => {
  if (!url) return "";
  if (
    url.startsWith("http") ||
    url.startsWith("blob:") ||
    url.startsWith("data:")
  ) {
    return url;
  }
  const getBackendHost = () => {
    if (typeof window !== "undefined") {
      return `http://${window.location.hostname}:8888`;
    }
    return (
      process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ||
      "http://localhost:8888"
    );
  };
  const backendHost = getBackendHost();
  return `${backendHost}${url.startsWith("/") ? "" : "/"}${url}`;
};
