import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView, // Thêm ScrollView
  KeyboardAvoidingView, // Thêm để đẩy giao diện khi hiện bàn phím
  Platform,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { Ionicons, AntDesign, FontAwesome } from "@expo/vector-icons";
import * as Device from "expo-device";
import api from "../services/api";
// import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);


  const router = useRouter();
  const { signIn } = useAuth();

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSendForgotOtp = async () => {
    if (!forgotEmail) {
      Alert.alert("Lỗi", "Vui lòng nhập email");
      return;
    }
    setForgotLoading(true);
    try {
      await api.post("/auth/forgot-password/send-otp", { email: forgotEmail });
      Alert.alert("Thành công", "Mã xác thực đã được gửi đến email của bạn");
      setForgotStep(2);
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể gửi OTP");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!forgotOtp || !forgotNewPassword) {
      Alert.alert("Lỗi", "Vui lòng nhập OTP và mật khẩu mới");
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(forgotNewPassword)) {
      Alert.alert(
        "Lỗi mật khẩu",
        "Mật khẩu phải dài ít nhất 8 ký tự, bao gồm ít nhất một chữ Hoa, một chữ Thường và một chữ Số."
      );
      return;
    }

    setForgotLoading(true);
    try {
      await api.post("/auth/forgot-password/reset", {
        email: forgotEmail,
        otp: forgotOtp,
        newPassword: forgotNewPassword,
      });
      Alert.alert(
        "Thành công",
        "Mật khẩu đã được đặt lại thành công. Bạn có thể đăng nhập ngay bây giờ.",
      );
      setShowForgotModal(false);
      setForgotStep(1);
      setForgotEmail("");
      setForgotOtp("");
      setForgotNewPassword("");
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Đặt lại mật khẩu thất bại",
      );
    } finally {
      setForgotLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ email và mật khẩu");
      return;
    }
    setLoading(true);
    try {
      let deviceName = "Unknown Device";
      if (Platform.OS === "web") {
        deviceName = "Trình duyệt Web";
      } else {
        deviceName = `${Device.brand || "Máy"} ${Device.modelName || "Không xác định"} (${Platform.OS})`;
      }

      const res: any = await api.post("/auth/login", {
        email,
        password,
        deviceId: deviceName,
      });
      // signIn() lưu cả 2 token + cập nhật trạng thái -> _layout.tsx tự chuyển vào Tabs
      await signIn(res.accessToken, res.refreshToken);
    } catch (error: any) {
      if (!error.response) {
        Alert.alert("Lỗi Kết Nối", "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại mạng hoặc địa chỉ IP.");
      } else {
        const msg = error.response?.data?.message || "Sai tài khoản hoặc mật khẩu";
        Alert.alert("Lỗi Đăng Nhập", msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    Alert.alert("Thông báo", "Tính năng đang bảo trì để build APK. Vui lòng dùng đăng nhập bằng Email tạm thời!");
    // try {
    //   setLoading(true);
    //   await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    //   const response = await GoogleSignin.signIn();

    //   if (response.type === "cancelled") {
    //     setLoading(false);
    //     return;
    //   }

    //   if (response.type === "success" && response.data) {
    //     const idToken = response.data.idToken;
    //     if (!idToken) {
    //        Alert.alert("Lỗi", "Không nhận được ID token từ Google.");
    //        return;
    //     }

    //     let deviceName = "Unknown Device";
    //     if (Platform.OS === "web") {
    //       deviceName = "Trình duyệt Web";
    //     } else {
    //       deviceName = `${Device.brand || "Máy"} ${Device.modelName || "Không xác định"} (${Platform.OS})`;
    //     }

    //     const res: any = await api.post("/auth/google", {
    //       idToken,
    //       deviceId: deviceName,
    //     });
    //     await signIn(res.accessToken, res.refreshToken);
    //   }
    // } catch (error: any) {
    //   if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
    //     Alert.alert("Lỗi Dịch Vụ", "Điện thoại của bạn không có hoặc cần cập nhật Google Play Services.");
    //   } else {
    //     Alert.alert("Lỗi Đăng Nhập Google", error.message || "Đăng nhập Google thất bại");
    //   }
    // } finally {
    //   setLoading(false);
    // }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Nút Back */}
        <TouchableOpacity
          style={styles.backButton}
          // onPress={() => router.back()}
        >
          {/* <Ionicons name="arrow-back" size={24} color="#333" /> */}
        </TouchableOpacity>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.blackCircle}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={30}
              color="#fff"
            />
          </View>
        </View>

        {/* Tiêu đề */}
        <Text style={styles.title}>Chào mừng{"\n"}trở lại</Text>
        <Text style={styles.subtitle}>
          Tiếp tục cuộc trò chuyện của bạn một{"\n"}cách mượt mà nhất.
        </Text>

        {/* Form */}
        <View style={styles.formContainer}>
          <Text style={styles.inputLabel}>EMAIL HOẶC SỐ ĐIỆN THOẠI</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              placeholder="example@email.com"
              style={styles.input}
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              placeholderTextColor="#aaa"
            />
          </View>

          <Text style={styles.inputLabel}>MẬT KHẨU</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              placeholder="........"
              style={[styles.input, { flex: 1 }]}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              placeholderTextColor="#aaa"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={22}
                color="#888"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.forgotPass}
            onPress={() => setShowForgotModal(true)}
          >
            <Text style={styles.forgotText}>Quên mật khẩu?</Text>
          </TouchableOpacity>
        </View>

        {/* Nút Đăng nhập */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.buttonText}>Đăng nhập</Text>
              <AntDesign
                name="arrow-right"
                size={20}
                color="#fff"
                style={{ marginLeft: 10 }}
              />
            </>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>HOẶC</Text>
          <View className="line" />
        </View>

        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleLogin}
          disabled={loading}
        >
          <FontAwesome
            name="google"
            size={20}
            color="#000"
            style={{ marginRight: 10 }}
          />
          <Text style={styles.googleButtonText}>Tiếp tục với Google</Text>
        </TouchableOpacity>

        {/* Dòng Đăng ký ngay - Đã sửa lỗi bị mất */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bạn chưa có tài khoản? </Text>
          <TouchableOpacity onPress={() => router.push("/register")}>
            <Text style={styles.link}>Đăng ký ngay</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showForgotModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowForgotModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1 justify-end bg-black/50">
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <View className="bg-white rounded-t-3xl p-6 pb-20">
                <View className="flex-row justify-between items-center mb-2 border-b border-gray-100 pb-4">
                  <Text className="text-xl font-bold text-gray-900">
                    Khôi phục mật khẩu
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowForgotModal(false)}
                    className="p-2"
                  >
                    <Text className="text-red-500 font-bold">Thoát</Text>
                  </TouchableOpacity>
                </View>

                {forgotStep === 1 ? (
                  <View>
                    <Text className="text-xs font-bold text-gray-500 mb-2 tracking-wider mt-4">
                      EMAIL ĐĂNG KÝ
                    </Text>
                    <View className="bg-gray-100 rounded-2xl px-4 py-4 mb-6 border-[1px] border-gray-200">
                      <TextInput
                        value={forgotEmail}
                        onChangeText={setForgotEmail}
                        className="text-base text-gray-900"
                        placeholder="example@email.com"
                        autoCapitalize="none"
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                    <TouchableOpacity
                      disabled={forgotLoading}
                      onPress={handleSendForgotOtp}
                      className="bg-gray-900 py-4 rounded-full items-center justify-center flex-row shadow-sm mt-2"
                    >
                      {forgotLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text className="text-white font-bold text-base">
                          Gửi Mã Xác Nhận
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    <Text className="text-xs font-bold text-gray-500 mb-2 tracking-wider mt-4">
                      MÃ OTP (6 SỐ TỪ EMAIL)
                    </Text>
                    <View className="bg-gray-100 rounded-2xl px-4 py-4 mb-4 border-[1px] border-gray-200">
                      <TextInput
                        value={forgotOtp}
                        onChangeText={setForgotOtp}
                        keyboardType="number-pad"
                        className="text-base text-gray-900 tracking-[0.5em] text-center"
                        placeholder="••••••"
                        maxLength={6}
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                    <Text className="text-xs font-bold text-gray-500 mb-2 tracking-wider">
                      MẬT KHẨU MỚI
                    </Text>
                    <View className="bg-gray-100 rounded-2xl px-4 py-4 mb-8 border-[1px] border-gray-200">
                      <TextInput
                        secureTextEntry
                        value={forgotNewPassword}
                        onChangeText={setForgotNewPassword}
                        className="text-base text-gray-900"
                        placeholder="••••••••"
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                    <TouchableOpacity
                      disabled={forgotLoading}
                      onPress={handleResetPassword}
                      className="bg-gray-900 py-4 rounded-full items-center justify-center flex-row shadow-sm"
                    >
                      {forgotLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text className="text-white font-bold text-base">
                          Cập Nhật Mật Khẩu
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    paddingHorizontal: 25,
    paddingBottom: 40, // Đệm dưới cùng để không bị mất chữ
  },
  backButton: {
    marginTop: 50,
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  logoContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  blackCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#000",
    lineHeight: 45,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    marginBottom: 30,
  },
  formContainer: {
    marginBottom: 25,
  },
  inputLabel: {
    color: "#999",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f2f5",
    borderRadius: 25,
    paddingHorizontal: 20,
    marginBottom: 15,
    height: 55,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  forgotPass: {
    alignItems: "flex-end",
  },
  forgotText: {
    color: "#333",
    fontSize: 13,
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#000",
    padding: 18,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 25,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#eee",
  },
  dividerText: {
    color: "#aaa",
    fontSize: 12,
    paddingHorizontal: 10,
  },
  googleButton: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    padding: 16,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  googleButtonText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
    paddingBottom: 20,
  },
  footerText: {
    color: "#666",
    fontSize: 14,
  },
  link: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
