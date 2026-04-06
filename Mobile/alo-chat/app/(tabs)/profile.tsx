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
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import api from "../../services/api";

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    gender: 1,
    dateOfBirth: new Date(), // Lưu dạng Date object để dùng cho Picker
  });

  const router = useRouter();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data);
      setFormData({
        fullName: res.data.fullName || "",
        phoneNumber: res.data.phoneNumber || "",
        gender: res.data.gender ?? 1,
        // Chuyển chuỗi YYYY-MM-DD từ server thành Date object
        dateOfBirth: res.data.dateOfBirth
          ? new Date(res.data.dateOfBirth)
          : new Date(),
      });
    } catch (err) {
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  };

  // Hàm format Date thành YYYY-MM-DD để gửi lên Backend
  const formatDateToString = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      await api.put("/auth/me", {
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        gender: formData.gender,
        dateOfBirth: formatDateToString(formData.dateOfBirth),
      });
      Alert.alert("Thành công", "Đã cập nhật thông tin!");
      setIsEditing(false);
      fetchProfile();
    } catch (error: any) {
      Alert.alert("Lỗi", "Không thể cập nhật thông tin");
    } finally {
      setUpdating(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios"); // iOS giữ hiện, Android tự đóng
    if (selectedDate) {
      setFormData({ ...formData, dateOfBirth: selectedDate });
    }
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0084ff" />
      </View>
    );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>Thông tin cá nhân</Text>

      <View style={styles.card}>
        <Text style={styles.label}>HỌ VÀ TÊN</Text>
        {isEditing ? (
          <TextInput
            style={styles.input}
            value={formData.fullName}
            onChangeText={(t) => setFormData({ ...formData, fullName: t })}
          />
        ) : (
          <Text style={styles.value}>{user?.fullName || "Chưa thiết lập"}</Text>
        )}

        <Text style={styles.label}>SỐ ĐIỆN THOẠI</Text>
        {isEditing ? (
          <TextInput
            style={styles.input}
            value={formData.phoneNumber}
            keyboardType="phone-pad"
            onChangeText={(t) => setFormData({ ...formData, phoneNumber: t })}
          />
        ) : (
          <Text style={styles.value}>
            {user?.phoneNumber || "Chưa thiết lập"}
          </Text>
        )}

        <Text style={styles.label}>GIỚI TÍNH</Text>
        {isEditing ? (
          <View style={styles.genderRow}>
            <TouchableOpacity
              style={[
                styles.genderBtn,
                formData.gender === 1 && styles.activeBtn,
              ]}
              onPress={() => setFormData({ ...formData, gender: 1 })}
            >
              <Text
                style={[
                  styles.genderText,
                  formData.gender === 1 && styles.activeText,
                ]}
              >
                Nam
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.genderBtn,
                formData.gender === 0 && styles.activeBtn,
              ]}
              onPress={() => setFormData({ ...formData, gender: 0 })}
            >
              <Text
                style={[
                  styles.genderText,
                  formData.gender === 0 && styles.activeText,
                ]}
              >
                Nữ
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.value}>{user?.gender === 1 ? "Nam" : "Nữ"}</Text>
        )}

        <Text style={styles.label}>NGÀY SINH</Text>
        {isEditing ? (
          <View>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowDatePicker(true)}
            >
              <Text>{formatDateToString(formData.dateOfBirth)}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={formData.dateOfBirth}
                mode="date"
                display="default"
                onChange={onDateChange}
                maximumDate={new Date()} // Không cho chọn ngày tương lai
              />
            )}
          </View>
        ) : (
          <Text style={styles.value}>
            {user?.dateOfBirth || "Chưa thiết lập"}
          </Text>
        )}
      </View>

      <View style={styles.buttonGroup}>
        {isEditing ? (
          <>
            <TouchableOpacity
              style={[styles.btn, styles.saveBtn]}
              onPress={handleUpdate}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Lưu thay đổi</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn]}
              onPress={() => setIsEditing(false)}
            >
              <Text style={{ fontWeight: "700" }}>Hủy</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.btn, styles.editBtn]}
            onPress={() => setIsEditing(true)}
          >
            <Text style={styles.btnText}>Chỉnh sửa thông tin</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f2f5", padding: 20 },
  center: { flex: 1, justifyContent: "center" },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 40,
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 15,
    elevation: 2,
  },
  label: { color: "#8e8e93", fontSize: 11, fontWeight: "700", marginBottom: 8 },
  value: {
    fontSize: 16,
    color: "#1c1c1e",
    marginBottom: 20,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e5ea",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    backgroundColor: "#fafafa",
  },
  genderRow: { flexDirection: "row", marginBottom: 20, gap: 10 },
  genderBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e5ea",
    alignItems: "center",
  },
  activeBtn: { backgroundColor: "#0084ff", borderColor: "#0084ff" },
  genderText: { fontWeight: "600" },
  activeText: { color: "#fff" },
  buttonGroup: { marginTop: 30 },
  btn: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  btnText: { color: "#fff", fontWeight: "700" },
  editBtn: { backgroundColor: "#0084ff" },
  saveBtn: { backgroundColor: "#34c759" },
  cancelBtn: { backgroundColor: "#e5e5ea" },
});
