import React, { RefObject } from "react";
import {
  NavigationContainer,
  NavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import LoginScreen from "../screens/LoginScreen";
import HomeScreen from "../screens/HomeScreen";
import NoteDetailScreen from "../screens/NoteDetailScreen";

export type RootStackParamList = {
  Home: undefined;
  NoteDetail: { noteId: string };
  Login: undefined;
  AuthCallback: { token: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

type Props = {
  navigationRef: RefObject<NavigationContainerRef<RootStackParamList> | null>;
};

export default function RootNavigator({ navigationRef }: Props) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={{
        prefixes: ["stasis://"],
        config: { screens: { AuthCallback: "auth/callback" } },
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen
              name="NoteDetail"
              component={NoteDetailScreen}
              options={{ animation: "slide_from_right" }}
            />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
