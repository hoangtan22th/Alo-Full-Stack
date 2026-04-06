import { useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  ComputerDesktopIcon,
  KeyIcon,
  LockClosedIcon,
  TrashIcon,
  CheckIcon,
} from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "../../../services/api";

export default function AccountSecurityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAppLocked, setIsAppLocked] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);

  // Biến tạm để lưu trữ ngày được cuộn tới (dành riêng cho iOS)
  const [tempDate, setTempDate] = useState(new Date());

  const [accountInfo, setAccountInfo] = useState({
    fullName: "",
    dateOfBirth: "",
    gender: "1", // 1: Nam, 0: Nữ, 2: Khác
    phoneNumber: "",
    email: "",
  });

  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, []),
  );

  const fetchProfile = async () => {
    try {
      const res: any = await api.get("/auth/me");
      const user = res;

      const initialDate = user.dateOfBirth
        ? new Date(user.dateOfBirth)
        : new Date();
      setTempDate(initialDate);

      setAccountInfo({
        fullName: user.fullName || "",
        dateOfBirth: user.dateOfBirth || "",
        gender: user.gender !== undefined ? String(user.gender) : "1",
        phoneNumber: user.phoneNumber || "",
        email: user.email || "",
      });
    } catch (err) {
      console.log("Lỗi tải profile:", err);
      Alert.alert("Lỗi", "Không thể lấy thông tin tài khoản.");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  }, []);

  const handleUpdateProfile = async () => {
    try {
      setSaving(true);
      const payload = {
        fullName: accountInfo.fullName,
        phoneNumber: accountInfo.phoneNumber,
        gender: parseInt(accountInfo.gender),
        dateOfBirth: accountInfo.dateOfBirth || null, // YYYY-MM-DD
        email: accountInfo.email || null,
      };

      await api.put("/auth/me", payload);
      Alert.alert("Thành công", "Đã cập nhật thông tin cá nhân.");
    } catch (err) {
      console.log("Lỗi cập nhật profile:", err);
      Alert.alert("Lỗi", "Không thể cập nhật thông tin.");
    } finally {
      setSaving(false);
    }
  };

  const onChangeDate = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
      if (selectedDate && event.type !== "dismissed") {
        updateDateOfBirthString(selectedDate);
      }
    } else {
      // Đối với iOS, khi cuộn lịch, chúng ta chỉ cập nhật biến tạm `tempDate`
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  // Hàm tiện ích để chuyển Date thành chuỗi YYYY-MM-DD
  const updateDateOfBirthString = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    setAccountInfo({ ...accountInfo, dateOfBirth: `${yyyy}-${mm}-${dd}` });
  };

  // Hàm xác nhận ngày đối với iOS
  const confirmIOSDate = () => {
    updateDateOfBirthString(tempDate);
    setShowDatePicker(false);
  };

  const getGenderText = (val: string) => {
    if (val === "1") return "Nam";
    if (val === "0") return "Nữ";
    if (val === "2") return "Khác";
    return "";
  };

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return "";

    // Tách chuỗi theo dấu "-"
    const parts = dateString.split("-");
    if (parts.length === 3) {
      // parts[0] là Năm, parts[1] là Tháng, parts[2] là Ngày
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff", paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b-[1px] border-gray-200">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ArrowLeftIcon size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">
            Tài khoản và bảo mật
          </Text>
        </View>

        <TouchableOpacity onPress={handleUpdateProfile} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#111827" />
          ) : (
            <CheckIcon size={24} color="#111827" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 px-4 bg-[#fafafa]"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#000"]}
            tintColor="#000"
          />
        }
      >
        {/* Section 1: THÔNG TIN TÀI KHOẢN */}
        <View className="mt-6 mb-6">
          <Text className="text-[11px] font-bold text-gray-400 tracking-wider mb-4 px-1">
            THÔNG TIN TÀI KHOẢN
          </Text>

          <InputField
            label="HỌ VÀ TÊN"
            value={accountInfo.fullName}
            onChangeText={(text) =>
              setAccountInfo({ ...accountInfo, fullName: text })
            }
          />
          <InputField
            label="NGÀY SINH"
            value={formatDateForDisplay(accountInfo.dateOfBirth)}
            onPress={() => {
              // Cập nhật lại tempDate mỗi khi mở picker để tránh sai lệch
              const currentSetDate = accountInfo.dateOfBirth
                ? new Date(accountInfo.dateOfBirth)
                : new Date();
              setTempDate(currentSetDate);
              setShowDatePicker(true);
            }}
            editable={false}
          />
          <InputField
            label="GIỚI TÍNH"
            value={getGenderText(accountInfo.gender)}
            onPress={() => setShowGenderPicker(true)}
            editable={false}
          />
          <InputField
            label="SỐ ĐIỆN THOẠI"
            value={accountInfo.phoneNumber}
            keyboardType="phone-pad"
            onChangeText={(text) =>
              setAccountInfo({ ...accountInfo, phoneNumber: text })
            }
          />
          <InputField
            label="EMAIL"
            value={accountInfo.email}
            keyboardType="email-address"
            onChangeText={(text) =>
              setAccountInfo({ ...accountInfo, email: text })
            }
          />
        </View>

        {/* --- Phần Modal cho iOS DatePicker --- */}
        {Platform.OS === "ios" ? (
          <Modal
            visible={showDatePicker}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowDatePicker(false)}
          >
            <TouchableOpacity
              className="flex-1 justify-end bg-black/50"
              activeOpacity={1}
              onPress={() => setShowDatePicker(false)}
            >
              <View className="bg-white rounded-t-3xl overflow-hidden pb-8">
                {/* Thanh công cụ xác nhận/hủy của Modal iOS */}
                <View className="flex-row justify-between items-center px-4 py-4 border-b border-gray-100">
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text className="text-red-500 text-base font-medium">
                      Hủy
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={confirmIOSDate}>
                    <Text className="text-blue-600 text-base font-bold">
                      Xác nhận
                    </Text>
                  </TouchableOpacity>
                </View>

                <View className="flex items-center">
                  <DateTimePicker
                    testID="dateTimePicker"
                    value={tempDate}
                    mode="date"
                    display="spinner" // Kiểu cuộn đặc trưng của iOS
                    onChange={onChangeDate}
                    maximumDate={new Date()}
                    textColor="#000" // Đảm bảo text rõ ràng ở chế độ Light/Dark mode
                  />
                </View>
              </View>
            </TouchableOpacity>
          </Modal>
        ) : (
          /* --- Phần DatePicker cho Android (Hiển thị ngay lập tức) --- */
          showDatePicker && (
            <DateTimePicker
              testID="dateTimePicker"
              value={
                accountInfo.dateOfBirth
                  ? new Date(accountInfo.dateOfBirth)
                  : new Date()
              }
              mode="date"
              display="default"
              onChange={onChangeDate}
              maximumDate={new Date()}
            />
          )
        )}

        {/* Render Modal chọn Giới tính */}
        <Modal
          visible={showGenderPicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowGenderPicker(false)}
        >
          <TouchableOpacity
            className="flex-1 justify-end bg-black/50"
            activeOpacity={1}
            onPress={() => setShowGenderPicker(false)}
          >
            <View className="bg-white rounded-t-3xl p-6 pb-10">
              <Text className="text-lg font-bold text-center mb-4">
                Chọn giới tính
              </Text>
              {[
                { label: "Nam", value: "1" },
                { label: "Nữ", value: "0" },
                { label: "Khác", value: "2" },
              ].map((item) => (
                <TouchableOpacity
                  key={item.value}
                  className="py-4 border-b border-gray-100"
                  onPress={() => {
                    setAccountInfo({ ...accountInfo, gender: item.value });
                    setShowGenderPicker(false);
                  }}
                >
                  <Text
                    className={`text-center text-base ${accountInfo.gender === item.value ? "font-bold text-blue-600" : "text-gray-800"}`}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Section 2: BẢO MẬT */}
        <View className="mb-6">
          <Text className="text-[11px] font-bold text-gray-400 tracking-wider mb-4 px-1">
            BẢO MẬT
          </Text>

          <View className="bg-white p-4 rounded-2xl flex-row items-center justify-between border-[1px] border-gray-200">
            <View className="flex-row items-center">
              <LockClosedIcon size={20} color="#6b7280" />
              <Text className="text-base font-medium text-gray-900 ml-3">
                Khóa ứng dụng
              </Text>
            </View>
            <Switch
              trackColor={{ false: "#d1d5db", true: "#111827" }}
              thumbColor={"#f4f3f4"}
              ios_backgroundColor="#d1d5db"
              onValueChange={() => setIsAppLocked(!isAppLocked)}
              value={isAppLocked}
            />
          </View>
        </View>

        {/* Section 3: ĐĂNG NHẬP */}
        <View className="mb-6">
          <Text className="text-[11px] font-bold text-gray-400 tracking-wider mb-4 px-1">
            ĐĂNG NHẬP
          </Text>

          <View className="bg-white rounded-2xl border-[1px] border-gray-200 overflow-hidden">
            <MenuItem
              icon={<ComputerDesktopIcon size={20} color="#6b7280" />}
              title="Quản lý thiết bị"
              showBorder
            />
            <MenuItem
              icon={<KeyIcon size={20} color="#6b7280" />}
              title="Mật khẩu"
            />
          </View>
        </View>

        {/* Nút Xóa tài khoản */}
        <TouchableOpacity className="bg-red-50 py-4 rounded-2xl flex-row justify-center items-center mt-4">
          <TrashIcon size={18} color="#dc2626" />
          <Text className="text-red-600 font-bold text-base ml-2">
            Xóa tài khoản
          </Text>
        </TouchableOpacity>

        {/* Cảnh báo xóa tài khoản */}
        <Text className="text-xs text-gray-400 text-center mt-4 mb-10 px-6 leading-5">
          Hành động này không thể hoàn tác. Mọi dữ liệu liên quan đến tài khoản
          này sẽ bị xóa vĩnh viễn khỏi hệ thống.
        </Text>

        <View className="h-32" />
      </ScrollView>
    </View>
  );
}

// Component phụ cho Input Form
function InputField({
  label,
  value,
  onChangeText,
  editable = true,
  keyboardType = "default",
  onPress,
}: {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  editable?: boolean;
  keyboardType?: any;
  onPress?: () => void;
}) {
  return (
    <View className="mb-4">
      <Text className="text-[10px] font-bold text-gray-400 tracking-wider mb-2 px-2">
        {label}
      </Text>
      <TouchableOpacity activeOpacity={onPress ? 0.7 : 1} onPress={onPress}>
        <View
          className={`bg-white px-4 py-4 rounded-2xl border-[1px] border-gray-200 ${!editable && !onPress ? "opacity-50" : ""}`}
        >
          <TextInput
            value={value}
            onChangeText={onChangeText}
            editable={editable && !onPress}
            pointerEvents={onPress ? "none" : "auto"}
            keyboardType={keyboardType}
            className="text-base text-gray-900 font-medium"
          />
        </View>
      </TouchableOpacity>
    </View>
  );
}

// Component phụ cho Menu Item có mũi tên
function MenuItem({
  icon,
  title,
  showBorder = false,
}: {
  icon: any;
  title: string;
  showBorder?: boolean;
}) {
  return (
    <TouchableOpacity
      className={`flex-row items-center justify-between p-4 bg-white ${showBorder ? "border-b border-gray-100" : ""}`}
    >
      <View className="flex-row items-center">
        {icon}
        <Text className="text-base font-medium text-gray-900 ml-3">
          {title}
        </Text>
      </View>
      <ChevronRightIcon size={16} color="#d1d5db" />
    </TouchableOpacity>
  );
}
