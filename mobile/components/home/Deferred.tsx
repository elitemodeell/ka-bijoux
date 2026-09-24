import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { View, useWindowDimensions } from 'react-native';

export const HomeScrollContext = createContext(0);

/** Mount media just before it enters the viewport, and keep it mounted afterwards. */
export function Deferred({ children, minHeight }: { children: ReactNode; minHeight: number }) {
  const scrollY = useContext(HomeScrollContext);
  const { height } = useWindowDimensions();
  const ref = useRef<View>(null);
  const [visible, setVisible] = useState(false);
  const checkVisibility = () => ref.current?.measureInWindow((_x, y) => {
    if (y < height + 180) setVisible(true);
  });
  useEffect(() => { if (!visible) checkVisibility(); }, [scrollY, height, visible]);
  return <View ref={ref} collapsable={false} onLayout={checkVisibility} style={!visible ? { minHeight } : undefined}>
    {visible ? children : null}
  </View>;
}
