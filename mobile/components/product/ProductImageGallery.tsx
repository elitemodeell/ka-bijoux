import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type Props = {
  images: string[];
  productName: string;
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
};

export function ProductImageGallery({
  images,
  productName,
  selectedIndex,
  onSelectedIndexChange,
}: Props) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<string>>(null);
  const modalListRef = useRef<FlatList<string>>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalIndex, setModalIndex] = useState(selectedIndex);
  const [pagingEnabled, setPagingEnabled] = useState(true);

  useEffect(() => {
    if (!images.length) return;
    const safeIndex = Math.min(selectedIndex, images.length - 1);
    listRef.current?.scrollToIndex({ index: safeIndex, animated: false });
  }, [images, selectedIndex]);

  function indexFromScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    return Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
  }

  function openAt(index: number) {
    setModalIndex(index);
    setPagingEnabled(true);
    setModalVisible(true);
  }

  function close() {
    setModalVisible(false);
    setPagingEnabled(true);
    onSelectedIndexChange(modalIndex);
  }

  if (!images.length) {
    return (
      <View style={[styles.gallery, styles.placeholder]}>
        <Ionicons name="image-outline" size={64} color={Colors.border} />
      </View>
    );
  }

  return (
    <>
      <View style={styles.gallery}>
        <FlatList
          ref={listRef}
          data={images}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(uri, index) => `${uri}-${index}`}
          getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
          onMomentumScrollEnd={(event) => onSelectedIndexChange(indexFromScroll(event))}
          renderItem={({ item, index }) => (
            <Pressable
              onPress={() => openAt(index)}
              style={styles.slide}
              accessibilityRole="button"
              accessibilityLabel={`Ampliar foto ${index + 1} de ${images.length} de ${productName}`}
            >
              <ExpoImage
                source={{ uri: item }}
                style={styles.image}
                contentFit="contain"
                cachePolicy="memory-disk"
                transition={160}
              />
            </Pressable>
          )}
        />

        <View style={styles.positionBadge} pointerEvents="none">
          <Ionicons name="expand-outline" size={14} color="#fff" />
          <Text style={styles.positionText}>{selectedIndex + 1} / {images.length}</Text>
        </View>
      </View>

      <Modal visible={modalVisible} animationType="fade" transparent={false} onRequestClose={close}>
        <View style={styles.modal}>
          <FlatList
            ref={modalListRef}
            data={images}
            horizontal
            pagingEnabled
            scrollEnabled={pagingEnabled}
            bounces={false}
            initialScrollIndex={Math.min(modalIndex, images.length - 1)}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(uri, index) => `zoom-${uri}-${index}`}
            getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
            onMomentumScrollEnd={(event) => setModalIndex(indexFromScroll(event))}
            renderItem={({ item, index }) => (
              <ZoomableImage
                uri={item}
                label={`${productName}, foto ${index + 1} de ${images.length}`}
                onZoomChange={(zoomed) => setPagingEnabled(!zoomed)}
              />
            )}
          />

          <Pressable
            onPress={close}
            style={[styles.closeButton, { top: insets.top + 10 }]}
            accessibilityRole="button"
            accessibilityLabel="Fechar imagem ampliada"
          >
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>

          <View style={[styles.modalHint, { bottom: insets.bottom + 18 }]} pointerEvents="none">
            <Text style={styles.modalPosition}>{modalIndex + 1} / {images.length}</Text>
            <Text style={styles.modalHintText}>Deslize para os lados · use dois dedos para ampliar</Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

function ZoomableImage({
  uri,
  label,
  onZoomChange,
}: {
  uri: string;
  label: string;
  onZoomChange: (zoomed: boolean) => void;
}) {
  const [isZoomed, setIsZoomed] = useState(false);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  function reportZoom(zoomed: boolean) {
    setIsZoomed(zoomed);
    onZoomChange(zoomed);
  }

  const reset = () => {
    "worklet";
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedX.value = 0;
    savedY.value = 0;
    runOnJS(reportZoom)(false);
  };

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.min(4, Math.max(1, savedScale.value * event.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1.02) reset();
      else runOnJS(reportZoom)(true);
    });

  const pan = Gesture.Pan()
    .enabled(isZoomed)
    .minPointers(1)
    .onUpdate((event) => {
      if (scale.value <= 1) return;
      const maxX = (SCREEN_WIDTH * (scale.value - 1)) / 2;
      const maxY = (SCREEN_HEIGHT * (scale.value - 1)) / 2;
      translateX.value = Math.min(maxX, Math.max(-maxX, savedX.value + event.translationX));
      translateY.value = Math.min(maxY, Math.max(-maxY, savedY.value + event.translationY));
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        reset();
        return;
      }
      scale.value = withTiming(2);
      savedScale.value = 2;
      runOnJS(reportZoom)(true);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, doubleTap)}>
      <View style={styles.zoomPage} accessible accessibilityLabel={label}>
        <Animated.Image source={{ uri }} resizeMode="contain" style={[styles.zoomImage, animatedStyle]} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  gallery: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.25,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  slide: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.25 },
  image: { width: "100%", height: "100%" },
  placeholder: { alignItems: "center", justifyContent: "center" },
  positionBadge: {
    position: "absolute",
    right: 14,
    bottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 18,
    backgroundColor: "rgba(23,7,12,0.72)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  positionText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  modal: { flex: 1, backgroundColor: "#080508" },
  zoomPage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  zoomImage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
  closeButton: {
    position: "absolute",
    right: 16,
    zIndex: 20,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalHint: { position: "absolute", left: 20, right: 20, alignItems: "center" },
  modalPosition: { color: "#fff", fontSize: 14, fontWeight: "900", marginBottom: 4 },
  modalHintText: { color: "rgba(255,255,255,0.72)", fontSize: 12, textAlign: "center" },
});
