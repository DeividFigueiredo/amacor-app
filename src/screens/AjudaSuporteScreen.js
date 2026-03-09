import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function AjudaSuporteScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Ajuda e Suporte</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Canais de atendimento</Text>
        <Text style={styles.paragraph}>
          Em caso de dúvidas, entre em contato pelo nosso suporte. Horário de
          atendimento comercial.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dúvidas frequentes</Text>
        <Text style={styles.paragraph}>
          • Como acessar minha carteirinha
        </Text>
        <Text style={styles.paragraph}>
          • Como solicitar autorização
        </Text>
        <Text style={styles.paragraph}>
          • Como acompanhar autorizações
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Suporte técnico</Text>
        <Text style={styles.paragraph}>
          Se algo não estiver funcionando, informe o que aconteceu e, se
          possível, anexe prints da tela.
        </Text>
        <Text style={styles.paragraph}>
          E-mail: amacor.dev@amacor.com.br
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 20,
  },
});
