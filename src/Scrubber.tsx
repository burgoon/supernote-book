import React, {useRef, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {dayLabel, type Page} from './library';

type Props = {pages: Page[]; index: number; onJump: (i: number) => void};

// Tap or drag along the track to jump anywhere in the book. The label shows
// where you'd land; the jump happens on release so e-ink isn't hammered.
export default function Scrubber({pages, index, onJump}: Props) {
  const width = useRef(1);
  const [preview, setPreview] = useState<number | null>(null);
  const last = pages.length - 1;
  const at = (x: number) => Math.max(0, Math.min(last, Math.round((x / width.current) * last)));
  const shown = preview ?? index;
  const page = pages[shown];

  return (
    <View
      style={styles.wrap}
      onLayout={e => {
        width.current = Math.max(1, e.nativeEvent.layout.width);
      }}
      onTouchStart={e => setPreview(at(e.nativeEvent.locationX))}
      onTouchMove={e => setPreview(at(e.nativeEvent.locationX))}
      onTouchEnd={e => {
        const i = at(e.nativeEvent.locationX);
        setPreview(null);
        if (i !== index) {
          onJump(i);
        }
      }}>
      <Text style={styles.label} numberOfLines={1}>
        {shown + 1} / {pages.length}
        {page ? `  ·  ${dayLabel(page.book.created) || page.book.name}` : ''}
      </Text>
      <View style={styles.track}>
        <View style={[styles.mark, {left: `${(shown / Math.max(1, last)) * 100}%`}]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {flex: 1, height: 60, justifyContent: 'center'},
  label: {fontSize: 13, color: '#000', textAlign: 'center', marginBottom: 6},
  track: {height: 3, backgroundColor: '#000', marginHorizontal: 8},
  mark: {position: 'absolute', top: -9, marginLeft: -3, width: 6, height: 21, backgroundColor: '#000'},
});
