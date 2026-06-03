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
export const parseMessageContent = (content: any): MessageContentJSON => {
  // Nếu content đã là object (do axios tự parse)
  if (typeof content === 'object' && content !== null) {
    if (typeof content.isRichText === 'boolean' && typeof content.text === 'string') {
      return {
        isRichText: content.isRichText,
        text: content.text,
        plainText: content.plainText || (content.isRichText ? stripHtml(content.text) : content.text)
      };
    }
  }

  const safeContent = (typeof content === 'string' ? content : JSON.stringify(content)) || "";
  const trimmed = safeContent.trim();
  
  // Thử parse nhiều lần nếu bị double stringify
  let currentStr = trimmed;
  let parsedObj: any = null;
  
  for (let i = 0; i < 3; i++) {
    try {
      // Loại bỏ ngoặc kép bao ngoài nếu bị double stringify dạng "{\"isRichText\"...}"
      if (currentStr.startsWith('"') && currentStr.endsWith('"')) {
        currentStr = currentStr.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      }
      if (currentStr.startsWith("{") && currentStr.endsWith("}")) {
        const parsed = JSON.parse(currentStr);
        if (parsed && typeof parsed === 'object' && 'text' in parsed) {
          parsedObj = parsed;
          break;
        }
        if (typeof parsed === 'string') {
          currentStr = parsed;
        } else {
          break;
        }
      } else {
        break;
      }
    } catch (e) {
      break; // Lỗi parse thì dừng
    }
  }

  if (parsedObj && typeof parsedObj.text === "string") {
    const isRich = parsedObj.isRichText === true || parsedObj.isRichText === "true";
    return {
      isRichText: isRich,
      text: parsedObj.text,
      plainText: parsedObj.plainText || (isRich ? stripHtml(parsedObj.text) : parsedObj.text)
    };
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
