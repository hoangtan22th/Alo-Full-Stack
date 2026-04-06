import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../services/api";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    try {
      const res = await api.post("/auth/login", {
        email,
        password,
        deviceId: "Mobile_App",
      });
      await AsyncStorage.setItem("accessToken", res.data.accessToken);
      router.replace("/(tabs)");
    } catch (error: any) {
      const msg =
        error.response?.data?.message || "Sai tài khoản hoặc mật khẩu";
      Alert.alert("Lỗi Đăng Nhập", msg);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đăng nhập Alo</Text>
      <TextInput
        placeholder="Email"
        style={styles.input}
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        placeholder="Mật khẩu"
        style={styles.input}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Đăng nhập</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push("/register")}>
        <Text style={styles.link}>Chưa có tài khoản? Đăng ký ngay</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 25,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
    color: "#0084ff",
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    marginBottom: 20,
    padding: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#0084ff",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  link: { color: "#0084ff", textAlign: "center", marginTop: 20 },
});
