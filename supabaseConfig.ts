import "react-native-url-polyfill/auto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Initialize Supabase client
const supabase: SupabaseClient = createClient(
  "https://iicaaazebiufdgjmvckr.supabase.co",
  process.env.EXPO_PUBLIC_SUPABASE_KEY as string,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

// Define types for folder and image
interface Folder {
  id: string;
  name: string;
  created_at: Date;
  image_ids: string[] | null;
}

interface Image {
  id: string;
  folder_id: string;
  uri: string;
  uploaded_at: Date;
}

// Function to create a folder in Supabase
const createFolder = async (folderName: string): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from("folders")
      .insert([{ name: folderName, created_at: new Date(), image_ids: [] }])
      .select(); // Include .select() to ensure data is returned

    if (error) throw error;
    if (data && data.length > 0) {
      console.log("Folder created with ID:", data[0].id);
    } else {
      throw new Error("Folder creation returned empty data");
    }
  } catch (error) {
    console.error("Error creating folder:", error);
  }
};

// Function to fetch all folders from Supabase
const getAllFolders = async (): Promise<Folder[]> => {
  try {
    const { data, error } = await supabase.from("folders").select("*");

    if (error) throw error;
    if (!data) throw new Error("No folders found");
    console.log("Fetched folders:", data);
    return data;
  } catch (error) {
    console.error("Error fetching folders:", error);
    throw error;
  }
};

// Function to upload an image to Supabase Storage and update the database
const uploadImageToSupabase = async (
  folderId: string,
  imageUri: string
): Promise<void> => {
  try {
    const fileName = imageUri.split("/").pop(); // Extract file name
    if (!fileName) throw new Error("Invalid image URI");

    const response = await fetch(imageUri);
    const blob = await response.blob();

    // Upload image to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("images")
      .upload(`images/${fileName}`, blob);

    if (uploadError) throw uploadError;

    // Get the public URL
    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from("images")
      .getPublicUrl(`images/${fileName}`);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      throw new Error("Failed to generate public URL for the uploaded image");
    }

    // Add image metadata to Supabase database
    const { data: imageData, error: imageError } = await supabase
      .from("images")
      .insert([
        {
          folder_id: folderId,
          uri: publicUrlData.publicUrl,
          uploaded_at: new Date(),
        },
      ])
      .select();

    if (imageError || !imageData || imageData.length === 0)
      throw new Error("Error inserting image metadata");

    // Update the folder document to include the image ID
    const { error: updateError } = await supabase
      .from("folders")
      .update({
        image_ids: supabase.rpc("array_append", { image_ids: imageData[0].id }),
      })
      .eq("id", folderId);

    if (updateError) throw updateError;

    console.log("Image uploaded and linked to folder:", imageData[0].id);
  } catch (error) {
    console.error("Error uploading image:", error);
  }
};

// Export instances and utility functions
export { supabase, createFolder, getAllFolders, uploadImageToSupabase };
