import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import MainTabs from './src/navigation/MainTabs';
import BoletosScreen from './src/screens/BoletosScreen';
import BuscarEspecialidades from './src/screens/BuscarEspecialidadeScreen';
import ResultadosClinicas from './src/screens/ResultadosClinicas';
import BrowserScreen from './src/screens/BrowserScreen';
import EncontrarClinicas from './src/screens/EncontrarClinicas'
import SolicitarAut from './src/screens/SolicitarAut'
import CarenciasScreen from './src/screens/CarenciasScreen';
import AcompanharAutorizacoesScreen from './src/screens/AcompanharAutorizacoesScreen';

const Stack = createStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Verificar se o usuário já está logado ao iniciar o app
  useEffect(() => {
    console.log('App iniciando - verificando login...');
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      console.log('Verificando AsyncStorage...');
      const storedUserData = await AsyncStorage.getItem('userData');
      console.log('Dados do AsyncStorage:', storedUserData);
      
      if (storedUserData) {
        const userData = JSON.parse(storedUserData);
        setUserData(userData);
        setIsLoggedIn(true);
        console.log('Usuário logado encontrado:', userData.sNomeUSR);
      } else {
        console.log('Nenhum usuário logado encontrado');
      }
    } catch (error) {
      console.error('Erro ao verificar login:', error);
    } finally {
      console.log('Finalizando verificação, isLoading = false');
      setIsLoading(false);
    }
  };

  const handleLogin = async (userData) => {
    try {
      console.log('Fazendo login do usuário:', userData.sNomeUSR);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      setUserData(userData);
      setIsLoggedIn(true);
    } catch (error) {
      console.error('Erro ao salvar dados do usuário:', error);
    }
  };

  const handleLogout = async () => {
    try {
      console.log('Fazendo logout');
      await AsyncStorage.removeItem('userData');
      setUserData(null);
      setIsLoggedIn(false);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  if (isLoading) {
    console.log('Mostrando loading...');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2E76B8" />
        <Text style={{ marginTop: 10 }}>Carregando...</Text>
      </View>
    );
  }

  console.log('Renderizando navegação. isLoggedIn:', isLoggedIn);

  return (
  <NavigationContainer>
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (
        <>
          {/* 🌟 Tela principal com Tabs */}
          <Stack.Screen name="home">
            {(props) => (
              <MainTabs
                {...props}
                userData={userData}
                onLogout={handleLogout}
              />
            )}
          </Stack.Screen>

          {/* 🌟 Nova rota para Boletos */}
          <Stack.Screen
            name="Boletos"
            component={BoletosScreen}
            options={{
              headerShown: true,      // Mostra o header nessa tela
              title: "Meus Boletos",  // Título no topo
              headerStyle: { backgroundColor: "#2E76B8" },
              headerTintColor: "#fff",
              headerTintColor: "#fff", // Cor do texto e botão de voltar
            }}
          />

          <Stack.Screen 
            name="Telemedicina" 
            component={BrowserScreen}
            options={{ 
              headerShown: true,
              tittle: "Telemedicina",
              headerStyle: { backgroundColor: "#2E76B8" },
              headerTintColor: "#fff",
            }}
            />

          <Stack.Screen 
            name="ResultadosClinicas" 
            component={ResultadosClinicas} 
            options={{ 
              headerShown: true,      // Mostra o header nessa tela
              title: "Especialidades",  // Título no topo
              headerStyle: { backgroundColor: "#2E76B8" },
              headerTintColor: "#fff", // Cor do texto e botão de voltar
            }}
          />

          <Stack.Screen
            name= "EncontrarClinicas"
            component={EncontrarClinicas}
            options={{
              headerShown: true,
              title: "Encontrar Clinicas",
              headerStyle: { backgroundColor: "#2E76B8" },
              headerTintColor: "#fff", // Cor do texto e botão de voltar
            }}
          />

          <Stack.Screen
            name="SolicitarAut"
            component={SolicitarAut}
            options={{
              headerShown: true,
              title: "Solicitar Autorização",
              headerStyle: { backgroundColor: "#2E76B8" },
              headerTintColor: "#fff", // Cor do texto e botão de voltar
            }}
          />

          <Stack.Screen
            name="AcompanharAutorizacoes"
            component={AcompanharAutorizacoesScreen}
            options={{
              headerShown: true,
              title: "Minhas Autorizações",
              headerStyle: { backgroundColor: "#2E76B8" },
              headerTintColor: "#fff",
            }}
          />

          <Stack.Screen
            name="Carencias"
            component={CarenciasScreen}
            options={{
              headerShown: true,
              title: "Informações de Carências",
              headerStyle: { backgroundColor: "#2E76B8" },
              headerTintColor: "#fff", // Cor do texto e botão de voltar
            }}
          />
          

          <Stack.Screen
            name="BuscarEspecialidades"
            component={BuscarEspecialidades}
            options={{
              headerShown: true,      // Mostra o header nessa tela
              title: "Especialidades",  // Título no topo
              headerStyle: { backgroundColor: "#2E76B8" },
              headerTintColor: "#fff", // Cor do texto e botão de voltar
            }}
          />
        </>
      ) : (
        <>
          {/* Telas de autenticação */}
          <Stack.Screen name="Login">
            {(props) => <LoginScreen {...props} onLogin={handleLogin} />}
          </Stack.Screen>
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  </NavigationContainer>
);
}