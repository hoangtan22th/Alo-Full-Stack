import React, { useState } from "react";
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
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, AntDesign, FontAwesome } from "@expo/vector-icons";
import api from "../services/api";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ email và mật khẩu");
      return;
    }
    setLoading(true);
    try {
      const res: any = await api.post("/auth/login", {
        email,
        password,
        deviceId: "Mobile_App",
      });
      await AsyncStorage.setItem("accessToken", res.accessToken);
      router.replace("/(tabs)");
    } catch (error: any) {
      const msg =
        error.response?.data?.message || "Sai tài khoản hoặc mật khẩu";
      Alert.alert("Lỗi Đăng Nhập", msg);
    } finally {
      setLoading(false);
    }
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
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
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

          <TouchableOpacity style={styles.forgotPass}>
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
          <View style={styles.line} />
        </View>

        <TouchableOpacity style={styles.googleButton}>
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
