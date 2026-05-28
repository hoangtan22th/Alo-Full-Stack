import * as WebBrowser from "expo-web-browser";
import { Paths, File } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";

/**
 * Opens a remote file URL in an in-app browser for immediate preview.
 * Falls back to downloading and sharing if the browser cannot be opened.
 * @param url The public URL of the file (e.g. S3 URL)
 * @param fileName The name to save the file as (including extension)
 */
export const openRemoteFile = async (url: string, fileName: string) => {
  try {
    // 1. Try In-App Browser for immediate preview (Works great for PDF, Images, etc.)
    await WebBrowser.openBrowserAsync(url, {
      dismissButtonStyle: "close",
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
    });
  } catch (error) {
    console.warn("[fileUtils] WebBrowser failed, falling back to Sharing:", error);
    try {
      // Fallback: Download and Share/Open
      const destination = new File(Paths.cache, fileName);
      const downloadedFile = await File.downloadFileAsync(url, destination, {
        idempotent: true,
      });

      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(downloadedFile.uri, {
          dialogTitle: fileName,
        });
      } else {
        Alert.alert("Thông báo", "Thiết bị không hỗ trợ xem tập tin này.");
      }
    } catch (innerError) {
      console.error("[fileUtils] Fallback failed:", innerError);
      Alert.alert("Lỗi", "Không thể tải hoặc mở tập tin này.");
    }
  }
};
