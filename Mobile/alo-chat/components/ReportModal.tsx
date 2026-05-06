import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { 
  XMarkIcon, 
  CameraIcon, 
  TrashIcon, 
  HandThumbDownIcon,
  ChatBubbleBottomCenterTextIcon,
  ShieldCheckIcon,
  EyeSlashIcon,
  NoSymbolIcon,
  ExclamationTriangleIcon,
  DocumentMagnifyingGlassIcon
} from "react-native-heroicons/outline";

import * as ImagePicker from "expo-image-picker";
import {
  reportService,
  TargetType,
  ReportReason,
} from "../services/reportService";
import { messageService, MessageDTO } from "../services/messageService";
import { useAuth } from "../contexts/AuthContext";
import { generateEvidenceSnapshot } from "../utils/reportUtils";


interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  targetId: string;
  targetType: TargetType;
  targetName: string;
  selectedMessageIds?: string[];
  messages?: MessageDTO[];
  getAvatarForUser?: (senderId: string) => string;
  onSelectMessages?: () => void;
  onSuccess?: () => void;
  conversationId?: string;
  conversationType?: "ONE_TO_ONE" | "GROUP";
}


const REASONS = [
  { value: ReportReason.SCAM_FRAUD, label: "Lừa đảo", icon: HandThumbDownIcon, color: "#f97316", bg: "#fff7ed" },
  { value: ReportReason.SPAM_HARRASSMENT, label: "Spam/Quấy rối", icon: ChatBubbleBottomCenterTextIcon, color: "#2563eb", bg: "#eff6ff" },
  { value: ReportReason.CHILD_ABUSE, label: "Xâm hại trẻ em", icon: ShieldCheckIcon, color: "#dc2626", bg: "#fef2f2" },
  { value: ReportReason.SEXUAL_CONTENT, label: "Nội dung tình dục", icon: EyeSlashIcon, color: "#db2777", bg: "#fdf2f8" },
  { value: ReportReason.VIOLENCE_TERRORISM, label: "Bạo lực", icon: NoSymbolIcon, color: "#111827", bg: "#f3f4f6" },
  { value: ReportReason.OTHER, label: "Khác", icon: ExclamationTriangleIcon, color: "#6b7280", bg: "#f9fafb" },
];


export const ReportModal: React.FC<ReportModalProps> = ({
  visible,
  onClose,
  targetId,
  targetType,
  targetName,
  selectedMessageIds,
  messages,
  getAvatarForUser,
  onSuccess,
  conversationId,
  conversationType,
}) => {
  const { user } = useAuth();
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(
    null
  );
  const [description, setDescription] = useState("");
  const [selectedImages, setSelectedImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [historyMessages, setHistoryMessages] = useState<any[]>([]);

  React.useEffect(() => {
    if (visible && conversationId && !messages) {
      messageService.getMessageHistory(conversationId, 30)
        .then((res) => {
          setHistoryMessages(res.messages || []);
        })
        .catch((err) => console.error("Lỗi lấy lịch sử tin nhắn báo cáo:", err));
    } else if (!visible) {
      setHistoryMessages([]);
    }
  }, [visible, conversationId, messages]);

  const activeMessages = messages || historyMessages;
  const hasMessages = (selectedMessageIds || []).length > 0 || activeMessages.length > 0;


  const handlePickImage = async () => {
    if (selectedImages.length >= 5) {
      Alert.alert("Thông báo", "Chỉ được tải lên tối đa 5 hình ảnh bằng chứng");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 5 - selectedImages.length,
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImages([...selectedImages, ...result.assets]);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert("Lỗi", "Vui lòng chọn lý do báo cáo");
      return;
    }

    if (selectedReason === ReportReason.OTHER && !description.trim()) {
      Alert.alert("Lỗi", 'Vui lòng nhập mô tả chi tiết cho lý do "Khác"');
      return;
    }

    const isMongoId = (id?: string | null) =>
      typeof id === "string" && /^[a-f0-9]{24}$/i.test(id);

    const reporterId = user?.id || user?._id;
    if (!reporterId || isMongoId(reporterId)) {
      Alert.alert("Lỗi", "Không thể xác định tài khoản của bạn. Vui lòng đăng xuất và đăng nhập lại.");
      return;
    }

    setLoading(true);
    try {
      let finalImageUrls: string[] = [];
      if (selectedImages.length > 0) {
        setUploadProgress(10);
        finalImageUrls = await messageService.uploadRawFiles(
          selectedImages,
          (percent) => setUploadProgress(percent)
        );
        if (finalImageUrls.length === 0) {
          Alert.alert("Lỗi", "Tải ảnh lên thất bại. Vui lòng thử lại.");
          setLoading(false);
          return;
        }
      }

      const anchorId = selectedMessageIds && selectedMessageIds.length > 0 ? selectedMessageIds[0] : undefined;
      const snapshots = generateEvidenceSnapshot(
        anchorId,
        activeMessages,
        reporterId,
        getAvatarForUser || (() => "")
      );

      await reportService.createReport({
        reporterId,
        targetId,
        targetType,
        reason: selectedReason,
        description: description.trim() || "",
        imageUrls: finalImageUrls,
        messageSnapshots: snapshots,
        conversationId,
        conversationType,
      });


      Alert.alert("Thành công", "Báo cáo của bạn đã được gửi và đang được xem xét. Cảm ơn bạn!");
      handleClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      Alert.alert("Lỗi", "Không thể gửi báo cáo. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    setSelectedReason(null);
    setDescription("");
    setSelectedImages([]);
    setUploadProgress(0);
    onClose();
  };


  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.badgeContainer}>
                <ShieldCheckIcon size={20} color="#2563eb" />
              </View>
              <View>
                <Text style={styles.title}>Báo cáo {targetType === TargetType.USER ? "người dùng" : "nhóm"}</Text>
                <Text style={styles.targetInfo}>{targetName}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <XMarkIcon size={22} color="#4b5563" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* --- REASON GRID --- */}
            <Text style={styles.sectionLabel}>LÝ DO BÁO CÁO</Text>
            <View style={styles.gridContainer}>
              {REASONS.map((item) => {
                const IconComponent = item.icon;
                const isSelected = selectedReason === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      styles.gridItem,
                      isSelected && { borderColor: "#2563eb", backgroundColor: "#f0f6ff" },
                    ]}
                    onPress={() => setSelectedReason(item.value)}
                  >
                    <View style={[styles.iconContainer, { backgroundColor: item.bg }]}>
                      <IconComponent size={18} color={item.color} />
                    </View>
                    <Text style={[styles.gridLabel, isSelected && { color: "#2563eb" }]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* --- EVIDENCE BANNER --- */}
            {hasMessages && (
              <View style={styles.evidenceBanner}>
                <DocumentMagnifyingGlassIcon size={22} color="#60a5fa" />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.evidenceTitle}>Bằng chứng tin nhắn</Text>
                  <Text style={styles.evidenceSub}>
                    Hệ thống đã lưu vết {(() => {
                      const anchorId = selectedMessageIds && selectedMessageIds.length > 0 ? selectedMessageIds[0] : undefined;
                      const snapshots = generateEvidenceSnapshot(
                        anchorId,
                        activeMessages,
                        user?.id || user?._id || "",
                        () => ""
                      );
                      return snapshots.length;
                    })()} tin nhắn làm bằng chứng.
                  </Text>
                </View>
              </View>
            )}

            {/* --- DETAILS INPUT --- */}
            <View style={{ marginTop: 15 }}>
              <Text style={styles.sectionLabel}>
                MÔ TẢ CHI TIẾT {selectedReason === ReportReason.OTHER && <Text style={{ color: '#ef4444' }}>*</Text>}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={selectedReason === ReportReason.OTHER ? "Vui lòng mô tả chi tiết lý do bạn báo cáo..." : "Cung cấp thêm ngữ cảnh cho quản trị viên (tùy chọn)..."}
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
                textAlignVertical="top"
                maxLength={500}
              />

              {/* --- IMAGE ATTACHMENTS --- */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>ẢNH ĐÍNH KÈM ({selectedImages.length}/5)</Text>
              </View>

              <View style={styles.imageGrid}>
                {selectedImages.map((img, idx) => (
                  <View key={idx} style={styles.imageWrapper}>
                    <Image
                      source={{ uri: img.uri }}
                      style={styles.previewImage}
                    />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(idx)}
                    >
                      <TrashIcon size={12} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                {selectedImages.length < 5 && (
                  <TouchableOpacity
                    style={styles.uploadPlaceholder}
                    onPress={handlePickImage}
                  >
                    <CameraIcon size={22} color="#9ca3af" />
                    <Text style={styles.uploadText}>Thêm ảnh</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>HỦY</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, (!selectedReason || loading) && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!selectedReason || loading}
            >
              {loading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={[styles.submitButtonText, { marginLeft: 8 }]}>
                    {uploadProgress > 0 && uploadProgress < 100 ? `Tải ảnh (${uploadProgress}%)` : "ĐANG GỬI..."}
                  </Text>
                </View>
              ) : (
                <Text style={styles.submitButtonText}>GỬI BÁO CÁO</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  content: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  badgeContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  body: {
    padding: 20,
  },
  targetInfo: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
    marginTop: 1,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: "#9ca3af",
    letterSpacing: 1,
    marginBottom: 10,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  gridItem: {
    width: "48%",
    flexDirection: "column",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: "#f9fafb",
    marginBottom: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4b5563",
  },
  evidenceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 12,
    marginTop: 5,
    marginBottom: 15,
  },
  evidenceTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fff',
  },
  evidenceSub: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 1,
  },
  input: {
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    padding: 14,
    minHeight: 80,
    fontSize: 13,
    color: "#111827",
    fontWeight: "500",
    marginBottom: 15,
  },
  footer: {
    flexDirection: "row",
    padding: 20,
    backgroundColor: "#f9fafb",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4b5563",
  },
  submitButton: {
    flex: 2,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#2563eb",
  },
  submitButtonDisabled: {
    backgroundColor: "#93c5fd",
  },
  submitButtonText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#fff",
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  imageWrapper: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    padding: 2,
  },
  uploadPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  uploadText: {
    fontSize: 8,
    fontWeight: "700",
    color: '#9ca3af',
    marginTop: 2,
  },
});
