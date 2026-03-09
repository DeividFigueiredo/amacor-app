import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function PrivacidadeSegurancaScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Privacidade e Segurança</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Coleta e uso de dados</Text>
        <Text style={styles.paragraph}>
          Coletamos apenas os dados necessários para autenticação, atendimento e
          funcionamento dos serviços. Os dados são utilizados para melhorar a
          experiência e para cumprir obrigações legais.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Armazenamento e proteção</Text>
        <Text style={styles.paragraph}>
          Utilizamos medidas técnicas e organizacionais para proteger suas
          informações contra acesso não autorizado, perda ou alteração.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Compartilhamento</Text>
        <Text style={styles.paragraph}>
          Seus dados podem ser compartilhados com parceiros essenciais ao
          serviço, sempre de forma segura e limitada ao necessário.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Seus direitos</Text>
        <Text style={styles.paragraph}>
          Você pode solicitar acesso, correção ou exclusão de dados conforme as
          normas aplicáveis. Entre em contato pelo canal de suporte.
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
