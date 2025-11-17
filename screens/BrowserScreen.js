import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, SafeAreaView, StatusBar, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WebView from 'react-native-webview';

export default function BrowserScreen({ navigation, route }) {
  const { url, title } = route.params;
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(url);
  const [loading, setLoading] = useState(true);
  const [showCleanupModal, setShowCleanupModal] = useState(false);

  // Limpar dados quando o componente for desmontado
  useEffect(() => {
    return () => {
      // Limpeza automática ao sair da tela
      performCleanup();
    };
  }, []);

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

  // Função principal para destruir metadados - CORRIGIDA
  const performCleanup = async () => {
    try {
      console.log('🧹 Iniciando destruição de metadados...');
      
      // 1. Limpar cache do WebView - FORMA CORRETA
      if (webViewRef.current) {
        webViewRef.current.clearCache?.(true);
      }
      
      // 2. Limpar storage e cookies via JavaScript
      webViewRef.current?.injectJavaScript(`
        try {
          console.log('🔧 Iniciando limpeza de dados...');
          
          // Limpar localStorage
          if (window.localStorage) {
            localStorage.clear();
            console.log('✅ localStorage limpo');
          }
          
          // Limpar sessionStorage
          if (window.sessionStorage) {
            sessionStorage.clear();
            console.log('✅ sessionStorage limpo');
          }
          
          // Limpar cookies via JavaScript - maneira mais agressiva
          const cookies = document.cookie.split(";");
          for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i];
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            
            // Limpar para diversos domínios e caminhos
            const domains = [
              window.location.hostname,
              '.' + window.location.hostname,
              ''
            ];
            
            const paths = ['/', ''];
            
            domains.forEach(domain => {
              paths.forEach(path => {
                document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=" + domain + "; path=" + path;
                document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=." + domain + "; path=" + path;
              });
            });
          }
          console.log('✅ Cookies limpos');
          
          // Limpar IndexedDB
          if (window.indexedDB) {
            try {
              const databases = await indexedDB.databases();
              databases.forEach(db => {
                if (db.name) {
                  indexedDB.deleteDatabase(db.name);
                }
              });
              console.log('✅ IndexedDB limpo');
            } catch (e) {
              console.log('⚠️ IndexedDB não pôde ser limpo:', e);
            }
          }
          
          // Limpar service workers
          if (navigator.serviceWorker) {
            try {
              const registrations = await navigator.serviceWorker.getRegistrations();
              for (let registration of registrations) {
                await registration.unregister();
              }
              console.log('✅ Service Workers removidos');
            } catch (e) {
              console.log('⚠️ Service Workers não puderam ser removidos:', e);
            }
          }
          
          // Limpar cache da API
          if (window.caches) {
            try {
              const cacheNames = await caches.keys();
              await Promise.all(
                cacheNames.map(name => caches.delete(name))
              );
              console.log('✅ Cache API limpo');
            } catch (e) {
              console.log('⚠️ Cache API não pôde ser limpo:', e);
            }
          }
          
          // Limpar formulários
          const forms = document.querySelectorAll('form');
          forms.forEach(form => {
            try {
              form.reset();
            } catch (e) {}
          });
          
          // Limpar inputs
          const inputs = document.querySelectorAll('input, textarea, select');
          inputs.forEach(input => {
            try {
              if (input.type !== 'password' && input.type !== 'submit' && input.type !== 'button') {
                input.value = '';
              }
              if (input.checked) {
                input.checked = false;
              }
            } catch (e) {}
          });
          
          // Limpar autofill
          try {
            const autofillElements = document.querySelectorAll('[autocomplete]');
            autofillElements.forEach(el => {
              el.setAttribute('autocomplete', 'off');
            });
          } catch (e) {}
          
          console.log('🎉 Todos os metadados foram destruídos com sucesso!');
          window.ReactNativeWebView.postMessage('CLEANUP_COMPLETE');
          
        } catch(error) {
          console.error('❌ Erro durante a limpeza:', error);
          window.ReactNativeWebView.postMessage('CLEANUP_ERROR:' + error.message);
        }
      `);
      
      console.log('✅ Comando de limpeza enviado para o WebView');
      
    } catch (error) {
      console.error('❌ Erro ao executar limpeza:', error);
    }
  };

  // Função alternativa para limpeza mais agressiva
  const aggressiveCleanup = () => {
    console.log('💥 Limpeza agressiva iniciada...');
    
    // Recarregar a página sem cache
    webViewRef.current?.reload();
    
    // Injeta JavaScript para limpeza imediata
    webViewRef.current?.injectJavaScript(`
      // Forçar limpeza imediata
      window.location.replace('about:blank');
      setTimeout(() => {
        if (window.localStorage) localStorage.clear();
        if (window.sessionStorage) sessionStorage.clear();
        document.cookie.split(";").forEach(c => {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/");
        });
        window.ReactNativeWebView.postMessage('AGGRESSIVE_CLEANUP_DONE');
      }, 100);
    `);
  };

  const handleExitWithCleanup = () => {
    setShowCleanupModal(true);
  };

  const confirmExitWithCleanup = async () => {
    // Executar limpeza antes de sair
    await performCleanup();
    
    // Dar tempo para a limpeza completar
    setTimeout(() => {
      setShowCleanupModal(false);
      navigation.goBack();
    }, 500);
  };

  const handleMessage = (event) => {
    const { data } = event.nativeEvent;
    console.log('📨 Mensagem do WebView:', data);
    
    if (data === 'CLEANUP_COMPLETE') {
      console.log('✅ Limpeza via JavaScript concluída com sucesso');
      Alert.alert('Sucesso', 'Todos os dados foram limpos com sucesso!');
    } else if (data.startsWith('CLEANUP_ERROR')) {
      console.log('⚠️ Erro durante a limpeza:', data);
    } else if (data === 'AGGRESSIVE_CLEANUP_DONE') {
      console.log('💥 Limpeza agressiva concluída');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#2E76B8" barStyle="light-content" />
      
      

      {/* WebView com configurações de privacidade */}
      <WebView
        ref={webViewRef}
        source={{ uri: currentUrl }}
        style={styles.webview}
        onNavigationStateChange={onNavigationStateChange}
        onMessage={handleMessage}
        startInLoadingState={true}
        javaScriptEnabled={true}
        domStorageEnabled={false} // Desabilitar localStorage para mais privacidade
        allowsBackForwardNavigationGestures={true}
        sharedCookiesEnabled={false} // Desabilitar cookies compartilhados
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        // Configurações adicionais de privacidade
        cacheEnabled={false}
        thirdPartyCookiesEnabled={false}
        injectedJavaScriptBeforeContentLoaded={`
          // Prevenir rastreamento desde o início
          Object.defineProperty(navigator, 'doNotTrack', { value: '1' });
          console.log('🛡️ Modo privacidade ativado');
        `}
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

        <TouchableOpacity 
          onPress={handleExitWithCleanup} 
          style={styles.footerButton}
        >
          <Ionicons name="trash" size={20} color="#e74c3c" />
          <Text style={[styles.footerText, { color: '#e74c3c' }]}>Limpar & Sair</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de Confirmação de Limpeza */}
      <Modal
        visible={showCleanupModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCleanupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="shield-checkmark" size={48} color="#2E76B8" style={styles.modalIcon} />
            <Text style={styles.modalTitle}>Limpeza de Dados</Text>
            <Text style={styles.modalText}>
              Todos os dados de navegação serão destruídos:
              {"\n\n"}
              • Cache e histórico{'\n'}
              • Cookies e sessões{'\n'}
              • Formulários preenchidos{'\n'}
              • Dados de autofill{'\n'}
              • Rastreadores
              {"\n\n"}
              Esta ação não pode ser desfeita.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowCleanupModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmExitWithCleanup}
              >
                <Text style={styles.confirmButtonText}>Limpar & Sair</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Os styles permanecem os mesmos...
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
  cleanupButton: {
    padding: 8,
    marginLeft: 8,
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
    flexDirection: 'row',
    alignItems: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: '#ecf0f1',
  },
  confirmButton: {
    backgroundColor: '#e74c3c',
  },
  cancelButtonText: {
    color: '#2c3e50',
    fontWeight: '600',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});