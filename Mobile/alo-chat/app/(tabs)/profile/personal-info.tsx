import { useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ArrowLeftIcon, CheckIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "../../../services/api";
import { useAuth } from "../../../contexts/AuthContext";

export default function PersonalInfoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
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
    }, [user]),
  );

  const fetchProfile = async () => {
    try {
      if (!user) return;
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
      console.log("Lỗi gán profile context:", err);
      Alert.alert("Lỗi", "Không thể lấy thông tin tài khoản.");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshUser();
    setRefreshing(false);
  }, []);

  const handleUpdateProfile = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^0[35789]\d{8}$/;

    if (!accountInfo.fullName.trim()) {
      Alert.alert("Lỗi", "Họ và tên không được để trống");
      return;
    }
    if (
      accountInfo.fullName.trim().length < 1 ||
      accountInfo.fullName.trim().length > 50
    ) {
      Alert.alert("Lỗi", "Họ và tên nên từ 1 đến 50 ký tự");
      return;
    }
    if (!accountInfo.phoneNumber) {
      Alert.alert("Lỗi", "Số điện thoại không được để trống");
      return;
    }
    if (!phoneRegex.test(accountInfo.phoneNumber)) {
      Alert.alert("Lỗi", "Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)");
      return;
    }
    if (accountInfo.email && !emailRegex.test(accountInfo.email)) {
      Alert.alert("Lỗi", "Email không đúng định dạng");
      return;
    }

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
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const updateDateOfBirthString = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    setAccountInfo({ ...accountInfo, dateOfBirth: `${yyyy}-${mm}-${dd}` });
  };

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
    const parts = dateString.split("-");
    if (parts.length === 3) {
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
            Thông tin cá nhân
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
        <View className="mt-6 mb-6">
          <Text className="text-[11px] font-bold text-gray-400 tracking-wider mb-4 px-1">
            THÔNG TIN TÀI KHOẢN
          </Text>

          <InputField
            label="HỌ VÀ TÊN"
            value={accountInfo.fullName}
            onChangeText={(text: string) =>
              setAccountInfo({ ...accountInfo, fullName: text })
            }
          />
          <InputField
            label="NGÀY SINH"
            value={formatDateForDisplay(accountInfo.dateOfBirth)}
            onPress={() => {
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
            onChangeText={(text: string) =>
              setAccountInfo({ ...accountInfo, phoneNumber: text })
            }
          />
          <InputField
            label="EMAIL"
            value={accountInfo.email}
            keyboardType="email-address"
            onChangeText={(text: string) =>
              setAccountInfo({ ...accountInfo, email: text })
            }
          />
        </View>

        {/* Modal Date Picker iOS */}
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
                <View className="flex flex-col items-center justify-center pt-2">
                  <DateTimePicker
                    testID="dateTimePicker"
                    value={tempDate}
                    mode="date"
                    display="spinner"
                    onChange={onChangeDate}
                    maximumDate={new Date()}
                    textColor="#000"
                  />
                </View>
              </View>
            </TouchableOpacity>
          </Modal>
        ) : (
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

        {/* Modal Gender Picker */}
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

        <View className="h-32" />
      </ScrollView>
    </View>
  );
}

// Component phụ Input Form
interface InputFieldProps {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  editable?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  onPress?: () => void;
}

function InputField({
  label,
  value,
  onChangeText,
  editable = true,
  keyboardType = "default",
  onPress,
}: InputFieldProps) {
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
