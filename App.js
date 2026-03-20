import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, Pressable, FlatList, TextInput, Modal, Image, Animated } from "react-native";
import { useState, useEffect, useRef } from "react";
import { collection, addDoc, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { useCollection } from "react-firebase-hooks/firestore";
import { database, storage } from "./firebase";
import * as ImagePicker from "expo-image-picker";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import MapView, { Marker } from "react-native-maps";

export default function App() {
  // ============= modal / form state =============//
  const [text, setText] = useState("");
  const [description, setDescription] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [imagePaths, setImagePaths] = useState({});
  const [editObject, setEditObject] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [listVisible, setListVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(300)).current;

  // used when creating a new marker from map long press
  const [selectedCoordinate, setSelectedCoordinate] = useState(null);

  const region = {
    latitude: 55,
    longitude: 12,
    latitudeDelta: 2,
    longitudeDelta: 2,
  };

  // use Firestore markers
  const [values, loading, error] = useCollection(collection(database, "markers"));

  const data =
    values?.docs.map((docItem) => ({
      ...docItem.data(),
      id: docItem.id,
    })) ?? [];

  useEffect(() => {
    data.forEach((item) => {
      if (!imagePaths[item.id]) {
        downloadImage(item.id, item.id + ".jpg");
      }
    });
  }, [data]);

  if (loading) return <Text>Loading...</Text>;
  if (error) return <Text>Error: {String(error.message || error)}</Text>;

  // ============= MAP EVENTS =============//

  // long press on empty map = create new marker
  function handleLongPress(event) {
    const { coordinate } = event.nativeEvent;

    setSelectedCoordinate(coordinate);
    setEditObject(null);
    setText("");
    setImagePath("");
    setModalVisible(true);
  }

  // press existing marker = edit existing marker
  function handleMarkerPress(item) {
    setEditObject(item);
    setSelectedCoordinate({
      latitude: item.latitude,
      longitude: item.longitude,
    });
    setText(item.text ?? "");
    setImagePath(imagePaths[item.id] ?? "");
    setModalVisible(true);
  }

  // ============= CREATE / UPDATE / DELETE =============//

  async function addMarker() {
    if (!text || !selectedCoordinate) return;

    const docRef = await addDoc(collection(database, "markers"), {
      text: text,
      description: description,
      latitude: selectedCoordinate.latitude,
      longitude: selectedCoordinate.longitude,
      likes: 0,
    });

    if (imagePath) {
      await uploadImage(docRef.id);
    }

    closeModal();
  }

  async function saveUpdate() {
    if (!editObject) return;

    await updateDoc(doc(database, "markers", editObject.id), {
      text: text,
      description: description,
    });

    if (imagePath && !imagePath.startsWith("https://")) {
      await uploadImage(editObject.id);
    }

    closeModal();
  }

  async function deleteItem(id) {
    await deleteDoc(doc(database, "markers", id));
  }

  function closeModal() {
    setModalVisible(false);
    setText("");
    setDescription("");
    setImagePath("");
    setEditObject(null);
    setSelectedCoordinate(null);
  }

  // ============= IMAGE =============//

  async function pickImage() {
    let result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImagePath(result.assets[0].uri);
      console.log("billede OK");
    }
  }

  async function uploadImage(id) {
    const res = await fetch(imagePath);
    const blob = await res.blob();
    const storageRef = ref(storage, id + ".jpg");

    await uploadBytes(storageRef, blob);
    console.log("billede uploadet");

    // refresh local preview after upload
    downloadImage(id, id + ".jpg");
  }

  async function downloadImage(id, fileName) {
    getDownloadURL(ref(storage, fileName))
      .then((url) => {
        setImagePaths((paths) => ({ ...paths, [id]: url }));
      })
      .catch(() => {
        // no image exists yet
      });
  }

  // ============= Time-Line ======== //

  function openList() {
    setListVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }

  function closeList() {
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setListVisible(false);
    });
  }

  // ============= LIKES =============//

  function addLike(item) {
    updateDoc(doc(database, "markers", item.id), {
      likes: (item.likes ?? 0) + 1,
    });
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      <View style={styles.mapWrapper}>
        <MapView style={styles.map} onLongPress={handleLongPress} initialRegion={region}>
          {data.map((marker) => (
            <Marker
              key={marker.id}
              coordinate={{
                latitude: marker.latitude,
                longitude: marker.longitude,
              }}
              title={marker.text || "Marker"}
              description={marker.description || "Tryk for at redigere"}
              onPress={() => handleMarkerPress(marker)}
            />
          ))}
        </MapView>
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{editObject ? "Edit marker" : "Create marker"}</Text>

            {imagePath ? (
              <Image source={{ uri: imagePath }} style={styles.previewImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text>No image selected</Text>
              </View>
            )}

            <Pressable onPress={pickImage} style={styles.editButtons}>
              <Text>Pick image</Text>
            </Pressable>

            <TextInput value={text} onChangeText={setText} placeholder="Write title for marker" style={styles.input} />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Write description for marker"
              style={styles.input}
            />

            <View style={styles.modalButtonRow}>
              <Pressable onPress={editObject ? saveUpdate : addMarker} style={styles.editButtons}>
                <Text>{editObject ? "Save" : "Create"}</Text>
              </Pressable>

              <Pressable onPress={closeModal} style={styles.editButtons}>
                <Text>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Pressable onPress={openList} style={styles.showListButton}>
        <Text>Show markers</Text>
      </Pressable>

      {listVisible && (
        <Animated.View
          style={[
            styles.slidePanel,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Markers</Text>
            <Pressable onPress={closeList} style={styles.editButtons}>
              <Text>Close</Text>
            </Pressable>
          </View>

          <FlatList
            data={data}
            keyExtractor={(x) => x.id}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.cardText}>{item.text}</Text>

                {imagePaths[item.id] ? <Image source={{ uri: imagePaths[item.id] }} style={styles.cardImage} /> : null}

                <Text style={styles.description}>{item.description}</Text>

                <View style={styles.cardButtonRow}>
                  <Pressable style={styles.editButtons} onPress={() => deleteItem(item.id)}>
                    <Text>Delete</Text>
                  </Pressable>

                  <Pressable style={styles.editButtons} onPress={() => handleMarkerPress(item)}>
                    <Text>Update</Text>
                  </Pressable>
                </View>

                <View style={styles.likeRow}>
                  <Pressable onPress={() => addLike(item)}>
                    <Text>👍</Text>
                  </Pressable>
                  <Text>{item.likes ?? 0}</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={<Text>No markers yet.</Text>}
            contentContainerStyle={styles.listContent}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  mapWrapper: {
    flex: 1,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  listContent: {
    padding: 16,
  },
  card: {
    width: "100%",
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  cardText: {
    padding: 12,
    fontSize: 16,
  },
  cardImage: {
    height: 200,
    width: "100%",
  },
  cardButtonRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  likeRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 6,
    padding: 8,
  },
  editButtons: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: "#f4f4f4",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  previewImage: {
    width: "100%",
    height: 180,
    borderRadius: 8,
  },
  imagePlaceholder: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
  },
  modalButtonRow: {
    flexDirection: "row",
    gap: 8,
  },
  slidePanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "100%",
    padding: "5%",
    backgroundColor: "white",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },

  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  panelTitle: {
    fontSize: 18,
    fontWeight: "600",
  },

  showListButton: {
    position: "absolute",
    top: 30,
    left: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#f4f4f4",
    borderWidth: 1,
    borderColor: "#ccc",
    zIndex: 20,
  },

  description: {
    padding: "5%",
  },
});
