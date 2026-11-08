import React, { PropsWithChildren, createContext, useContext, useEffect, useId, useRef } from "react";
import { AccessibilityInfo, Animated, Easing, useWindowDimensions, View, ViewStyle } from "react-native";

import { ClipPath, Defs, G, Path, PathProps, Rect, RectProps } from "react-native-svg";

const GraphProgress = createContext<Animated.Value | undefined>(undefined);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

// Check native screen coordinates so graphs below the fold wait until visible.
export function GraphReveal({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  const host = useRef<React.ComponentRef<typeof View>>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const shown = useRef(false);
  const { height: screenHeight } = useWindowDimensions();
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | undefined;
    let animation: Animated.CompositeAnimation | undefined;
    const finish = () => { shown.current = true; if (timer) clearInterval(timer); progress.setValue(1); };
    const check = () => host.current?.measureInWindow((_x, y, width, height) => {
      if (!active || shown.current || width <= 0 || height <= 0) return;
      if (y < screenHeight - Math.min(height * 0.15, 40) && y + height > 0) {
        shown.current = true;
        if (timer) clearInterval(timer);
        animation = Animated.timing(progress, { toValue: 1, duration: 1900, easing: Easing.out(Easing.cubic), useNativeDriver: false });
        animation.start();
      }
    });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (reduce) => { if (active && reduce) { animation?.stop(); finish(); } });
    if (!shown.current) void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!active) return;
      if (reduce) finish();
      else { check(); timer = setInterval(check, 200); }
    }).catch(() => { if (active) finish(); });
    return () => { active = false; if (timer) clearInterval(timer); animation?.stop(); subscription.remove(); };
  }, [progress, screenHeight]);
  return <View ref={host} collapsable={false} style={style}>
    <GraphProgress.Provider value={progress}>
    <Animated.View style={{ opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>{children}</Animated.View>
    </GraphProgress.Provider>
  </View>;
}

// Reveal paths from left to right while keeping their final geometry intact.
export function DrawingPath(props: PathProps) {
  const progress = useContext(GraphProgress);
  const id = `graph-draw-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  if (!progress) return <Path {...props} />;
  return <G>
    <Defs><ClipPath id={id}><AnimatedRect x={0} y={0} width={progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] })} height="100%" /></ClipPath></Defs>
    <G clipPath={`url(#${id})`}><Path {...props} /></G>
  </G>;
}

// Grow vertical bars from their baseline, without changing the chart layout.
export function GrowingBar(props: RectProps) {
  const progress = useContext(GraphProgress);
  const y = Number(props.y ?? 0), height = Number(props.height);
  if (!progress || !Number.isFinite(y) || !Number.isFinite(height)) return <Rect {...props} />;
  return <AnimatedRect {...props} y={progress.interpolate({ inputRange: [0, 1], outputRange: [y + height, y] })}
    height={progress.interpolate({ inputRange: [0, 1], outputRange: [0, height] })} />;
}
