import React, { useState, useEffect } from "react";
import { View, StyleSheet, Image, ActivityIndicator, KeyboardAvoidingView } from "react-native";
import { TextInput, Button, Text, HelperText, Checkbox, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../supabaseConfig";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState(""); // Added name field
  const [rememberMe, setRememberMe] = useState(true); // Default to checked
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const theme = useTheme();

  useEffect(() => {
    // Load saved credentials on component mount
    const loadCredentials = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem("email");
        const savedPassword = await AsyncStorage.getItem("password");
        if (savedEmail && savedPassword) {
          setEmail(savedEmail);
          setPassword(savedPassword);
        }
      } catch (e) {
        console.error("Error loading saved credentials:", e);
      }
    };
    loadCredentials();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      },
    );

      if (loginError) throw loginError;

      // Save credentials if "Remember Me" is checked
      if (rememberMe) {
        await AsyncStorage.setItem("email", email);
        await AsyncStorage.setItem("password", password);
      } else {
        await AsyncStorage.removeItem("email");
        await AsyncStorage.removeItem("password");
      }

      console.log("Login successful");
      // Navigate to the main app screen
    } catch (err) {
      setError(getErrorMessage(err));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim() || !name.trim()) {
      setError("Name, email, and password are required");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { 
          name,
        },
        emailRedirectTo: "",
       },
        
      });

      if (signUpError) throw signUpError;

      console.log("Sign up successful");
      // add confirmation_sent_at to the user
      
      // Navigate to the main app screen
    } catch (err) {
      setError(getErrorMessage(err));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (error: any) => {
    if (error.message) {
      return error.message;
    }
    return "An error occurred. Please try again.";
  };

  return (
    <SafeAreaView style={styles.container}>
      <Image source={require("../../assets/image.png")} resizeMode="contain" style={styles.logo} />
      <Text style={styles.title}>Welcome Back!</Text>
      {/* <TextInput
        label="Name"
        value={name}
        onChangeText={setName}
        style={styles.input}
        autoCapitalize="words"
        placeholder="Enter your name"
      /> */}
      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="Enter your email"
      />
      <HelperText type="error" visible={!!error}>
        {error}
      </HelperText>
      <KeyboardAvoidingView behavior="padding">
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          secureTextEntry
          placeholder="Enter your password"
        />
        <View style={styles.rememberMeContainer}>
          <Checkbox
            status={rememberMe ? "checked" : "unchecked"}
            onPress={() => setRememberMe(!rememberMe)}
            color={theme.colors.primary}
          />
          <Text onPress={() => setRememberMe(!rememberMe)} style={styles.rememberMeText}>
            Remember Me
          </Text>
        </View>
        {loading ? (
          <ActivityIndicator style={styles.loader} />
        ) : (
          <>
            <Button mode="contained" onPress={handleLogin} style={styles.button}>
              Login
            </Button>
            {/* <Button onPress={handleSignUp}>Create Account</Button> */}
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    backgroundColor: "#fff",
  },
  logo: {
    width: 100,
    height: 100,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#000",
  },
  input: {
    marginBottom: 10,
  },
  loader: {
    marginVertical: 20,
  },
  button: {
    marginTop: 10,
  },
  rememberMeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },
  rememberMeText: {
    marginLeft: 8,
    color: "#000",
  },
});

export default Login;
