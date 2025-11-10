import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WebView from 'react-native-webview';

export default function BrowserScreen({ navigation, route }) {
  const { url, title } = route.params;
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(url);
  const [loading, setLoading] = useState(true);

  const onNavigationStateChange = (navState) => {
    setCanGoBack(navState.canGoBack);
    setCanGoForward(navState.canGoForward);
    setCurrentUrl(navState.url);
    setLoading(navState.loading);
  };

  const goBack = () => {
    if (canGoBack) {
      webViewRef.current?.goBack();
    } else {
      navigation.goBack();
    }
  };

  const goForward = () => {
    webViewRef.current?.goForward();
  };

  const reload = () => {
    webViewRef.current?.reload();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#2E76B8" barStyle="light-content" />
      
      

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: currentUrl }}
        style={styles.webview}
        onNavigationStateChange={onNavigationStateChange}
        startInLoadingState={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsBackForwardNavigationGestures={true}
        sharedCookiesEnabled={true}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
      />

      {/* Footer Navigation */}
      <View style={styles.footer}>
        <TouchableOpacity 
          onPress={goBack} 
          style={[styles.footerButton, !canGoBack && styles.disabledButton]}
          disabled={!canGoBack}
        >
          <Ionicons name="arrow-back" size={20} color={canGoBack ? "#2E76B8" : "#95a5a6"} />
          <Text style={[styles.footerText, !canGoBack && styles.disabledText]}>Voltar</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={goForward} 
          style={[styles.footerButton, !canGoForward && styles.disabledButton]}
          disabled={!canGoForward}
        >
          <Ionicons name="arrow-forward" size={20} color={canGoForward ? "#2E76B8" : "#95a5a6"} />
          <Text style={[styles.footerText, !canGoForward && styles.disabledText]}>Avançar</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={reload} style={styles.footerButton}>
          <Ionicons name="refresh" size={20} color="#2E76B8" />
          <Text style={styles.footerText}>Recarregar</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.footerButton}>
          <Ionicons name="close" size={20} color="#e74c3c" />
          <Text style={[styles.footerText, { color: '#e74c3c' }]}>Fechar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2E76B8',
  },
  headerButton: {
    padding: 8,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  webview: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    backgroundColor: '#f8f9fa',
  },
  footerButton: {
    alignItems: 'center',
    padding: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  footerText: {
    fontSize: 12,
    color: '#2E76B8',
    marginTop: 4,
  },
  disabledText: {
    color: '#95a5a6',
  },
});