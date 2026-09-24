import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {bookLabel, dayLabel, openPage, renderPage, type Page} from './library';

type Props = {pages: Page[]; start: number; onIndex: (i: number) => void};

function Leaf({page, width, height, total}: {page: Page; width: number; height: number; total: number}) {
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    renderPage(page).then(u => live && setUri(u));
    return () => {
      live = false;
    };
  }, [page]);
  return (
    <Pressable style={{width, height}} onPress={() => openPage(page)}>
      <View style={styles.leaf}>
        {uri ? (
          <Image source={{uri}} style={styles.image} resizeMode="contain" />
        ) : (
          <Text style={styles.muted}>rendering…</Text>
        )}
      </View>
      <Text style={styles.caption}>
        {dayLabel(page.book.created) || bookLabel(page.book)}
        {'  ·  '}
        {bookLabel(page.book)}
        {'  ·  '}p{page.page + 1}/{page.book.pages}
        {'  ·  '}
        {page.index + 1}/{total}
      </Text>
    </Pressable>
  );
}

export default function Book({pages, start, onIndex}: Props) {
  const {width, height} = Dimensions.get('window');
  const leafH = height - 56;
  const list = useRef<FlatList<Page>>(null);
  const [index, setIndex] = useState(start);

  const goto = useCallback(
    (i: number) => {
      const j = Math.max(0, Math.min(pages.length - 1, i));
      list.current?.scrollToIndex({index: j, animated: false});
      setIndex(j);
      onIndex(j);
    },
    [pages.length, onIndex],
  );

  useEffect(() => {
    if (start !== index) {
      list.current?.scrollToIndex({index: start, animated: false});
      setIndex(start);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start]);

  const onMomentumEnd = (e: any) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) {
      setIndex(i);
      onIndex(i);
    }
  };

  if (!pages.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>No notebooks found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <FlatList
        ref={list}
        data={pages}
        horizontal
        pagingEnabled
        initialScrollIndex={start}
        getItemLayout={(_, i) => ({length: width, offset: width * i, index: i})}
        keyExtractor={p => p.key}
        renderItem={({item}) => <Leaf page={item} width={width} height={leafH} total={pages.length} />}
        onMomentumScrollEnd={onMomentumEnd}
        windowSize={3}
        maxToRenderPerBatch={2}
        initialNumToRender={1}
        removeClippedSubviews
        showsHorizontalScrollIndicator={false}
      />
      <View style={styles.bar}>
        <Pressable style={styles.btn} onPress={() => goto(index - 1)}>
          <Text style={styles.btnText}>‹</Text>
        </Pressable>
        <Text style={styles.counter}>
          {index + 1} / {pages.length}
        </Text>
        <Pressable style={styles.btn} onPress={() => goto(index + 1)}>
          <Text style={styles.btnText}>›</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {flex: 1},
  leaf: {flex: 1, margin: 8, borderWidth: 1, borderColor: '#000', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center'},
  image: {width: '100%', height: '100%'},
  caption: {textAlign: 'center', fontSize: 14, color: '#000', paddingBottom: 4},
  muted: {color: '#666', fontSize: 16},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  bar: {height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderColor: '#000', paddingHorizontal: 8},
  btn: {width: 72, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#000'},
  btnText: {fontSize: 28, color: '#000', lineHeight: 32},
  counter: {fontSize: 16, color: '#000'},
});
