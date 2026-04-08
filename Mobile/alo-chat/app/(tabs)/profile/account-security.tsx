import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  ComputerDesktopIcon,
  KeyIcon,
  LockClosedIcon,
  TrashIcon,
} from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "../../../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";

export default function AccountSecurityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [isAppLocked, setIsAppLocked] = useState(false);

  useEffect(() => {
    const fetchLockSetting = async () => {
      const locked = await AsyncStorage.getItem("appLocked");
      setIsAppLocked(locked === "true");
    };
    fetchLockSetting();
  }, []);

  const handleToggleAppLock = async (value: boolean) => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      Alert.alert("Lỗi", "Thiết bị không hỗ trợ hoặc chưa cài đặt vân tay/khuôn mặt.");
      return;
    }

    const { success } = await LocalAuthentication.authenticateAsync({
      promptMessage: value ? "Bật Khóa Ứng Dụng" : "Tắt Khóa Ứng Dụng",
      fallbackLabel: "Dùng mật khẩu",
    });

    if (success) {
      setIsAppLocked(value);
      await AsyncStorage.setItem("appLocked", value ? "true" : "false");
      Alert.alert("Thành công", value ? "Đã bật khóa ứng dụng." : "Đã tắt khóa ứng dụng.");
    }
  };

  // States Đổi Mật Khẩu
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [changingPass, setChangingPass] = useState(false);

  // States Quản Lý Thiết Bị
  const [showDevicesModal, setShowDevicesModal] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const fetchActiveSessions = async () => {
    try {
      setLoadingSessions(true);
      const res: any = await api.get("/auth/sessions");
      setSessions(res);
    } catch (err) {
      console.log("Lỗi tải danh sách thiết bị", err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleRevokeSession = (sessionId: string) => {
    Alert.alert("Xác nhận", "Bạn có chắc muốn đăng xuất thiết bị này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: async () => {
          // Đảm bảo không cho tự kick trên giao diện
          const session = sessions.find(s => s.id === sessionId);
          if (session?.isCurrent) return;

          try {
            await api.delete(`/auth/sessions/${sessionId}`);
            setSessions((prev) => prev.filter((s) => s.id !== sessionId));
            Alert.alert("Thành công", "Đã buộc thiết bị đăng xuất");
          } catch (err) {
            Alert.alert("Lỗi", "Không thể đăng xuất. Vui lòng thử lại");
          }
        },
      },
    ]);
  };

  const handleRevokeOtherSessions = () => {
    Alert.alert("Đăng xuất tất cả", "Bạn có chắc chắn muốn đăng xuất TẤT CẢ các thiết bị khác trừ thiết bị này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xác nhận",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/auth/sessions/others`);
            const currentSession = sessions.find(s => s.isCurrent);
            setSessions(currentSession ? [currentSession] : []);
            Alert.alert("Thành công", "Đã đăng xuất tất cả các thiết bị khác");
          } catch (err) {
            Alert.alert("Lỗi", "Không thể thực hiện đăng xuất tất cả. Vui lòng thử lại");
          }
        }
      }
    ]);
  };

  const handleChangePassword = async () => {
    if (
      !passwordForm.oldPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmNewPassword
    ) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      Alert.alert("Lỗi", "Mật khẩu xác nhận không khớp");
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(passwordForm.newPassword)) {
      Alert.alert(
        "Lỗi mật khẩu",
        "Mật khẩu phải dài ít nhất 8 ký tự, bao gồm ít nhất một chữ Hoa, một chữ Thường và một chữ Số.",
      );
      return;
    }
    try {
      setChangingPass(true);
      await api.post("/auth/change-password", {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      });
      Alert.alert(
        "Thành công",
        "Đổi mật khẩu thành công. Thông báo đã được gửi về email của bạn.",
      );
      setShowChangePasswordModal(false);
      setPasswordForm({
        oldPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
    } catch (err: any) {
      const msg = err.response?.data?.message || "Đổi mật khẩu thất bại";
      Alert.alert("Lỗi", msg);
    } finally {
      setChangingPass(false);
    }
  };

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
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 px-4 bg-[#fafafa]"
      >
        {/* Modal Quản Lý Thiết Bị */}
        <Modal
          visible={showDevicesModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDevicesModal(false)}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View className="flex-1 justify-end bg-black/50">
              <View className="bg-white rounded-t-3xl  pb-20 h-3/4">
              <View className="flex-row justify-between items-center p-6 border-b border-gray-100 pb-4">
                <Text className="text-xl font-bold text-gray-900">
                  Tính năng Quản lý thiết bị
                </Text>
                <TouchableOpacity
                  onPress={() => setShowDevicesModal(false)}
                  className="p-2"
                >
                  <Text className="text-red-500 font-bold">Thoát</Text>
                </TouchableOpacity>
              </View>

              {loadingSessions ? (
                <View className="flex-1 justify-center items-center">
                  <ActivityIndicator size="large" color="#000" />
                  <Text className="mt-4 text-gray-500 font-bold">Đang tải danh sách thiết bị...</Text>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {sessions.map((item, index) => {
                    const loginDate = new Date(item.createdAt).toLocaleString("vi-VN");
                    return (
                      <View key={index} className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-200 flex-row items-center justify-between">
                        <View className="flex-1">
                          <Text className="font-bold text-base text-gray-900 mb-1">
                            {item.deviceId}
                            {item.isCurrent && (
                              <Text className="text-blue-600 font-bold text-xs ml-2"> (Thiết bị này)</Text>
                            )}
                          </Text>
                          <Text className="text-xs text-gray-500 mb-1">Thời gian: {loginDate}</Text>
                          <Text className="text-xs text-gray-400">IP: {item.ipAddress}</Text>
                        </View>
                        {!item.isCurrent && (
                          <TouchableOpacity
                            onPress={() => handleRevokeSession(item.id)}
                            className="bg-red-50 p-3 rounded-full ml-2"
                          >
                            <TrashIcon size={20} color="#dc2626" />
                          </TouchableOpacity>
                        )}
                      </View>
                    )
                  })}
                  {sessions.length === 0 && (
                    <Text className="text-center text-gray-500 mt-10">Không tìm thấy phiên đăng nhập nào.</Text>
                  )}

                  {sessions.length > 1 && (
                    <TouchableOpacity
                      onPress={handleRevokeOtherSessions}
                      className="bg-red-500 py-3 rounded-full mt-4 flex-row justify-center items-center"
                    >
                      <Text className="text-white font-bold text-base">Đăng xuất tất cả thiết bị khác</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal Đổi mật khẩu */}
      <Modal
        visible={showChangePasswordModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowChangePasswordModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1 justify-end bg-black/50">
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <View className="bg-white rounded-t-3xl p-6 pb-20">
                <View className="flex-row justify-between items-center mb-6 border-b border-gray-100 pb-4">
                  <Text className="text-xl font-bold text-gray-900">
                    Đổi mật khẩu
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowChangePasswordModal(false)}
                    className="p-2"
                  >
                    <Text className="text-red-500 font-bold">Thoát</Text>
                  </TouchableOpacity>
                </View>

                <Text className="text-xs font-bold text-gray-500 mb-2 tracking-wider">
                  MẬT KHẨU HIỆN TẠI
                </Text>
                <View className="bg-gray-100 rounded-2xl px-4 py-4 mb-5 border-[1px] border-gray-200">
                  <TextInput
                    secureTextEntry
                    value={passwordForm.oldPassword}
                    onChangeText={(val) => setPasswordForm({ ...passwordForm, oldPassword: val })}
                    className="text-base text-gray-900"
                    placeholder="••••••••"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <Text className="text-xs font-bold text-gray-500 mb-2 tracking-wider">
                  MẬT KHẨU MỚI
                </Text>
                <View className="bg-gray-100 rounded-2xl px-4 py-4 mb-5 border-[1px] border-gray-200">
                  <TextInput
                    secureTextEntry
                    value={passwordForm.newPassword}
                    onChangeText={(val) => setPasswordForm({ ...passwordForm, newPassword: val })}
                    className="text-base text-gray-900"
                    placeholder="••••••••"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <Text className="text-xs font-bold text-gray-500 mb-2 tracking-wider">XÁC NHẬN MẬT KHẨU MỚI</Text>
                <View className={`bg-gray-100 rounded-2xl px-4 py-4 mb-8 border-[1px] ${passwordForm.confirmNewPassword && passwordForm.newPassword !== passwordForm.confirmNewPassword ? 'border-red-400' : 'border-gray-200'}`}>
                  <TextInput
                    secureTextEntry
                    value={passwordForm.confirmNewPassword}
                    onChangeText={(val) => setPasswordForm({ ...passwordForm, confirmNewPassword: val })}
                    className="text-base text-gray-900"
                    placeholder="••••••••"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
                {passwordForm.confirmNewPassword !== "" &&
                  passwordForm.newPassword !==
                  passwordForm.confirmNewPassword && (
                    <Text className="text-red-500 text-xs font-medium -mt-6 mb-6 px-2">
                      Mật khẩu xác nhận không khớp
                    </Text>
                  )}

                <TouchableOpacity
                  disabled={changingPass}
                  onPress={handleChangePassword}
                  className="bg-gray-900 py-4 rounded-full items-center justify-center flex-row shadow-sm"
                >
                  {changingPass ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white font-bold text-base">
                      Xác nhận Đổi Mật Khẩu
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Section 2: BẢO MẬT */}
      <View className="mt-6 mb-6">
        <Text className="text-[11px] font-bold text-gray-400 tracking-wider mb-4 px-1">
          MỞ KHÓA BẰNG VÂN TAY/FACE ID
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
            onValueChange={handleToggleAppLock}
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
            onPress={() => {
              setShowDevicesModal(true);
              fetchActiveSessions();
            }}
          />
          <MenuItem
            icon={<KeyIcon size={20} color="#6b7280" />}
            title="Mật khẩu"
            onPress={() => setShowChangePasswordModal(true)}
          />
        </View>
      </View>

      {/* Nút Xóa tài khoản */}
      {/* <TouchableOpacity className="bg-red-50 py-4 rounded-2xl flex-row justify-center items-center mt-4">
          <TrashIcon size={18} color="#dc2626" />
          <Text className="text-red-600 font-bold text-base ml-2">
            Xóa tài khoản
          </Text>
        </TouchableOpacity> */}

      {/* Cảnh báo xóa tài khoản */}
      {/* <Text className="text-xs text-gray-400 text-center mt-4 mb-10 px-6 leading-5">
          Hành động này không thể hoàn tác. Mọi dữ liệu liên quan đến tài khoản
          này sẽ bị xóa vĩnh viễn khỏi hệ thống.
        </Text> */}

      <View className="h-32" />
    </ScrollView>
    </View >
  );
}

// Component phụ cho Menu Item có mũi tên
function MenuItem({ icon, title, showBorder = false, onPress }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
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
