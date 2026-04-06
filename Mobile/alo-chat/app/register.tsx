import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import api from "../services/api";

export default function RegisterScreen() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
  });
  const router = useRouter();

  const handleRegister = async () => {
    // Kiểm tra nhanh trước khi gửi
    if (!form.email || !form.password || !form.fullName) {
      Alert.alert("Thông báo", "Vui lòng nhập đầy đủ thông tin");
      return;
    }

    try {
      // Gọi API Register từ Backend
      const response = await api.post("/auth/register", form);

      Alert.alert("Thành công", "Tài khoản đã được tạo!", [
        { text: "Đăng nhập ngay", onPress: () => router.replace("/login") },
      ]);
    } catch (error: any) {
      console.log("Lỗi Register:", error.response?.data);
      const errorMsg =
        error.response?.data?.message || "Đăng ký thất bại, vui lòng thử lại";
      Alert.alert("Lỗi", errorMsg);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Tạo tài khoản Alo</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Họ và tên</Text>
        <TextInput
          placeholder="Nhập họ tên của bạn"
          style={styles.input}
          onChangeText={(val) => setForm({ ...form, fullName: val })}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          placeholder="example@gmail.com"
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={(val) => setForm({ ...form, email: val })}
        />

        <Text style={styles.label}>Mật khẩu</Text>
        <TextInput
          placeholder="Nhập mật khẩu"
          style={styles.input}
          secureTextEntry
          onChangeText={(val) => setForm({ ...form, password: val })}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Đăng ký</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.linkContainer}
      >
        <Text style={styles.link}>
          Đã có tài khoản? <Text style={{ fontWeight: "bold" }}>Đăng nhập</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 25,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 40,
    textAlign: "center",
    color: "#0084ff",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
    marginLeft: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 10,
    backgroundColor: "#f9f9f9",
    marginBottom: 20,
    padding: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#0084ff",
    padding: 18,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 10,
    elevation: 2,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  linkContainer: {
    marginTop: 25,
    alignItems: "center",
  },
  link: {
    color: "#0084ff",
    fontSize: 15,
  },
});
