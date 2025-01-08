import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
} from "react-native";
import {
  NavigationProp,
  RouteProp,
  useIsFocused,
} from "@react-navigation/native";
import {
  Searchbar,
  Button,
  TextInput,
  Card,
  Text,
  IconButton,
  Menu,
  Divider,
  useTheme,
  FAB,
  Portal,
  PaperProvider,
  Modal,
  Appbar,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../supabaseConfig"; // Import Supabase client
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Spinner from "react-native-loading-spinner-overlay"; // Import spinner library

type RootStackParamList = {
  FolderDetail: { folderId: string; folderName: string };
  Dashboard: { refresh?: boolean };
};

interface RouterProps {
  navigation: NavigationProp<any, any>;
  route: RouteProp<RootStackParamList, "Dashboard">;
}

const Dashboard = ({ navigation, route }: RouterProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredFolders, setFilteredFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [userName, setUserName] = useState(""); // State for logged-in user name
  const theme = useTheme();
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const isFocused = useIsFocused();

  

  const fetchUserName = async () => {
    const {data: {user}} = await supabase.auth.getUser();
    setUserName(user?.user_metadata?.name || "User");
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigation.navigate("Login"); // Redirect to the login screen
    } catch (error) {
      Alert.alert("Error", "Failed to log out.");
    }
  };

  const fetchFolders = async (order: "asc" | "desc" = "desc") => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("folders")
        .select("*")
        .order("created_at", { ascending: order === "asc" });

      if (error) throw error;
      setFilteredFolders(data || []);
    } catch (error) {
      console.error("Error fetching folders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused || route.params?.refresh) {
      fetchFolders(sortOrder);
      fetchUserName();
    }
  }, [isFocused, route.params?.refresh, sortOrder]);

  const showModal = () => setVisible(true);
  const hideModal = () => setVisible(false);

  const handleSearch = async (query: string) => {
    setLoading(true);
    const {data,error} = await supabase.from("folders").select("*").ilike("name", `%${query}%`);
    setFilteredFolders(data || []);
    setLoading(false);

  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("folders")
        .insert([{ name: newFolderName, created_at: new Date() }])
        .select();

      if (error) throw error;

      setFilteredFolders((prev) => [...prev, ...data]);
      setNewFolderName("");
      hideModal();
    } catch (error) {
      console.error("Error creating folder:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderFolderItem = ({ item }: { item: any }) => (
    <Card
      style={styles.folderCard}
      onPress={() =>
        navigation.navigate("FolderDetail", {
          folderId: item.id,
          folderName: item.name,
        })
      }
    >
      <Card.Content style={styles.folderContent}>
        <View style={styles.folderIconContainer}>
          <MaterialCommunityIcons
            name="folder"
            size={40}
            color={theme.colors.primary}
          />
        </View>
        <View style={styles.folderInfo}>
          <Text variant="titleMedium">{item?.name}</Text>
          <Text variant="bodySmall">{item?.image_ids?.length || 0} images</Text>
          <Text variant="bodySmall">
            Created At: {item?.created_at.split("T")[0] || ""}
          </Text>
        </View>
        <IconButton
          icon="chevron-right"
          size={24}
          onPress={() =>
            navigation.navigate("FolderDetail", {
              folderId: item.id,
              folderName: item.name,
            })
          }
        />
      </Card.Content>
    </Card>
  );
  const handleSortChange = (order: "asc" | "desc") => {
    setSortOrder(order);
    setSortMenuVisible(false);
    fetchFolders(order);
  };
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Spinner visible={loading} textContent="Loading..." textStyle={styles.spinnerTextStyle} />
      <PaperProvider>
        <Appbar.Header>
          <Appbar.Content title={`Hello, ${userName}`} />
          <IconButton
            icon="logout"
            onPress={() => handleLogout()}
            size={24}
          />
        </Appbar.Header>
        <View style={styles.content}>
          <Searchbar
            placeholder="Search folders"
            onChangeText={(query) => {
              setSearchQuery(query);
            }}
            value={searchQuery}
            style={styles.searchBar}
            onSubmitEditing={() => handleSearch(searchQuery)}
          />
          <Menu
            visible={sortMenuVisible}
            onDismiss={() => setSortMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setSortMenuVisible(true)}
                style={styles.filterButton}
              >
                Sort by Date
              </Button>
            }
          >
            <Menu.Item
              onPress={() => handleSortChange("asc")}
              title="Ascending"
            />
            <Menu.Item
              onPress={() => handleSortChange("desc")}
              title="Descending"
            />
          </Menu>
          <FlatList
            data={filteredFolders}
            renderItem={renderFolderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.folderList}
          />
        </View>
        {/* Modal for creating a new folder */}
        <Portal>
          <Modal
            visible={visible}
            onDismiss={hideModal}
            contentContainerStyle={styles.modalContainer}
          >
            <Text style={styles.modalTitle}>Create New Folder</Text>
            <TextInput
              label="Folder Name"
              value={newFolderName}
              onChangeText={setNewFolderName}
              mode="outlined"
              style={styles.textInput}
            />
            <View style={styles.modalActions}>
              <Button
                mode="contained"
                onPress={handleCreateFolder}
                disabled={!newFolderName.trim()}
              >
                Create
              </Button>
              <Button
                mode="text"
                onPress={hideModal}
              >
                Cancel
              </Button>
            </View>
          </Modal>
        </Portal>

        <Portal>
          <FAB.Group
            open={fabOpen}
            visible
            icon={fabOpen ? "close" : "plus"}
            actions={[{ icon: "folder-plus", label: "New Folder", onPress: showModal }]}
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
  content: {
    marginTop: 16,
    flex: 1,
    paddingHorizontal: 16,
  },
  searchBar: {
    marginBottom: 16,
  },
  folderList: {
    paddingBottom: 80,
  },
  folderCard: {
    marginBottom: 8,
  },
  filterButton: {
    marginBottom: 16,
  },
  folderContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  folderIconContainer: {
    marginRight: 16,
  },
  folderInfo: {
    flex: 1,
  },
  logoutIcon: {
    marginRight: 16,
  },
  spinnerTextStyle: {
    color: "#FFF",
  },
  modalContainer: {
    backgroundColor: "white",
    padding: 20,
    marginHorizontal: 20,
    borderRadius: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  textInput: {
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export default Dashboard;
