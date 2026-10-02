import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, StatusBar, StyleSheet, Text, View} from 'react-native';
import {PluginCommAPI, PluginManager} from 'sn-plugin-lib';
import Book from './src/Book';
import Shelf, {type Row} from './src/Shelf';
import Swipe from './src/Swipe';
import {
  bookLabel,
  buildPages,
  capabilities,
  dayLabel,
  ensureReadPermission,
  listingSample,
  orderBooks,
  scanLibrary,
  starredPages,
  type Notebook,
  type Page,
  type Sort,
  type SortKey,
} from './src/library';

type Tab = 'book' | 'shelf' | 'starred';
const TABS: Tab[] = ['book', 'shelf', 'starred'];
const SORTS: {key: SortKey; label: string}[] = [
  {key: 'created', label: 'Created'},
  {key: 'name', label: 'Name'},
];

function notebookRows(pages: Page[]): Row[] {
  const rows: Row[] = [];
  for (const p of pages) {
    if (p.page === 0) {
      rows.push({key: p.book.path, left: dayLabel(p.book.created) || '—', middle: bookLabel(p.book), right: `${p.book.pages}p`, index: p.index});
    }
  }
  return rows; // the same order as the book
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
  const [books, setBooks] = useState<Notebook[] | null>(null);
  const [sort, setSort] = useState<Sort>({key: 'created', dir: 'asc'});
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('book');
  const [index, setIndex] = useState(0);
  const [starred, setStarred] = useState<Page[]>([]);
  const [info, setInfo] = useState(false);
  const pages = useMemo(() => (books ? buildPages(orderBooks(books, sort)) : null), [books, sort]);

  const load = useCallback(async () => {
    setBooks(null);
    setError(null);
    try {
      if (!(await ensureReadPermission())) {
        setError('Permission to read the Note folder is required.');
        return;
      }
      const lib = await scanLibrary();
      const ordered = buildPages(orderBooks(lib, sort));
      const here = await currentNotePath();
      const at = here ? ordered.find(p => p.book.path === here) : undefined;
      setIndex(at ? at.index : Math.max(0, ordered.length - 1));
      setBooks(lib);
      starredPages(ordered).then(setStarred);
    } catch (e: any) {
      const where = String(e?.stack || '').split('\n').slice(0, 3).join('\n');
      setError(`${e?.message || e}\n\n${where}\n\n${capabilities()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeSort = (key: SortKey) => {
    const next: Sort = key === sort.key ? {key, dir: sort.dir === 'asc' ? 'desc' : 'asc'} : {key, dir: 'asc'};
    const current = pages?.[index];
    setSort(next);
    if (books && current) {
      // keep the same page in view; only its position in the book changes
      const re = buildPages(orderBooks(books, next));
      const same = re.find(p => p.key === current.key);
      setIndex(same ? same.index : 0);
      starredPages(re).then(setStarred);
    }
  };

  const step = (d: 1 | -1) => {
    const i = TABS.indexOf(tab) + d;
    if (i >= 0 && i < TABS.length) {
      setTab(TABS[i]);
    }
  };

  useEffect(() => {
    load();
    // Every return to the view goes through the toolbar button, so that is
    // the reliable "we're visible again" signal; the life event is a bonus.
    const subs: {remove: () => void}[] = [];
    try {
      subs.push(PluginManager.registerButtonListener({onButtonPress: () => load()}));
      subs.push(
        PluginManager.registerPluginLifeListener({
          onMsg: (msg: any) => {
            const type = typeof msg === 'object' && msg ? msg.type ?? msg.data : msg;
            if (Number(type) === 2) {load();}
          },
        }),
      );
    } catch {}
    return () => subs.forEach(s => s.remove());
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
        <Pressable style={styles.tab} onPress={load} onLongPress={() => setInfo(true)}>
          <Text style={styles.tabText}>↻</Text>
        </Pressable>
        <Pressable style={styles.tab} onPress={() => PluginManager.closePluginView()}>
          <Text style={styles.tabText}>✕</Text>
        </Pressable>
      </View>
      {info ? (
        <View style={styles.center}>
          <Text style={styles.msg}>
            {`notebooks: ${books?.length ?? 0}   pages: ${pages?.length ?? 0}\n\nlisting entry:\n${listingSample()}\n\n${capabilities()}`}
          </Text>
          <Pressable style={styles.tab} onPress={() => setInfo(false)}>
            <Text style={styles.tabText}>Close</Text>
          </Pressable>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.msg}>{error}</Text>
          <Pressable style={styles.tab} onPress={load}>
            <Text style={styles.tabText}>Try again</Text>
          </Pressable>
        </View>
      ) : pages === null || books === null ? (
        <View style={styles.center}>
          <Text style={styles.msg}>Reading the Note folder…</Text>
        </View>
      ) : (
        <Swipe onLeft={() => step(1)} onRight={() => step(-1)}>
          {tab === 'book' ? (
            <Book key={`${sort.key}:${sort.dir}:${pages.length}`} pages={pages} start={index} onIndex={setIndex} />
          ) : tab === 'shelf' ? (
            <View style={styles.fill}>
              <View style={styles.sortRow}>
                {SORTS.map(s => (
                  <Pressable key={s.key} style={[styles.chip, sort.key === s.key && styles.chipOn]} onPress={() => changeSort(s.key)}>
                    <Text style={[styles.chipText, sort.key === s.key && styles.chipTextOn]}>
                      {s.label}
                      {sort.key === s.key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Shelf rows={notebookRows(pages)} onPick={jump} empty="No notebooks." />
            </View>
          ) : (
            <Shelf rows={starredRows(starred)} onPick={jump} empty="No starred pages." />
          )}
        </Swipe>
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
  sortRow: {flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#000'},
  chip: {paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#000', borderRadius: 999},
  chipOn: {backgroundColor: '#000'},
  chipText: {fontSize: 15, color: '#000'},
  chipTextOn: {color: '#fff'},
});
