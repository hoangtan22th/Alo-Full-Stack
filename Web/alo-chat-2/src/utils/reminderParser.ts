export interface ParsedReminder {
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  originalMatch: string; // The time text that matched (e.g. "Ngày mai 12h")
}

export function parseReminderFromText(text: string): ParsedReminder | null {
  if (!text) return null;
  const content = text.trim();

  // Regex patterns for time
  // Matches "12h30", "12h", "12:30", "9h30", "12 giờ 30", "12 giờ", "9 giờ rưỡi"
  const timeRegex = /(?:(\d{1,2})h(\d{2})?|(\d{1,2}):(\d{2})|(\d{1,2})\s*(?:giờ|g)\s*(\d{2})?)/i;

  // Regex patterns for days
  const todayRegex = /(hôm nay|nay|tối nay|chiều nay|trưa nay|sáng nay)/i;
  const tomorrowRegex = /(ngày mai|mai|sáng mai|tối mai|chiều mai|trưa mai)/i;
  const nextMondayRegex = /(thứ hai tuần sau|thứ 2 tuần sau|hai tuần sau|thứ hai tới)/i;
  const nextWeekRegex = /(tuần sau|tuần tới)/i;

  const timeMatch = content.match(timeRegex);
  if (!timeMatch) return null;

  // Extract hour and minute
  let hour = 0;
  let minute = 0;

  if (timeMatch[1] !== undefined) {
    hour = parseInt(timeMatch[1]);
    minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
  } else if (timeMatch[3] !== undefined) {
    hour = parseInt(timeMatch[3]);
    minute = parseInt(timeMatch[4]);
  } else if (timeMatch[5] !== undefined) {
    hour = parseInt(timeMatch[5]);
    minute = timeMatch[6] ? parseInt(timeMatch[6]) : 0;
  }

  // Adjust PM times safely (e.g. "8h tối" -> 20:00, "2h chiều" -> 14:00)
  if (hour < 12 && /(tối|chiều|đêm|trưa)/i.test(content)) {
    // Treat "trưa" (midday) specially: "12h trưa" is 12, not 24.
    if (hour !== 12 || !/trưa/i.test(content)) {
      if (/trưa/i.test(content) && hour < 12) {
        hour += 12; // E.g. 11h trưa? No, typically 11h trưa is 11, but 12h trưa is 12. Let's just adjust for 1-6 PM.
      } else {
        hour += 12;
      }
    }
  }

  const formattedHour = String(hour).padStart(2, "0");
  const formattedMinute = String(minute).padStart(2, "0");
  const timeStr = `${formattedHour}:${formattedMinute}`;

  // Resolve Date
  const targetDate = new Date();
  let matchedDate = false;
  let dateLabel = "Hôm nay";

  if (tomorrowRegex.test(content)) {
    targetDate.setDate(targetDate.getDate() + 1);
    matchedDate = true;
    dateLabel = "Ngày mai";
  } else if (todayRegex.test(content)) {
    matchedDate = true;
    dateLabel = "Hôm nay";
  } else if (nextMondayRegex.test(content)) {
    const currentDay = targetDate.getDay();
    const daysUntilNextMonday = currentDay === 0 ? 1 : 8 - currentDay;
    targetDate.setDate(targetDate.getDate() + daysUntilNextMonday);
    matchedDate = true;
    dateLabel = "Thứ 2 tuần sau";
  } else if (nextWeekRegex.test(content)) {
    targetDate.setDate(targetDate.getDate() + 7);
    matchedDate = true;
    dateLabel = "Tuần sau";
  } else {
    // Check for "ngày X/Y" or "ngày X tháng Y" or "X/Y"
    const datePattern = /(?:ngày\s*)?(\d{1,2})[\/\-](\d{1,2})/;
    const dateMatch = content.match(datePattern);
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]) - 1;
      targetDate.setMonth(month);
      targetDate.setDate(day);
      matchedDate = true;
      dateLabel = `Ngày ${day}/${month + 1}`;
    }
  }

  if (!matchedDate) return null;

  const yearStr = targetDate.getFullYear();
  const monthStr = String(targetDate.getMonth() + 1).padStart(2, "0");
  const dayStr = String(targetDate.getDate()).padStart(2, "0");
  const dateStr = `${yearStr}-${monthStr}-${dayStr}`;

  // Clean title: remove the matched time/day keywords
  let cleanTitle = content
    .replace(timeRegex, "")
    .replace(tomorrowRegex, "")
    .replace(todayRegex, "")
    .replace(nextMondayRegex, "")
    .replace(nextWeekRegex, "")
    .replace(/(?:ngày\s*)?(\d{1,2})[\/\-](\d{1,2})/, "")
    .replace(/(nhắc|hẹn|nhắc hẹn|lịch|lúc|vào|lượt)/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  // Clean trailing punctuation or leading dashes
  cleanTitle = cleanTitle.replace(/^[\-\s\:]+/, "").replace(/[\-\s\:]+$/, "");

  if (!cleanTitle) {
    cleanTitle = "Sự kiện nhắc hẹn";
  } else {
    cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
  }

  return {
    title: cleanTitle,
    date: dateStr,
    time: timeStr,
    originalMatch: `${dateLabel} lúc ${timeStr}`,
  };
}
