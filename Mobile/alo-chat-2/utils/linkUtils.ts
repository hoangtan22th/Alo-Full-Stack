/**
 * Utility to fetch and parse Open Graph metadata from a URL.
 * Scrapes title, description, image, and site name.
 */

export interface LinkMetadata {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  url: string;
}

export const getLinkMetadata = async (url: string): Promise<LinkMetadata> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; LinkPreviewBot/1.0; +http://example.com/bot)",
      },
    });

    clearTimeout(timeoutId);

    const html = await response.text();

    const getMetaTag = (html: string, property: string): string | null => {
      // Matches <meta property="og:title" content="..."> or <meta content="..." property="og:title">
      // Handles both "property" and "name" attributes
      const regex = new RegExp(
        `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`,
        "i",
      );
      const match = html.match(regex);
      if (match) return decodeHtmlEntities(match[1]);

      const altRegex = new RegExp(
        `<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`,
        "i",
      );
      const altMatch = html.match(altRegex);
      if (altMatch) return decodeHtmlEntities(altMatch[1]);

      return null;
    };

    const getTitleTag = (html: string): string | null => {
      const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      return match ? decodeHtmlEntities(match[1]) : null;
    };

    const title = getMetaTag(html, "og:title") || getTitleTag(html);
    const description =
      getMetaTag(html, "og:description") || getMetaTag(html, "description");
    const image = getMetaTag(html, "og:image");
    const siteName = getMetaTag(html, "og:site_name") || getHostName(url);

    return {
      title: title ? title.trim() : null,
      description: description ? description.trim() : null,
      image: image ? fixImageUrl(url, image) : null,
      siteName: siteName ? siteName.trim() : null,
      url,
    };
  } catch (error) {
    console.error(`[getLinkMetadata] Error for ${url}:`, error);
    return {
      title: null,
      description: null,
      image: null,
      siteName: getHostName(url),
      url,
    };
  }
};

const decodeHtmlEntities = (str: string): string => {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—");
};

const getHostName = (url: string): string | null => {
  try {
    const match = url.match(/:\/\/(www[0-9]?\.)?(.[^/:]+)/i);
    if (match && match.length > 2 && typeof match[2] === "string") {
      return match[2];
    }
  } catch (e) {}
  return null;
};

const fixImageUrl = (baseUrl: string, imageUrl: string): string => {
  if (imageUrl.startsWith("http")) return imageUrl;
  try {
    const url = new URL(baseUrl);
    if (imageUrl.startsWith("//")) return `${url.protocol}${imageUrl}`;
    if (imageUrl.startsWith("/")) return `${url.origin}${imageUrl}`;
    return `${url.origin}/${imageUrl}`;
  } catch (e) {
    return imageUrl;
  }
};

