import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text } from 'react-native'; // ✅ Adicione Text aqui
import HomeScreen from './screens/home';
import CarteirinhaScreen from './screens/CarteirinhaScreen';
import PerfilScreen from './screens/Perfil';
import SettingsScreen from './screens/SettingsScreen'; // ✅ Importe a SettingsScreen real
import boletoScreen from './screens/BoletosScreen';
import ServicesScreen from './screens/ServicosScreen';

// ✅ Telas placeholder CORRETAS com React Native


const Tab = createBottomTabNavigator();
function MainTabs({ userData, onLogout }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#2E76B8',
        tabBarInactiveTintColor: '#95a5a6',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#ecf0f1',
          height: 80,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: -3,
        },
        headerShown: false,
        tabBarIcon: ({ color, size, focused }) => {
          // Desloca todos os ícones 10px para cima
          const iconStyle = { marginTop: -15 };
          
          if (route.name === 'Carteirinha') {
            return (
                <View style={[iconStyle, { 
                backgroundColor: '#2E76B8', 
                borderRadius: 30,
                padding: 8,
                width: 48,
                height: 48,
                justifyContent: 'center',
                marginTop: -25,
                marginBottom: 5
                }]}>
                <Ionicons 
                    name="card" 
                    size={32} 
                    color="white" // Ícone branco no fundo azul
                />
                </View>
            );
            }

          let iconName;
          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Services':
              iconName = 'medkit';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            case 'Settings':
              iconName = 'settings';
              break;
            default:
              iconName = 'help';
          }

          return (
            <View style={iconStyle}>
              <Ionicons name={iconName} size={size} color={color} />
            </View>
          );
        },
      })}
    >
      {/* 1. HOME */}
      <Tab.Screen 
        name="Home" 
        options={{
          tabBarLabel: 'Início',
        }}
      >
        {(props) => <HomeScreen {...props} userData={userData} onLogout={onLogout} />}
      </Tab.Screen>

      

      {/* 2. SERVIÇOS */}
      <Tab.Screen 
        name="Services" 
        component={ServicesScreen}
        options={{
          tabBarLabel: 'Serviços',
        }}
      />

      {/* 3. CARTEIRINHA (Botão Central com destaque) */}
      <Tab.Screen 
        name="Carteirinha" 
        component={CarteirinhaScreen}
        options={{
          tabBarLabel: 'Carteirinha',
        }}
      />

      {/* 4. PERFIL */}
      <Tab.Screen 
        name="Profile" 
        component={PerfilScreen}
        options={{
          tabBarLabel: 'Perfil',
        }}
      />
    
      {/* 5. AJUSTES - COM PASSO DE onLogout */}
      <Tab.Screen 
      name="Settings"
      options={{ tabBarLabel: 'Ajustes',
        }}
      >
      {(props) => <SettingsScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>
      
     
    </Tab.Navigator>
  );
}

export default MainTabs;