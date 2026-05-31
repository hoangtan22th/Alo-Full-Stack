export interface ParsedPoll {
  question: string;
}

export function parsePollFromText(text: string): ParsedPoll | null {
  if (!text) return null;
  const content = text.trim();

  // Regex patterns for poll keywords
  const pollRegex = /(vote|bình chọn|biểu quyết|khảo sát)/i;

  if (!pollRegex.test(content)) return null;

  // Clean title: remove the matched keywords
  let cleanTitle = content
    .replace(pollRegex, "")
    .replace(/(nào|đi|mọi người|anh em|các bạn|nha|nhé)/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  // Clean trailing punctuation or leading dashes
  cleanTitle = cleanTitle.replace(/^[\-\s\:]+/, "").replace(/[\-\s\:]+$/, "");

  if (!cleanTitle) {
    cleanTitle = "Cuộc bình chọn mới";
  } else {
    cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
  }

  return {
    question: cleanTitle,
  };
}
