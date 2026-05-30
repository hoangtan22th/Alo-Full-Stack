import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Platform,
} from "react-native";
import {
  XMarkIcon,
  UserIcon,
  UserGroupIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  ShieldExclamationIcon,
} from "react-native-heroicons/outline";

interface Member {
  id: string;
  name: string;
  avatar?: string;
}

interface ReportTargetModalProps {
  visible: boolean;
  onClose: () => void;
  groupName: string;
  members: Member[];
  onSelectTarget: (targetType: "USER" | "GROUP", targetId: string, targetName: string) => void;
}

export const ReportTargetModal: React.FC<ReportTargetModalProps> = ({
  visible,
  onClose,
  groupName,
  members,
  onSelectTarget,
}) => {
  const [step, setStep] = useState<"choice" | "members">("choice");

  const handleClose = () => {
    setStep("choice");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={styles.badgeContainer}>
                <ShieldExclamationIcon size={22} color="#d97706" />
              </View>
              <View>
                <Text style={styles.title}>Phân loại báo cáo</Text>
                <Text style={styles.subtitle}>
                  {step === "choice"
                    ? "Vui lòng chọn đối tượng vi phạm"
                    : "Chọn thành viên nhóm muốn báo cáo"}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <XMarkIcon size={22} color="#4b5563" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={styles.body}>
            {step === "choice" ? (
              <View style={styles.choiceContainer}>
                {/* Option 1: Report Member */}
                <TouchableOpacity
                  onPress={() => setStep("members")}
                  style={styles.choiceCard}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 14, flex: 1 }}>
                    <View style={[styles.iconWrapper, { backgroundColor: "#eff6ff" }]}>
                      <UserIcon size={24} color="#2563eb" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.choiceTitle}>Thành viên</Text>
                      <Text style={styles.choiceDesc}>Báo cáo cá nhân cụ thể vi phạm</Text>
                    </View>
                  </View>
                  <ChevronRightIcon size={20} color="#9ca3af" />
                </TouchableOpacity>

                {/* Option 2: Report Group */}
                <TouchableOpacity
                  onPress={() => onSelectTarget("GROUP", "", groupName)}
                  style={styles.choiceCard}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 14, flex: 1 }}>
                    <View style={[styles.iconWrapper, { backgroundColor: "#fef2f2" }]}>
                      <UserGroupIcon size={24} color="#dc2626" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.choiceTitle}>Toàn bộ nhóm</Text>
                      <Text style={styles.choiceDesc}>Báo cáo nội dung chung của nhóm</Text>
                    </View>
                  </View>
                  <ChevronRightIcon size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  onPress={() => setStep("choice")}
                  style={styles.backButton}
                >
                  <ArrowLeftIcon size={16} color="#2563eb" />
                  <Text style={styles.backText}>QUAY LẠI</Text>
                </TouchableOpacity>

                <ScrollView style={styles.membersList} showsVerticalScrollIndicator={false}>
                  {members.map((member) => (
                    <TouchableOpacity
                      key={member.id}
                      onPress={() => onSelectTarget("USER", member.id, member.name)}
                      style={styles.memberCard}
                    >
                      {member.avatar ? (
                        <Image
                          source={{ uri: member.avatar }}
                          style={styles.avatar}
                        />
                      ) : (
                        <View style={styles.avatarFallback}>
                          <Text style={styles.avatarText}>
                            {(member.name || "U").charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.memberName}>{member.name || "Người dùng ẩn danh"}</Text>
                        <Text style={styles.memberRole}>Thành viên nhóm</Text>
                      </View>
                      <ChevronRightIcon size={18} color="#9ca3af" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </View>
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
    height: "60%",
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
    backgroundColor: "#fef3c7",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },
  subtitle: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "500",
    marginTop: 1,
  },
  closeButton: {
    padding: 4,
  },
  body: {
    flex: 1,
    padding: 20,
  },
  choiceContainer: {
    gap: 12,
  },
  choiceCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  choiceDesc: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "500",
    marginTop: 2,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 15,
  },
  backText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#2563eb",
  },
  membersList: {
    flex: 1,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2563eb",
  },
  memberName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  memberRole: {
    fontSize: 10,
    color: "#9ca3af",
    fontWeight: "600",
    marginTop: 1,
  },
});
