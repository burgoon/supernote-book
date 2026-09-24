import React, {useCallback, useEffect, useState} from 'react';
import {Pressable, StatusBar, StyleSheet, Text, View} from 'react-native';
import {PluginCommAPI, PluginManager} from 'sn-plugin-lib';
import Book from './src/Book';
import Shelf, {type Row} from './src/Shelf';
import {bookLabel, capabilities, dayLabel, ensureReadPermission, scanLibrary, starredPages, type Page} from './src/library';

type Tab = 'book' | 'shelf' | 'starred';

function notebookRows(pages: Page[]): Row[] {
  const rows: Row[] = [];
  for (const p of pages) {
    if (p.page === 0) {
      rows.push({key: p.book.path, left: dayLabel(p.book.created) || '—', middle: bookLabel(p.book), right: `${p.book.pages}p`, index: p.index});
    }
  }
  return rows.reverse();
}

function starredRows(pages: Page[]): Row[] {
  return pages.map(p => ({key: p.key, left: dayLabel(p.book.created) || '—', middle: bookLabel(p.book), right: `p${p.page + 1}`, index: p.index}));
}

async function currentNotePath(): Promise<string | null> {
  try {
    const r: any = await PluginCommAPI.getCurrentFilePath();
    const v = r && typeof r === 'object' && 'result' in r ? r.result : r;
    return typeof v === 'string' ? v : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [pages, setPages] = useState<Page[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('book');
  const [index, setIndex] = useState(0);
  const [starred, setStarred] = useState<Page[]>([]);

  const load = useCallback(async () => {
    setPages(null);
    setError(null);
    try {
      if (!(await ensureReadPermission())) {
        setError('Permission to read the Note folder is required.');
        return;
      }
      const lib = await scanLibrary();
      const here = await currentNotePath();
      const at = here ? lib.find(p => p.book.path === here) : undefined;
      setIndex(at ? at.index : Math.max(0, lib.length - 1));
      setPages(lib);
      starredPages(lib).then(setStarred);
    } catch (e: any) {
      const where = String(e?.stack || '').split('\n').slice(0, 3).join('\n');
      setError(`${e?.message || e}\n\n${where}\n\n${capabilities()}`);
    }
  }, []);

  useEffect(() => {
    load();
    // life events arrive as onMsg(type); 2 = start (the view was shown again)
    let sub: {remove: () => void} | null = null;
    try {
      sub = PluginManager.registerPluginLifeListener({
        onMsg: (msg: any) => {
          const type = typeof msg === 'object' && msg ? msg.type ?? msg.data : msg;
          if (Number(type) === 2) {load();}
        },
      });
    } catch {}
    return () => sub?.remove();
  }, [load]);

  const jump = (i: number) => {
    setIndex(i);
    setTab('book');
  };

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <View style={styles.nav}>
        {(['book', 'shelf', 'starred'] as Tab[]).map(t => (
          <Pressable key={t} style={[styles.tab, tab === t && styles.tabOn]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>
              {t === 'book' ? 'Book' : t === 'shelf' ? 'Notebooks' : `Starred${starred.length ? ` ${starred.length}` : ''}`}
            </Text>
          </Pressable>
        ))}
        <View style={styles.fill} />
        <Pressable style={styles.tab} onPress={load}>
          <Text style={styles.tabText}>↻</Text>
        </Pressable>
        <Pressable style={styles.tab} onPress={() => PluginManager.closePluginView()}>
          <Text style={styles.tabText}>✕</Text>
        </Pressable>
      </View>
      {error ? (
        <View style={styles.center}>
          <Text style={styles.msg}>{error}</Text>
          <Pressable style={styles.tab} onPress={load}>
            <Text style={styles.tabText}>Try again</Text>
          </Pressable>
        </View>
      ) : pages === null ? (
        <View style={styles.center}>
          <Text style={styles.msg}>Reading the Note folder…</Text>
        </View>
      ) : tab === 'book' ? (
        <Book key={pages.length} pages={pages} start={index} onIndex={setIndex} />
      ) : tab === 'shelf' ? (
        <Shelf rows={notebookRows(pages)} onPick={jump} empty="No notebooks." />
      ) : (
        <Shelf rows={starredRows(starred)} onPick={jump} empty="No starred pages." />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#fff'},
  fill: {flex: 1},
  nav: {flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#000', paddingHorizontal: 8},
  tab: {paddingHorizontal: 16, paddingVertical: 12, minHeight: 48, justifyContent: 'center'},
  tabOn: {borderBottomWidth: 3, borderColor: '#000'},
  tabText: {fontSize: 17, color: '#000'},
  tabTextOn: {fontWeight: '700'},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16},
  msg: {fontSize: 15, color: '#000', textAlign: 'left', paddingHorizontal: 24, fontFamily: 'monospace'},
});
