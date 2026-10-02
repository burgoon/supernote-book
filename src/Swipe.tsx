import React, {useRef} from 'react';
import {StyleSheet, View} from 'react-native';

type Props = {children: React.ReactNode; onLeft: () => void; onRight: () => void};

// Two-finger horizontal swipe. One-finger gestures pass through untouched so
// the book's own paging and the lists' scrolling keep working.
export default function Swipe({children, onLeft, onRight}: Props) {
  const startX = useRef<number | null>(null);
  const two = (e: any) => (e.nativeEvent.touches?.length ?? 0) >= 2;
  const x = (e: any) => {
    const t = e.nativeEvent.touches;
    return t && t.length ? t.reduce((s: number, p: any) => s + p.pageX, 0) / t.length : e.nativeEvent.pageX;
  };
  return (
    <View
      style={styles.fill}
      onStartShouldSetResponderCapture={two}
      onMoveShouldSetResponderCapture={e => two(e) && startX.current === null}
      onResponderGrant={e => {
        startX.current = x(e);
      }}
      onResponderMove={e => {
        if (startX.current === null) {
          startX.current = x(e);
        }
      }}
      onResponderRelease={e => {
        const from = startX.current;
        startX.current = null;
        if (from === null) {
          return;
        }
        const dx = (e.nativeEvent.changedTouches?.[0]?.pageX ?? e.nativeEvent.pageX) - from;
        if (dx <= -60) {
          onLeft();
        } else if (dx >= 60) {
          onRight();
        }
      }}
      onResponderTerminate={() => {
        startX.current = null;
      }}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({fill: {flex: 1}});
