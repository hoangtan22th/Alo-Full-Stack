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
import { XMarkIcon, CameraIcon, TrashIcon, AdjustmentsHorizontalIcon } from "react-native-heroicons/outline";

import * as ImagePicker from "expo-image-picker";
import {
  reportService,
  TargetType,
  ReportReason,
} from "../services/reportService";
import { messageService } from "../services/messageService";
import { useAuth } from "../contexts/AuthContext";


interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  targetId: string;
  targetType: TargetType;
  targetName: string;
  selectedMessageIds?: string[];
  onSelectMessages?: () => void;
  onSuccess?: () => void;
}


const REASONS = [
  { label: "Lừa đảo / Gian lận", value: ReportReason.SCAM_FRAUD },
  { label: "Spam / Quấy rối", value: ReportReason.SPAM_HARRASSMENT },
  { label: "Nội dung tình dục", value: ReportReason.SEXUAL_CONTENT },
  { label: "Bạo lực / Khủng bố", value: ReportReason.VIOLENCE_TERRORISM },
  { label: "Xâm hại trẻ em", value: ReportReason.CHILD_ABUSE },
  { label: "Khác", value: ReportReason.OTHER },
];


export const ReportModal: React.FC<ReportModalProps> = ({
  visible,
  onClose,
  targetId,
  targetType,
  targetName,
  selectedMessageIds,
  onSelectMessages,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(
    null
  );
  const [description, setDescription] = useState("");
  const [selectedImages, setSelectedImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isCustomizeMode, setIsCustomizeMode] = useState(false);

  const hasMessages = (selectedMessageIds || []).length > 0;


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

    const hasDescription = description.trim().length > 0;
    const hasImages = selectedImages.length > 0;
    const hasMessages = (selectedMessageIds || []).length > 0;

    if (targetType === TargetType.USER) {
      if (!hasDescription && !hasImages && !hasMessages) {
        Alert.alert("Lỗi", "Vui lòng cung cấp ít nhất một bằng chứng (mô tả, hình ảnh hoặc tin nhắn).");
        return;
      }
      
      if (hasMessages) {
        const msgCount = selectedMessageIds!.length;
        if (msgCount < 3 || msgCount > 40) {
          Alert.alert("Lỗi", "Báo cáo người dùng yêu cầu từ 3 đến 40 tin nhắn làm bằng chứng.");
          return;
        }
      }
    } else {
      // GROUP reports
      if (hasImages || hasMessages) {
        Alert.alert("Lỗi", "Báo cáo nhóm chỉ chấp nhận mô tả văn bản, không bao gồm hình ảnh hoặc tin nhắn.");
        return;
      }
    }

    setLoading(true);
    try {
      // 1. Upload images if any (Only for USER reports based on backend logic)
      let finalImageUrls: string[] = [];
      if (hasImages && targetType === TargetType.USER) {
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

      await reportService.createReport({
        reporterId,
        targetId,
        targetType,
        reason: selectedReason,
        description: hasDescription ? description : "",
        imageUrls: finalImageUrls,
        messageIds: targetType === TargetType.USER ? (selectedMessageIds || []) : [],
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
    setIsCustomizeMode(false);
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
            <Text style={styles.title}>Báo cáo {targetType === TargetType.USER ? "người dùng" : "nhóm"}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <XMarkIcon size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.targetInfo}>
              Bạn đang báo cáo: <Text style={styles.targetName}>{targetName}</Text>
            </Text>

            <Text style={styles.sectionTitle}>Lý do báo cáo:</Text>
            {REASONS.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.reasonItem,
                  selectedReason === item.value && styles.reasonItemSelected,
                ]}
                onPress={() => setSelectedReason(item.value)}
              >
                <View style={styles.radioButton}>
                  {selectedReason === item.value && <View style={styles.radioButtonInner} />}
                </View>
                <Text style={styles.reasonLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}

            {targetType === TargetType.USER && !isCustomizeMode && selectedReason !== ReportReason.OTHER && (
              <View style={styles.evidenceSummary}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.evidenceText}>
                    {hasMessages ? (
                      <>
                        Hệ thống đã tự động chọn <Text style={{ fontWeight: 'bold' }}>{selectedMessageIds!.length}</Text> tin nhắn làm bằng chứng.
                      </>
                    ) : (
                      "Chưa có bằng chứng nào được chọn."
                    )}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.customizeButton}
                  onPress={() => setIsCustomizeMode(true)}
                >
                  <AdjustmentsHorizontalIcon size={16} color="#b45309" />
                  <Text style={styles.customizeButtonText}>Tùy chỉnh</Text>
                </TouchableOpacity>
              </View>
            )}

            {isCustomizeMode && targetType === TargetType.USER && (
              <View style={styles.evidenceSummary}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.evidenceText}>
                    {hasMessages ? (
                      <>
                        Đã chọn <Text style={{ fontWeight: 'bold' }}>{selectedMessageIds!.length}</Text> tin nhắn làm bằng chứng.
                      </>
                    ) : (
                      "Chưa có tin nhắn bằng chứng nào được chọn."
                    )}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.primaryButton}
                  onPress={onSelectMessages}
                >
                  <AdjustmentsHorizontalIcon size={16} color="#ffffff" />
                  <Text style={styles.primaryButtonText}>{hasMessages ? "Thay đổi tin nhắn" : "Chọn tin nhắn bằng chứng"}</Text>
                </TouchableOpacity>
              </View>
            )}

            {(isCustomizeMode || selectedReason === ReportReason.OTHER) && (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.sectionTitle}>Mô tả chi tiết {selectedReason === ReportReason.OTHER && <Text style={{color: '#ef4444'}}>*</Text>}:</Text>
                <TextInput
                  style={styles.input}
                  placeholder={selectedReason === ReportReason.OTHER ? "Vui lòng mô tả chi tiết lý do bạn báo cáo..." : "Cung cấp thêm ngữ cảnh cho quản trị viên (tùy chọn)..."}
                  multiline
                  numberOfLines={4}
                  value={description}
                  onChangeText={setDescription}
                  textAlignVertical="top"
                  maxLength={500}
                />

                {targetType === TargetType.USER && (
                  <>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Hình ảnh đính kèm (tối đa 5)</Text>
                      <Text style={styles.imageCount}>{selectedImages.length}/5</Text>
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
                          <CameraIcon size={24} color="#9ca3af" />
                          <Text style={styles.uploadText}>Thêm ảnh</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
                )}
              </View>
            )}
          </ScrollView>



          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
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
                    {uploadProgress > 0 && uploadProgress < 100 ? `Tải ảnh (${uploadProgress}%)` : "Đang gửi..."}
                  </Text>
                </View>
              ) : (
                <Text style={styles.submitButtonText}>Gửi báo cáo</Text>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  body: {
    padding: 16,
  },
  targetInfo: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  targetName: {
    fontWeight: "bold",
    color: "#000",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 10,
    marginBottom: 12,
  },
  reasonItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#f9f9f9",
  },
  reasonItemSelected: {
    backgroundColor: "#eef2ff",
    borderColor: "#4f46e5",
    borderWidth: 1,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#4f46e5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4f46e5",
  },
  reasonLabel: {
    fontSize: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    fontSize: 15,
    marginBottom: 20,
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4b5563",
  },
  submitButton: {
    flex: 2,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#ef4444",
  },
  submitButtonDisabled: {
    backgroundColor: "#fca5a5",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  imageCount: {
    fontSize: 12,
    color: '#9ca3af',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  imageWrapper: {
    width: (Platform.OS === 'ios' ? 70 : 65),
    height: (Platform.OS === 'ios' ? 70 : 65),
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
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
    width: (Platform.OS === 'ios' ? 70 : 65),
    height: (Platform.OS === 'ios' ? 70 : 65),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  uploadText: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
  },
  evidenceSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    marginBottom: 10,
  },
  evidenceText: {
    fontSize: 12,
    color: '#b45309',
    lineHeight: 18,
  },
  customizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    paddingVertical: 4,
  },
  customizeButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#b45309',
    marginLeft: 4,
  },
});


