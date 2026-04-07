import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, AntDesign } from "@expo/vector-icons";
import api from "../services/api";

export default function RegisterScreen() {
  const [form, setForm] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1); // Bước 1: Điền thông tin | Bước 2: Nhập OTP
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Hàm gọi API Gửi OTP
  const handleSendOtp = async () => {
    if (!form.fullName || !form.email || !form.password || !form.phoneNumber) {
      Alert.alert("Thông báo", "Vui lòng nhập đầy đủ thông tin");
      return;
    }

    if (form.password !== form.confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu xác nhận không khớp");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/send-otp", { email: form.email });
      Alert.alert("Thành công", "Mã OTP 6 số đã được gửi tới email của bạn!");
      setStep(2); // Chuyển sang màn hình nhập OTP
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Không thể gửi OTP. Vui lòng thử lại.";
      Alert.alert("Lỗi", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Hàm gọi API Đăng ký chính thức
  const handleRegister = async () => {
    if (!otp) {
      Alert.alert("Thông báo", "Vui lòng nhập mã OTP");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/register", {
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        phoneNumber: form.phoneNumber,
        otp: otp,
      });

      Alert.alert("Thành công", "Chào mừng! Tài khoản đã được tạo thành công.", [
        { text: "Đăng nhập ngay", onPress: () => router.replace("/login") },
      ]);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Đăng ký thất bại. Kiểm tra lại OTP.";
      Alert.alert("Lỗi", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#fff" }}
    >
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Nút Back */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (step === 2) setStep(1); // Nếu đang ở bước OTP, back thì quay lại sửa form
            else router.back();
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.blackCircle}>
              <Ionicons name="chatbubble-ellipses-outline" size={30} color="#fff" />
            </View>
          </View>

          <Text style={styles.title}>
            {step === 1 ? "Tạo tài khoản mới" : "Xác thực Email"}
          </Text>
          <Text style={styles.subtitle}>
            {step === 1
              ? "Tham gia cộng đồng chat tối giản."
              : `Mã 6 số đã được gửi đến ${form.email}`}
          </Text>

          <View style={styles.formContainer}>
            {step === 1 ? (
              <>
                {/* Form Bước 1 */}
                <Text style={styles.inputLabel}>HỌ VÀ TÊN</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    placeholder="Nguyễn Văn A"
                    style={styles.input}
                    value={form.fullName}
                    onChangeText={(val) => setForm({ ...form, fullName: val })}
                    placeholderTextColor="#aaa"
                  />
                </View>

                <Text style={styles.inputLabel}>SỐ ĐIỆN THOẠI</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    placeholder="090 123 4567"
                    style={styles.input}
                    keyboardType="phone-pad"
                    value={form.phoneNumber}
                    onChangeText={(val) => setForm({ ...form, phoneNumber: val })}
                    placeholderTextColor="#aaa"
                  />
                </View>

                <Text style={styles.inputLabel}>EMAIL</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    placeholder="example@email.com"
                    style={styles.input}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={form.email}
                    onChangeText={(val) => setForm({ ...form, email: val })}
                    placeholderTextColor="#aaa"
                  />
                </View>

                <Text style={styles.inputLabel}>MẬT KHẨU</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    placeholder="........"
                    style={[styles.input, { flex: 1 }]}
                    secureTextEntry={!showPassword}
                    value={form.password}
                    onChangeText={(val) => setForm({ ...form, password: val })}
                    placeholderTextColor="#aaa"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color="#888"
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>XÁC NHẬN MẬT KHẨU</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    placeholder="........"
                    style={styles.input}
                    secureTextEntry={!showPassword}
                    value={form.confirmPassword}
                    onChangeText={(val) => setForm({ ...form, confirmPassword: val })}
                    placeholderTextColor="#aaa"
                  />
                </View>
              </>
            ) : (
              <>
                {/* Vùng nhập OTP Bước 2 */}
                <Text style={styles.inputLabel}>MÃ XÁC THỰC OTP (6 SỐ)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    placeholder="Ví dụ: 123456"
                    style={[styles.input, { textAlign: 'center', fontSize: 20, letterSpacing: 8 }]}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={setOtp}
                    placeholderTextColor="#aaa"
                  />
                </View>
                <TouchableOpacity onPress={handleSendOtp} style={{ alignItems: 'flex-end', marginTop: 5 }}>
                  <Text style={{ color: "#666", textDecorationLine: "underline" }}>
                    Gửi lại mã OTP
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Nút Xác Nhận Action */}
          <TouchableOpacity
            style={styles.button}
            onPress={step === 1 ? handleSendOtp : handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>
                  {step === 1 ? "Gửi mã xác nhận" : "Hoàn tất đăng ký"}
                </Text>
                <AntDesign name="arrow-right" size={20} color="#fff" style={{ marginLeft: 10 }} />
              </>
            )}
          </TouchableOpacity>

          {/* Link Đăng nhập */}
          {step === 1 && (
            <View style={styles.footer}>
              <Text style={styles.footerText}>Đã có tài khoản? </Text>
              <TouchableOpacity onPress={() => router.replace("/login")}>
                <Text style={styles.link}>Đăng nhập</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 25,
  },
  backButton: {
    marginTop: 50,
    marginLeft: -5,
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  content: {
    flex: 1,
    paddingBottom: 40,
  },
  logoContainer: {
    marginTop: 20,
    marginBottom: 30,
    alignItems: "center",
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
    fontSize: 32,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
  },
  formContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    color: "#444",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 8,
    marginLeft: 15,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f2f2",
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
  button: {
    backgroundColor: "#000",
    padding: 18,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 25,
  },
  footerText: {
    color: "#666",
    fontSize: 15,
  },
  link: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 15,
    textDecorationLine: "underline",
  },
});
