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
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    // 1. Kiểm tra dữ liệu đầu vào cơ bản
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
      // 2. Gọi API Register qua Gateway
      await api.post("/auth/register", {
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        phoneNumber: form.phoneNumber,
      });

      Alert.alert("Thành công", "Tài khoản đã được tạo!", [
        { text: "Đăng nhập ngay", onPress: () => router.replace("/login") },
      ]);
    } catch (error: any) {
      console.log("Lỗi Register:", error.response?.data);
      const errorMsg = error.response?.data?.message || "Đăng ký thất bại";
      Alert.alert("Lỗi", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Nút Back */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Logo tròn đen */}
        <View style={styles.logoContainer}>
          <View style={styles.blackCircle}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={30}
              color="#fff"
            />
          </View>
        </View>

        <Text style={styles.title}>Tạo tài khoản mới</Text>
        <Text style={styles.subtitle}>Tham gia cộng đồng chat tối giản.</Text>

        <View style={styles.formContainer}>
          {/* HỌ VÀ TÊN */}
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

          {/* SỐ ĐIỆN THOẠI */}
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

          {/* EMAIL */}
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

          {/* MẬT KHẨU */}
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

          {/* XÁC NHẬN MẬT KHẨU */}
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
        </View>

        {/* Nút Đăng ký */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.buttonText}>Đăng ký ngay</Text>
              <AntDesign
                name="arrow-right"
                size={20}
                color="#fff"
                style={{ marginLeft: 10 }}
              />
            </>
          )}
        </TouchableOpacity>

        {/* Link Đăng nhập */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Đã có tài khoản? </Text>
          <TouchableOpacity onPress={() => router.replace("/login")}>
            <Text style={styles.link}>Đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
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
    alignItems: "center", // Căn giữa logo như ảnh
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
