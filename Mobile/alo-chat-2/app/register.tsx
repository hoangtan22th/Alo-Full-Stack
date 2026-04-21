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
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1); // Bước 1: Điền thông tin | Bước 2: Nhập OTP
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Regex tĩnh
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // Bắt đầu bằng 0, có 10 chữ số, các đầu số mạng phổ biến VN ^0[0-9]{9}$
  const phoneRegex = /^0[35789]\d{8}$/;
  // Format password: Ít nhất 8 ký tự, có xét chữ Hoa, chữ Thường và Số
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  const handleTextChange = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
    let errorMsg = "";

    if (value.trim() === "") {
      errorMsg = "Không được để trống";
    } else {
      if (field === "email" && !emailRegex.test(value)) {
        errorMsg = "Email không đúng định dạng";
      } else if (field === "phoneNumber" && !phoneRegex.test(value)) {
        errorMsg = "Số điện thoại không đúng định dạng (10 số, bắt đầu bằng 0)";
      } else if (field === "password" && !passwordRegex.test(value)) {
        errorMsg = "Mật khẩu phải >= 8 ký tự, gồm chữ Hoa, chữ Thường và Số";
      } else if (field === "confirmPassword" && value !== form.password) {
        errorMsg = "Mật khẩu xác nhận không khớp";
      }
    }

    setErrors((prev) => {
      const newErrors = { ...prev, [field]: errorMsg };
      // Kéo theo validate lại confirmPassword khi pw thay đổi
      if (field === "password" && form.confirmPassword) {
        newErrors.confirmPassword = value !== form.confirmPassword ? "Mật khẩu xác nhận không khớp" : "";
      }
      return newErrors;
    });
  };

  // Hàm gọi API Gửi OTP
  const handleSendOtp = async () => {
    if (!form.fullName || !form.email || !form.phoneNumber || !form.password) {
      Alert.alert("Thông báo", "Vui lòng nhập đầy đủ thông tin");
      return;
    }

    if (!emailRegex.test(form.email)) {
      Alert.alert("Lỗi", "Vui lòng nhập đúng định dạng Email");
      return;
    }

    if (!phoneRegex.test(form.phoneNumber)) {
      Alert.alert("Lỗi", "Số điện thoại không đúng hợp lệ (10 số, bắt đầu bằng 0)");
      return;
    }

    if (!passwordRegex.test(form.password)) {
      Alert.alert(
        "Lỗi mật khẩu",
        "Mật khẩu phải dài ít nhất 8 ký tự, bao gồm ít nhất một chữ Hoa, một chữ Thường và một chữ Số."
      );
      return;
    }

    if (form.password !== form.confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu xác nhận không khớp");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/send-otp", {
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim()
      });
      Alert.alert("Thành công", "Mã OTP 6 số đã được gửi tới email của bạn!");
      setStep(2); // Chuyển sang màn hình nhập OTP
    } catch (error: any) {
      if (!error.response) {
        Alert.alert("Lỗi Kết Nối", "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại mạng hoặc địa chỉ IP.");
      } else {
        const payloadData = error.response?.data?.data;
        let detailedError = "";
        if (payloadData && typeof payloadData === "object") {
          // Lấy lỗi đầu tiên từ object validation errors
          detailedError = Object.values(payloadData)[0] as string;
        }

        const errorMsg = detailedError || error.response?.data?.message || "Không thể gửi OTP. Vui lòng thử lại.";
        Alert.alert("Lỗi", errorMsg);
      }
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
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim(),
        password: form.password,
        otp: otp.trim(),
      });

      Alert.alert("Thành công", "Chào mừng! Tài khoản đã được tạo thành công.", [
        { text: "Đăng nhập ngay", onPress: () => router.replace("/login") },
      ]);
    } catch (error: any) {
      if (!error.response) {
        Alert.alert("Lỗi Kết Nối", "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại mạng hoặc địa chỉ IP.");
      } else {
        const payloadData = error.response?.data?.data;
        let detailedError = "";
        if (payloadData && typeof payloadData === "object") {
          // Lấy lỗi đầu tiên từ object validation errors
          detailedError = Object.values(payloadData)[0] as string;
        }

        const errorMsg = detailedError || error.response?.data?.message || "Đăng ký thất bại. Kiểm tra lại thông tin.";
        Alert.alert("Lỗi", errorMsg);
      }
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
                <View style={[styles.inputWrapper, errors.fullName ? styles.inputError : null]}>
                  <TextInput
                    placeholder="Nguyễn Văn A"
                    style={styles.input}
                    value={form.fullName}
                    onChangeText={(val) => handleTextChange("fullName", val)}
                    placeholderTextColor="#aaa"
                  />
                </View>
                {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}

                <Text style={styles.inputLabel}>EMAIL</Text>
                <View style={[styles.inputWrapper, errors.email ? styles.inputError : null]}>
                  <TextInput
                    placeholder="example@email.com"
                    style={styles.input}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={form.email}
                    onChangeText={(val) => handleTextChange("email", val)}
                    placeholderTextColor="#aaa"
                  />
                </View>
                {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

                <Text style={styles.inputLabel}>SỐ ĐIỆN THOẠI</Text>
                <View style={[styles.inputWrapper, errors.phoneNumber ? styles.inputError : null]}>
                  <TextInput
                    placeholder="0912345678"
                    style={styles.input}
                    keyboardType="number-pad"
                    value={form.phoneNumber}
                    onChangeText={(val) => handleTextChange("phoneNumber", val)}
                    placeholderTextColor="#aaa"
                    maxLength={10}
                  />
                </View>
                {errors.phoneNumber ? <Text style={styles.errorText}>{errors.phoneNumber}</Text> : null}

                <Text style={styles.inputLabel}>MẬT KHẨU</Text>
                <View style={[styles.inputWrapper, errors.password ? styles.inputError : null]}>
                  <TextInput
                    placeholder="........"
                    style={[styles.input, { flex: 1 }]}
                    secureTextEntry={!showPassword}
                    value={form.password}
                    onChangeText={(val) => handleTextChange("password", val)}
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
                {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

                <Text style={styles.inputLabel}>XÁC NHẬN MẬT KHẨU</Text>
                <View style={[styles.inputWrapper, errors.confirmPassword ? styles.inputError : null]}>
                  <TextInput
                    placeholder="........"
                    style={styles.input}
                    secureTextEntry={!showPassword}
                    value={form.confirmPassword}
                    onChangeText={(val) => handleTextChange("confirmPassword", val)}
                    placeholderTextColor="#aaa"
                  />
                </View>
                {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
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
    marginBottom: 5,
    height: 55,
  },
  inputError: {
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    marginLeft: 15,
    marginBottom: 15,
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
