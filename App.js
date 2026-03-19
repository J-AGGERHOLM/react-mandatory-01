import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, Pressable, FlatList, TextInput, Modal, Image } from "react-native";
import { useState, useEffect } from "react";
import { collection, addDoc, doc, deleteDoc, updateDoc } from "firebase/firestore";
// npm install react-firebase-hooks
import { useCollection } from "react-firebase-hooks/firestore";
import { database, storage } from "./firebase";
import * as ImagePicker from "expo-image-picker";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import MapView, { Marker } from "react-native-maps";

export default function App() {
  //============= for map================//
  const [markers, setMarkers] = useState([]);
  const region = {
    latitude: 55,
    longitude: 12,
    latitudeDelta: 2,
    longitudeDelta: 2
  };

  async function handleLongPress(event) {
    // event har koordinaten indeni
    // destructure for kun at få koordinaterne ud
    const { coordinate } = event.nativeEvent;
    // Refresh state, så marker bliver opdateret med det nye marker
    // Delete det gamle marker og tilføj det nye marker
    setMarkers((prev) => [...prev, coordinate]);
  }

  // =============for notebook: =============//
  const [text, setText] = useState("");
  const [imagePath, setImagePath] = useState({});
  const [imagePaths, setImagePaths] = useState({});
  const [editObject, setEditObject] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [values, loading, error] = useCollection(collection(database, "notes"));
  const data = values?.docs.map((doc) => ({ ...doc.data(), id: doc.id })) ?? [];

  useEffect(() => {
    // for hver note, hent billedet, hvis det findes
    data.forEach((doc) => {
      if (!imagePaths[doc.id]) {
        downloadImage(doc.id, doc.id + ".jpg");
      }
    });
  }, [data]); // skal justeres

  if (loading) return <Text>Loading...</Text>;
  if (error) return <Text>Error: {String(error.message || error)}</Text>;
  async function addItem() {
    if (!text) return;
    await addDoc(collection(database, "notes"), {
      text: text,
    });
    setText("");
  }

  async function deleteItem(id) {
    await deleteDoc(doc(database, "notes", id));
  }

  function updateItem(item) {
    setEditObject(item);
    setText(item.text);
    setModalVisible(!modalVisible);
  }

  async function saveUpdate() {
    updateDoc(doc(database, "notes", editObject.id), {
      text: text,
    });
    uploadImage(editObject.id);
    setModalVisible(!modalVisible);
  }

  async function pickImage() {
    let result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
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
    uploadBytes(storageRef, blob).then((snap) => {
      console.log("billede uploadet \n" + JSON.stringify(snap.metadata, null, 2));
    });
  }

  async function downloadImage(id, fileName) {
    getDownloadURL(ref(storage, fileName)).then((url) => {
      console.log("henter billede " + JSON.stringify(url, null, 2));
      setImagePaths((paths) => ({ ...paths, [id]: url }));
    });
  }

  async function launchCamera() {
    const result = await ImagePicker.requestCameraPermissionsAsync();
    if (result.granted === false) {
      alert("no permission for camera");
    } else {
      await ImagePicker.launchCameraAsync({
        quality: 1,
      })
        .then((response) => {
          if (!response.canceled) {
            setImagePath(response.assets[0].uri);
          }
        })
        .catch((error) => alert("error med billede " + error));
    }
  }

  function addLike(item) {
    updateDoc(doc(database, "notes", item.id), {
      likes: (item.likes ?? 0) + 1,
    });
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto"></StatusBar>
              <MapView style={{ width: "100%", height: "100%" }} onLongPress={handleLongPress} region={region}>
          {markers &&
            markers.map((marker, index) => (
              <Marker key={index} coordinate={marker} title="Go There" description="Good View"></Marker>
            ))}
        </MapView>
      <Modal visible={modalVisible} onDismiss={() => setText("")}>
        <View style={styles.modalContainer}>
          <Image source={{ uri: imagePath }} style={{ width: 100, height: 100 }} />
          <Pressable onPress={pickImage} style={styles.editButtons}>
            <Text>Pick image</Text>
          </Pressable>
          <Pressable onPress={launchCamera} style={styles.editButtons}>
            <Text>Camera</Text>
          </Pressable>
          <TextInput defaultValue={editObject.text} onChangeText={setText} />
          <Pressable onPress={saveUpdate}>
            <Text>Save</Text>
          </Pressable>
          <Pressable onPress={() => setModalVisible(!modalVisible)}>
            <Text>Cancel</Text>
          </Pressable>
        </View>
      </Modal>
      <FlatList
        data={data}
        keyExtractor={(x) => x.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>{item.text}</Text>
            <Image source={{ uri: imagePaths[item.id] }} style={styles.cardImage} />
            <Pressable style={styles.editButtons} onPress={() => deleteItem(item.id)}>
              <Text>Delete</Text>
            </Pressable>
            <Pressable style={styles.editButtons} onPress={() => updateItem(item)}>
              <Text>Update</Text>
            </Pressable>
            <View style={styles.likeRow}>
              <Pressable onPress={() => addLike(item)}>
                <Text>👍</Text>
              </Pressable>
              <Text>{item.likes ?? 0}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text>No notes yet.</Text>}
      />

      <Pressable onPress={downloadImage} style={styles.editButtons}>
        <Text>Download image</Text>
      </Pressable>

      <TextInput onChangeText={setText} placeholder="Type here" value={text} />
      <Pressable style={styles.addBtn} onPress={addItem}>
        <Text>Add item</Text>
      </Pressable>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 50,
    paddingBottom: 50,
  },
  cardImage: {
    height: 200,
    width: "100%",
  },
  addBtn: {
    backgroundColor: "#ccc",
  },
  card: {
    width: 350,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    borderColor: "#ddd",
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
  },
  modalContainer: {
    flex: 1,
    marginTop: 100,
    maxHeight: 200,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "orange",
  },
});
