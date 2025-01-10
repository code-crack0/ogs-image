import React, { useEffect, useState } from "react";
import { View, StyleSheet, FlatList, TextInput, TouchableWithoutFeedback, Alert } from "react-native";
import { NavigationProp, RouteProp } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import {
  Appbar,
  FAB,
  Card,
  IconButton,
  Menu,
  useTheme,
  PaperProvider,
  Portal,
  Modal,
  Button,
  Text,
} from "react-native-paper";
import * as FileSystem from "expo-file-system";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../supabaseConfig"; // Import Supabase client
import axios from "axios";
import ImageViewing from "react-native-image-viewing"; // Import image viewing library
import Spinner from "react-native-loading-spinner-overlay"; // Import the spinner library
import checkPermission from "../../util/checkPermission";
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
type RootStackParamList = {
  FolderDetail: { folderId: string; folderName: string };
};

type FolderDetailRouteProp = RouteProp<RootStackParamList, "FolderDetail">;

interface RouterProps {
  navigation: NavigationProp<any, any>;
  route: FolderDetailRouteProp;
}

const FolderDetail = ({ navigation, route }: RouterProps) => {
  let { folderId } = route.params;
  const [images, setImages] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [loading, setLoading] = useState(false); // State for spinner
  const [isViewerVisible, setIsViewerVisible] = useState(false); // Full-screen viewer visibility
  const [selectedImageIndex, setSelectedImageIndex] = useState(0); // Index of the selected image
  const [folderName, setFolderName] = useState(route.params.folderName);
 
  const [isRenameModalVisible, setRenameModalVisible] = useState(false); // Modal visibility
  const [newFolderName, setNewFolderName] = useState(""); // New folder name

  const theme = useTheme();

  const updateFolderName = async (newName: string) => {
    try {
      const { data, error } = await supabase
        .from("folders")
        .update({ name: newName })
        .eq("id", folderId).select("name");

      if (error) {
        console.error("Error updating folder name:", error.message);
        return;
      }
      console.log("Folder name updated:", data);
      const updatedData = data as {name:string}[];
      if (updatedData && updatedData.length > 0) {
        console.log("Folder name updated:", updatedData[0].name);
        setFolderName(updatedData[0].name); // Update the folder name state
        setRenameModalVisible(false); // Close the modal
      } else {
        console.log("No folder was updated.");
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  };
  const handleRenameConfirm = () => {
    if (newFolderName.trim()) {
      updateFolderName(newFolderName.trim());
    }
  };
  useEffect(() => {
    const fetchImages = async () => {
      try {
        setLoading(true); // Show spinner while fetching
        const { data, error } = await supabase
          .from("images")
          .select("*")
          .eq("folder_id", folderId);

        if (error) throw error;
        setImages(data || []);
        console.log(data);
      } catch (error) {
        console.error("Error fetching images:", error);
      } finally {
        setLoading(false); // Hide spinner after fetching
      }
    };

    fetchImages();
  }, [folderId]);

  const uploadImageToSupabase = async (imageUri: string) => {
    try {
      const permission_bool = await checkPermission('upload');
      if (!permission_bool){
        Alert.alert('Error', 'You do not have permission to upload images.');
        return;
      }
      console.log(permission_bool);

      const fileName = `${Date.now()}_${imageUri.split("/").pop()}`;
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { data, error } = await supabase.storage
        .from("images")
        .createSignedUploadUrl(`folder_${folderId}/${fileName}`);

      if (error) throw error;

      const { signedUrl } = data;

      await axios.put(signedUrl, decode(base64), {
        headers: {
          "Content-Type": "image/jpeg",
        },
      });

      const publicUrlData = await supabase.storage
        .from("images")
        .getPublicUrl(`folder_${folderId}/${fileName}`);

      const { data: imageData, error: imageError } = await supabase
        .from("images")
        .insert([
          {
            folder_id: folderId,
            uri: publicUrlData?.data?.publicUrl,
            uploaded_at: new Date(),
          },
        ])
        .select();

      if (imageError) throw imageError;

      if (imageData && imageData.length > 0) {
        const newImageId = imageData[0].id;

        const { data: folderFetchData, error: folderFetchError } = await supabase
          .from("folders")
          .select("image_ids")
          .eq("id", folderId)
          .single();

        if (folderFetchError) throw folderFetchError;

        const currentImageIds = folderFetchData?.image_ids || [];
        const updatedImageIds = [...currentImageIds, newImageId];

        const { error: folderUpdateError } = await supabase
          .from("folders")
          .update({ image_ids: updatedImageIds })
          .eq("id", folderId);

        if (folderUpdateError) throw folderUpdateError;

        console.log("Image uploaded and linked to folder");
        setImages((prev) => [...prev, { id: newImageId, uri: publicUrlData?.data?.publicUrl }]);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true, // Enable multiple image selection
        quality: 1,
      });

      if (!result.canceled && result.assets?.length > 0) {
        setLoading(true); // Show spinner during upload
        for (const asset of result.assets) {
          await uploadImageToSupabase(asset.uri);
        }
      }
    } catch (error) {
      console.error("Error picking/uploading images:", error);
    } finally {
      setLoading(false); // Hide spinner after upload
    }
  };
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        console.error('Camera permissions are required to take a photo.');
        return;
      }
  
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"], // Only allow images
        quality: 1, // High-quality image
      });
  
      if (!result.canceled) {
        setLoading(true); // Show spinner during upload
        await uploadImageToSupabase(result.assets[0].uri); // Assuming a single photo
      }
    } catch (error) {
      console.error('Error taking/uploading photo:', error);
    } finally {
      setLoading(false); // Hide spinner after upload
    }
  };
  const renderImageItem = ({ item, index }: { item: any; index: number }) => (
    <Card style={styles.imageCard}>
      <TouchableWithoutFeedback
        onPress={() => {
          setSelectedImageIndex(index);
          setIsViewerVisible(true);
        }}
      >
        <Card.Cover source={{ uri: item.uri }} style={styles.image} />
      </TouchableWithoutFeedback>
      <Card.Title
        title={`Image ${index + 1}`}
        right={(props) => (
          <IconButton
            {...props}
            icon="delete"
            onPress={() => handleDeleteImage(item)}
          />
        )}
      />
    </Card>
  );
  const handleDeleteImage = async (image: any) => {
    try {
      const permission_bool = await checkPermission('delete');
      if(!permission_bool){
        Alert.alert('Error', 'You do not have permission to delete images.');
        return;
      }
      setLoading(true); // Show spinner during deletion
  
      // Step 1: Delete the image from Supabase storage
      const filePath = image.uri.split("/").pop(); // Extract file name from URL
      const { error: storageError } = await supabase.storage
        .from("images")
        .remove([`folder_${folderId}/${filePath}`]);
  
      if (storageError) throw storageError;
  
      // Step 2: Delete the image entry from the database
      const { error: dbError } = await supabase
        .from("images")
        .delete()
        .eq("id", image.id);
  
      if (dbError) throw dbError;
  
      // Step 3: Update the local state
      setImages((prevImages) => prevImages.filter((img) => img.id !== image.id));
  
      console.log("Image deleted successfully.");
    } catch (error) {
      console.error("Error deleting image:", error);
    } finally {
      setLoading(false); // Hide spinner after deletion
    }
  };
    
  const deleteFolder = async () => {
    try {
      // Step 1: List all files in the folder
      const { data: files, error: listFilesError } = await supabase.storage
        .from("images")
        .list(`folder_${folderId}`, { limit: 1000 });
  
      if (listFilesError) {
        console.error("Error listing files in storage:", listFilesError.message);
        return;
      }
      console.log("Files in folder:", files);
      if (files && files.length > 0) {
        // Step 2: Build file paths for deletion
        const filePaths = files.map((file) => `folder_${folderId}/${file.name}`);
        console.log("Files to delete:", filePaths);
        // Step 3: Delete all files in the folder
        const { error: deleteFilesError } = await supabase.storage
          .from("images")
          .remove(filePaths);
  
        if (deleteFilesError) {
          console.error("Error deleting files from storage:", deleteFilesError.message);
          return;
        }
      }
  
      // Step 4: Delete image entries from the `images` table
      const { error: deleteImagesDbError } = await supabase
        .from("images")
        .delete()
        .eq("folder_id", folderId);
  
      if (deleteImagesDbError) {
        console.error("Error deleting images from database:", deleteImagesDbError.message);
        return;
      }
  
      // Step 5: Delete the folder entry from the `folders` table
      const { error: deleteFolderError } = await supabase
        .from("folders")
        .delete()
        .eq("id", folderId);
  
      if (deleteFolderError) {
        console.error("Error deleting folder from database:", deleteFolderError.message);
        return;
      }
  
      console.log("Folder and all its images deleted successfully.");
      navigation.navigate("Dashboard", { refresh: true }); // Navigate back to the dashboard
    } catch (error) {
      console.error("Unexpected error while deleting folder:", error);
    }
  };
  
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <PaperProvider>
        <Portal>
          <Modal
            visible={isRenameModalVisible}
            onDismiss={() => setRenameModalVisible(false)}
            contentContainerStyle={styles.modalContainer}
          >
            <Text style={styles.modalTitle}>Rename Folder</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter new folder name"
              value={newFolderName}
              onChangeText={setNewFolderName}
            />
            <View style={styles.modalActions}>
              <Button
                mode="contained"
                onPress={handleRenameConfirm}
                disabled={!newFolderName.trim()}
              >
                Confirm
              </Button>
              <Button
                mode="text"
                onPress={() => setRenameModalVisible(false)}
              >
                Cancel
              </Button>
            </View>
          </Modal>
        </Portal>
        <Spinner
          visible={loading} // Bind spinner visibility to the loading state
          textContent={"Uploading..."}
          textStyle={styles.spinnerText}
        />
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title={folderName} />
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <Appbar.Action
                icon="dots-vertical"
                onPress={() => setMenuVisible(true)}
              />
            }
          >
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                setRenameModalVisible(true); // Open the rename modal
              }}
              title="Rename folder"
            />
            <Menu.Item onPress={async () => {
              setMenuVisible(false);
              await deleteFolder()
            }} title="Delete folder" />
          </Menu>
        </Appbar.Header>

        <FlatList
          data={images}
          renderItem={renderImageItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.imageList}
        />

        <ImageViewing
          images={images.map((img) => ({ uri: img.uri }))}
          imageIndex={selectedImageIndex}
          visible={isViewerVisible}
          onRequestClose={() => {
            setIsViewerVisible(false);
            setSelectedImageIndex(0);
          }}
        />

        <Portal>
          <FAB.Group
            open={fabOpen}
            visible
            icon={fabOpen ? "close" : "plus"}
            actions={[
              { icon: "image-plus", label: "Upload Image", onPress: pickImage },
              { icon: "camera", label: "Take Photo", onPress: takePhoto },
            ]}
            onStateChange={({ open }) => setFabOpen(open)}
          />
        </Portal>
      </PaperProvider>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: "white",
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  imageList: {
    padding: 8,
  },
  imageCard: {
    flex: 1,
    margin: 4,
  },
  image: {
    height: 150,
  },
  spinnerText: {
    color: "#FFF",
  },
});

export default FolderDetail;
