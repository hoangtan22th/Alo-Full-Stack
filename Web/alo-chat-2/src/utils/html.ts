/**
 * Loại bỏ các thẻ HTML để lấy chuỗi plain text sạch cho mục đích xem trước (preview).
 */
export const stripHtml = (html: string | undefined | null): string => {
  if (!html) return "";
  
  // Thay thế các thẻ block, br bằng khoảng trắng để tránh dính chữ
  let text = html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/div>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<\/li>/gi, " ")
    .replace(/<\/h[1-6]>/gi, " ");

  // Loại bỏ tất cả thẻ HTML còn lại
  text = text.replace(/<[^>]*>/g, "");

  // Giải mã các thực thể HTML cơ bản
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Rút gọn các khoảng trắng thừa
  return text.replace(/\s+/g, " ").trim();
};

export interface MessageContentJSON {
  isRichText: boolean;
  text: string;
  plainText: string;
}

/**
 * Phân tích cú pháp nội dung tin nhắn.
 * Nếu nội dung là định dạng JSON hợp lệ do Client tạo ra, trả về object.
 * Nếu không (tin nhắn cũ hoặc do bên thứ ba tạo), trả về cấu trúc fallback.
 */
export const parseMessageContent = (content: string | undefined | null): MessageContentJSON => {
  const safeContent = content || "";
  const trimmed = safeContent.trim();
  
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed.isRichText === "boolean" && typeof parsed.text === "string") {
        return {
          isRichText: parsed.isRichText,
          text: parsed.text,
          plainText: parsed.plainText || (parsed.isRichText ? stripHtml(parsed.text) : parsed.text)
        };
      }
    } catch (e) {
      // Bỏ qua lỗi parse và fallback
    }
  }
  
  // Fallback cho tin nhắn cũ dạng text thường hoặc HTML thô
  const hasHtml = /<[a-z/][\s\S]*>/i.test(safeContent);
  return {
    isRichText: false, // Tin nhắn cũ luôn coi là text thường để an toàn
    text: safeContent,
    plainText: hasHtml ? stripHtml(safeContent) : safeContent
  };
};

/**
 * Mã hóa nội dung tin nhắn thành chuỗi JSON trước khi gửi đi.
 */
export const formatMessageContent = (text: string, isRichText: boolean): string => {
  const plainText = isRichText ? stripHtml(text) : text;
  return JSON.stringify({
    isRichText,
    text,
    plainText
  });
};
