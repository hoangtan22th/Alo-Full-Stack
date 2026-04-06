import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
  Image,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import api from "../../services/api";

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Quản lý DatePicker
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date(2000, 0, 1)); // Mặc định lùi về năm 2000 khi mở lịch

  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    gender: 1, // 0: Female, 1: Male, 2: Other
    email: "",
    dateOfBirth: null as Date | null, // Trạng thái ban đầu là null
  });

  const router = useRouter();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get("/auth/me");
      const userData = res.data;
      setUser(userData);
      setFormData({
        fullName: userData.fullName || "",
        phoneNumber: userData.phoneNumber || "",
        gender: userData.gender ?? 1,
        email: userData.email || "",
        // Kiểm tra nếu server có ngày sinh thì mới set, không thì để null
        dateOfBirth: userData.dateOfBirth
          ? new Date(userData.dateOfBirth)
          : null,
      });
    } catch (err) {
      console.log("Lỗi tải profile:", err);
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  };

  const formatDateToString = (date: Date | null) => {
    if (!date) return "";
    return date.toISOString().split("T")[0];
  };

  // Logic mở Picker: Nếu chưa có ngày, gợi ý năm 2000
  const openDatePicker = () => {
    setTempDate(formData.dateOfBirth || new Date(2000, 0, 1));
    setShowDatePicker(true);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
      // Android: Chỉ cập nhật khi nhấn nút OK
      if (event.type === "set" && selectedDate) {
        setFormData({ ...formData, dateOfBirth: selectedDate });
      }
    } else {
      // iOS: Lưu vào biến tạm chờ nhấn Done
      if (selectedDate) setTempDate(selectedDate);
    }
  };

  const confirmDateIOS = () => {
    setFormData({ ...formData, dateOfBirth: tempDate });
    setShowDatePicker(false);
  };

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      const res = await api.put("/auth/me", {
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        gender: formData.gender,
        dateOfBirth: formatDateToString(formData.dateOfBirth),
      });
      setUser(res.data);
      Alert.alert("Thành công", "Thông tin cá nhân đã được cập nhật!");
    } catch (error: any) {
      Alert.alert("Lỗi", "Không thể lưu thông tin. Vui lòng thử lại.");
    } finally {
      setUpdating(false);
    }
  };

  const logout = async () => {
    Alert.alert("Đăng xuất", "Bạn có chắc muốn thoát tài khoản?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Thoát",
        style: "destructive",
        onPress: async () => {
          try {
            await api.post("/auth/logout");
          } catch (e) {}
          await AsyncStorage.removeItem("accessToken");
          router.replace("/login");
        },
      },
    ]);
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.mainContainer}
    >
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleUpdate} disabled={updating}>
          {updating ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.doneText}>Done</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Banner & Avatar */}
        <View style={styles.imageSection}>
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1557683316-973673baf926",
            }}
            style={styles.coverImage}
          />
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || "Felix"}`,
              }}
              style={styles.avatarImage}
            />
            <TouchableOpacity style={styles.cameraBtn}>
              <Feather name="camera" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.form}>
          <Text style={styles.inputLabel}>FULL NAME</Text>
          <TextInput
            style={styles.input}
            value={formData.fullName}
            onChangeText={(t) => setFormData({ ...formData, fullName: t })}
            placeholder="Alexandra Chen"
            placeholderTextColor="#aaa"
          />

          <Text style={styles.inputLabel}>GENDER</Text>
          <View style={styles.genderRow}>
            {["FEMALE", "MALE", "OTHER"].map((label, index) => (
              <TouchableOpacity
                key={label}
                style={[
                  styles.genderTab,
                  formData.gender === index && styles.activeGenderTab,
                ]}
                onPress={() => setFormData({ ...formData, gender: index })}
              >
                <Text
                  style={[
                    styles.genderTabText,
                    formData.gender === index && styles.activeGenderText,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* DATE OF BIRTH FIELD */}
          <Text style={styles.inputLabel}>DATE OF BIRTH</Text>
          <TouchableOpacity style={styles.input} onPress={openDatePicker}>
            <View style={styles.datePickerContent}>
              <Text
                style={[
                  styles.dateValueText,
                  !formData.dateOfBirth && { color: "#999" },
                ]}
              >
                {formData.dateOfBirth
                  ? formatDateToString(formData.dateOfBirth)
                  : "Chọn ngày sinh"}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#8e8e93" />
            </View>
          </TouchableOpacity>

          {showDatePicker && (
            <View style={styles.pickerWrapper}>
              {Platform.OS === "ios" && (
                <View style={styles.iosPickerHeader}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={{ color: "red" }}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={confirmDateIOS}>
                    <Text style={{ color: "#007AFF", fontWeight: "bold" }}>
                      Xác nhận
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              <DateTimePicker
                value={tempDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onDateChange}
                maximumDate={new Date()}
              />
            </View>
          )}

          <Text style={styles.inputLabel}>PHONE NUMBER</Text>
          <TextInput
            style={styles.input}
            value={formData.phoneNumber}
            keyboardType="phone-pad"
            onChangeText={(t) => setFormData({ ...formData, phoneNumber: t })}
            placeholder="+1 (555) 0123 4567"
            placeholderTextColor="#aaa"
          />

          <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
          <TextInput
            style={[styles.input, styles.disabledInput]}
            value={formData.email}
            editable={false}
          />

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleUpdate}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>LƯU THAY ĐỔI</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
            <Text style={styles.logoutBtnText}>ĐĂNG XUẤT TÀI KHOẢN</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 50 : 25,
    paddingBottom: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#000" },
  doneText: { fontSize: 16, fontWeight: "600", color: "#000" },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  imageSection: { height: 240, alignItems: "center", marginBottom: 50 },
  coverImage: { width: "100%", height: 180 },
  avatarContainer: {
    position: "absolute",
    bottom: 0,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#fff",
    backgroundColor: "#fff",
    elevation: 8,
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  avatarImage: { width: "100%", height: "100%", borderRadius: 60 },
  cameraBtn: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#333",
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  form: { paddingHorizontal: 25 },
  inputLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#8e8e93",
    marginBottom: 10,
    marginTop: 25,
    letterSpacing: 1.2,
  },
  input: {
    backgroundColor: "#f2f2f7",
    height: 55,
    borderRadius: 28,
    paddingHorizontal: 25,
    fontSize: 15,
    color: "#000",
    fontWeight: "500",
    justifyContent: "center",
  },
  disabledInput: { color: "#999", backgroundColor: "#f9f9f9" },
  datePickerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateValueText: { fontSize: 15, fontWeight: "500", color: "#000" },
  pickerWrapper: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginTop: 10,
    overflow: "hidden",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  iosPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  genderRow: {
    flexDirection: "row",
    backgroundColor: "#f2f2f7",
    borderRadius: 28,
    height: 56,
    padding: 4,
  },
  genderTab: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 24,
  },
  activeGenderTab: {
    backgroundColor: "#fff",
    elevation: 3,
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  genderTabText: { fontSize: 12, fontWeight: "700", color: "#8e8e93" },
  activeGenderText: { color: "#000" },
  saveBtn: {
    backgroundColor: "#000",
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
  },
  logoutBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
    paddingVertical: 15,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: "#FF3B30",
    gap: 10,
  },
  logoutBtnText: {
    color: "#FF3B30",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
