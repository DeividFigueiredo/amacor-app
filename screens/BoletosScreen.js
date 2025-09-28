import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function BoletosScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Boletos</Text>
      <Text>Aqui você vai listar os boletos do usuário 🚀</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },
});