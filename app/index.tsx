import {
  NavigationContainer,
  NavigationIndependentTree,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Login from "./screens/Login";
import Dashboard from "./screens/Dashboard";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseConfig"; // Import the initialized Supabase client
import FolderDetail from "./screens/FolderDetail";

const Stack = createNativeStackNavigator();
const InsideStack = createNativeStackNavigator();

function InsideLayout() {
  return (
    <InsideStack.Navigator initialRouteName="Dashboard" id={undefined}>
      <InsideStack.Screen
        name="Dashboard"
        component={Dashboard}
        options={{ headerShown: false }}
      />
      <InsideStack.Screen
        name="FolderDetail"
        component={FolderDetail}
        options={{ headerShown: false }}
      />
    </InsideStack.Navigator>
  );
}

const Index = () => {
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    // Fetch initial session
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };

    fetchSession();

    // Subscribe to auth state changes
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    // Cleanup subscription on component unmount
    return () => {
      subscription?.subscription?.unsubscribe();
    };
  }, []);

  return (
    <NavigationIndependentTree>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login" id={undefined}>
          {user ? (
            <Stack.Screen
              name="Inside"
              component={InsideLayout}
              options={{ headerShown: false }}
            />
          ) : (
            <Stack.Screen
              name="Login"
              component={Login}
              options={{ headerShown: false }}
            />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </NavigationIndependentTree>
  );
};

export default Index;
