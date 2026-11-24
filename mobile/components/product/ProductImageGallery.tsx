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
import Ionicons from "@expo/vector-icons/Ionicons";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ResilientProductImage } from "@/components/product/ResilientProductImage";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const GALLERY_HEIGHT = Math.min(SCREEN_WIDTH * 1.08, 460);

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
  const lastModalIndex = useRef(selectedIndex);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalIndex, setModalIndex] = useState(selectedIndex);
  const [pagingEnabled, setPagingEnabled] = useState(true);

  useEffect(() => {
    if (!images.length) return;
    const safeIndex = Math.min(selectedIndex, images.length - 1);
    listRef.current?.scrollToIndex({ index: safeIndex, animated: false });
  }, [images, selectedIndex]);

  function indexFromScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    return Math.max(0, Math.min(images.length - 1, Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH)));
  }

  function openAt(index: number) {
    lastModalIndex.current = index;
    setModalIndex(index);
    setPagingEnabled(true);
    setModalVisible(true);
  }

  function close() {
    setModalVisible(false);
    setPagingEnabled(true);
    onSelectedIndexChange(lastModalIndex.current);
  }

  if (!images.length) {
    return (
      <ResilientProductImage sources={[]} style={styles.gallery} accessibilityLabel={`Produto ${productName} sem imagem`} />
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
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
          getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
          onMomentumScrollEnd={(event) => onSelectedIndexChange(indexFromScroll(event))}
          renderItem={({ item, index }) => (
            <Pressable
              onPress={() => openAt(index)}
              style={styles.slide}
              accessibilityRole="button"
              accessibilityLabel={`Ampliar foto ${index + 1} de ${images.length} de ${productName}`}
            >
              <ResilientProductImage
                sources={[item]}
                style={styles.image}
                contentFit="contain"
                accessibilityLabel={`Foto ${index + 1} de ${productName}`}
              />
            </Pressable>
          )}
        />

        <View style={styles.positionBadge} pointerEvents="none">
          <Ionicons name="expand-outline" size={14} color="#fff" />
          <Text style={styles.positionText}>{selectedIndex + 1} / {images.length}</Text>
        </View>
      </View>

      {modalVisible && <Modal visible animationType="fade" transparent={false} onRequestClose={close}>
        <GestureHandlerRootView style={styles.modal} accessibilityViewIsModal>
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            scrollEnabled={pagingEnabled}
            bounces={false}
            initialScrollIndex={Math.min(modalIndex, images.length - 1)}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(uri, index) => `zoom-${uri}-${index}`}
            initialNumToRender={1}
            maxToRenderPerBatch={2}
            windowSize={3}
            getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
            onScroll={(event) => { lastModalIndex.current = indexFromScroll(event); }}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(event) => {
              const index = indexFromScroll(event);
              lastModalIndex.current = index;
              setModalIndex(index);
            }}
            renderItem={({ item, index }) => (
              <ZoomableImage
                uri={item}
                label={`${productName}, foto ${index + 1} de ${images.length}`}
                onZoomChange={(zoomed) => setPagingEnabled(!zoomed)}
              />
            )}
          />

          <View pointerEvents="box-none" style={[styles.modalControls, {
            top: insets.top + 10,
            left: insets.left + 16,
            right: insets.right + 16,
          }]}>
            <Pressable onPress={close} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Voltar à página do produto">
              <Ionicons name="arrow-back" size={20} color="#141414" />
              <Text style={styles.controlText}>Voltar</Text>
            </Pressable>
            <Pressable onPress={close} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Fechar imagem ampliada">
              <Ionicons name="close" size={26} color="#141414" />
            </Pressable>
          </View>

          <View style={[styles.modalHint, { bottom: insets.bottom + 18 }]} pointerEvents="none">
            <Text style={styles.modalPosition} accessibilityLiveRegion="polite" accessibilityLabel={`Foto ${modalIndex + 1} de ${images.length}`}>{modalIndex + 1} / {images.length}</Text>
            <Text style={styles.modalHintText}>Deslize para os lados · use dois dedos para ampliar</Text>
          </View>
        </GestureHandlerRootView>
      </Modal>}
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
        <Animated.View style={[styles.zoomImage, animatedStyle]}>
          <ResilientProductImage sources={[uri]} style={styles.zoomImageContent} contentFit="contain" />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  gallery: {
    width: SCREEN_WIDTH,
    height: GALLERY_HEIGHT,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  slide: { width: SCREEN_WIDTH, height: GALLERY_HEIGHT },
  image: { width: "100%", height: "100%" },
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
  zoomImageContent: { width: "100%", height: "100%" },
  modalControls: {
    position: "absolute",
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    minHeight: 46,
    borderRadius: 23,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  controlText: { color: "#141414", fontWeight: "700", fontSize: 14 },
  closeButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
  },
  modalHint: { position: "absolute", left: 20, right: 20, alignItems: "center", gap: 6 },
  modalPosition: { color: "#141414", backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", paddingHorizontal: 12, paddingVertical: 6, fontSize: 14, fontWeight: "900" },
  modalHintText: { color: "#fff", backgroundColor: "#242024", borderRadius: 12, overflow: "hidden", paddingHorizontal: 10, paddingVertical: 5, fontSize: 12, textAlign: "center" },
});
