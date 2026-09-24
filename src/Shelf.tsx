import React from 'react';
import {FlatList, Pressable, StyleSheet, Text, View} from 'react-native';

export type Row = {key: string; left: string; middle: string; right: string; index: number};

type Props = {rows: Row[]; onPick: (index: number) => void; empty: string};

const Separator = () => <View style={styles.sep} />;

export default function Shelf({rows, onPick, empty}: Props) {
  if (!rows.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{empty}</Text>
      </View>
    );
  }
  return (
    <FlatList
      data={rows}
      keyExtractor={r => r.key}
      renderItem={({item}) => (
        <Pressable style={styles.row} onPress={() => onPick(item.index)}>
          <Text style={styles.left}>{item.left}</Text>
          <Text style={styles.middle} numberOfLines={1}>
            {item.middle}
          </Text>
          <Text style={styles.right}>{item.right}</Text>
        </Pressable>
      )}
      ItemSeparatorComponent={Separator}
    />
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16},
  left: {width: 200, fontSize: 16, color: '#000'},
  middle: {flex: 1, fontSize: 16, color: '#000'},
  right: {width: 56, textAlign: 'right', fontSize: 14, color: '#444'},
  sep: {height: 1, backgroundColor: '#000', opacity: 0.2},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  muted: {color: '#666', fontSize: 16},
});
