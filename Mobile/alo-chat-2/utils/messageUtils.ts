export const getMessageTextContent = (content: string): string => {
  if (!content) return "";
  try {
    if (content.startsWith("{") && content.includes('"isRichText"')) {
      const parsed = JSON.parse(content);
      if (parsed.plainText) return parsed.plainText;
      if (parsed.text) return parsed.text;
    }
  } catch (e) {
    // Ignore JSON parse errors
  }
  return content;
};
