// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { collection, addDoc, updateDoc, arrayUnion, serverTimestamp, doc, getDocs } from "firebase/firestore";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCdxmAxNwweO0HtYXx4wujp5YLUweB7buc",
  authDomain: "ogs-image-8766b.firebaseapp.com",
  projectId: "ogs-image-8766b",
  storageBucket: "ogs-image-8766b.appspot.com",
  messagingSenderId: "782192925840",
  appId: "1:782192925840:web:41a38da1e69afee7388c15",
  measurementId: "G-NE103TZB7G",
};

// Initialize Firebase App (only if not already initialized)
const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Get Firebase Auth instance
const auth = getAuth(firebaseApp); // Use getAuth instead of initializeAuth
// Optionally set persistence for React Native
auth.setPersistence(getReactNativePersistence(ReactNativeAsyncStorage));

// Get Firestore instance
const db = getFirestore(firebaseApp);

// Get Storage instance
const storage = getStorage(firebaseApp);

// Function to create a folder in Firestore
const createFolder = async (folderName: string) => {
  try {
    const folderRef = await addDoc(collection(db, "folders"), {
      name: folderName,
      createdAt: serverTimestamp(),
      imageIds: [],
    });
    console.log("Folder created with ID:", folderRef.id);
  } catch (error) {
    console.error("Error creating folder:", error);
  }
};

// Function to fetch all folders from Firestore
const getAllFolders = async () => {
  try {
    const foldersSnapshot = await getDocs(collection(db, "folders"));
    const folders = foldersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    console.log("Fetched folders:", folders);
    return folders; // Return the folder data
  } catch (error) {
    console.error("Error fetching folders:", error);
    throw error; // Throw error for handling in the caller
  }
};

// Function to upload an image to Firebase Storage and update Firestore
const uploadImageToFirebase = async (folderId: string, imageUri: string) => {
  try {
    const fileName = imageUri.split("/").pop(); // Extract file name
    const imageRef = ref(storage, `images/${fileName}`);
    
    // Convert image to blob
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // Upload image to Firebase Storage
    await uploadBytes(imageRef, blob);

    // Get the public URL
    const downloadURL = await getDownloadURL(imageRef);

    // Add image metadata to Firestore
    const imageRefInDb = await addDoc(collection(db, "images"), {
      folderId,
      uri: downloadURL,
      uploadedAt: serverTimestamp(),
    });

    // Update the folder document to include the image ID
    const folderDocRef = doc(db, "folders", folderId);
    await updateDoc(folderDocRef, {
      imageIds: arrayUnion(imageRefInDb.id),
    });

    console.log("Image uploaded and linked to folder:", imageRefInDb.id);
  } catch (error) {
    console.error("Error uploading image:", error);
  }
};

// Export instances and utility functions
export { firebaseApp, auth, db, storage, createFolder, getAllFolders, uploadImageToFirebase };
