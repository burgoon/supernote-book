import {FileUtils, PluginFileAPI, PluginManager, PluginNoteAPI} from 'sn-plugin-lib';

export const NOTE_ROOT = '/storage/emulated/0/Note';
export const FILE_READ = 'plugin.permission.FILE:READ';

export type Notebook = {
  path: string;
  name: string;
  folder: string; // relative to the Note folder, '' at the root
  created: number; // ms, from the YYYYMMDD_HHMMSS name; 0 if unnamed that way
  pages: number;
};

export type Page = {
  key: string;
  book: Notebook;
  page: number; // 0-based
  index: number; // position in the whole library
};

const STAMP = /^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/;

export function createdFromName(name: string): number {
  const m = STAMP.exec(name);
  if (!m) {return 0;}
  const [, y, mo, d, h, mi, s] = m.map(Number);
  return new Date(y, mo - 1, d, h, mi, s).getTime();
}

export function bookLabel(b: Notebook): string {
  return b.folder ? `${b.folder}/${b.name}` : b.name;
}

export function dayLabel(ms: number): string {
  if (!ms) {return '';}
  return new Date(ms).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function unwrap<T>(res: any): T | null {
  if (res == null) {return null;}
  if (typeof res === 'object' && 'result' in res) {
    return res.success === false ? null : (res.result as T);
  }
  return res as T;
}

export async function ensureReadPermission(): Promise<boolean> {
  if ((await PluginManager.hasPermission(FILE_READ)) === 1) {return true;}
  const r = await PluginManager.requestPermission(
    FILE_READ,
    'Supernote Book reads the Note folder to list and render your pages.',
  );
  return r === 1 || r === 2;
}

let cacheDir: string | null = null;
const md5s = new Map<string, string>(); // notebook path -> file hash, per scan

const has = (obj: any, fn: string) => typeof obj?.[fn] === 'function';

export function capabilities(): string {
  const report = (name: string, obj: any, fns: string[]) =>
    `${name}: ` + fns.map(f => `${f}${has(obj, f) ? '' : '✗'}`).join(' ');
  return [
    report('FileUtils', FileUtils, ['listFiles', 'getFileList', 'exists', 'makeDir', 'getFileMD5', 'getExternalDirPath']),
    report('PluginFileAPI', PluginFileAPI, ['getNoteTotalPageNum', 'generateNotePng', 'searchFiveStars', 'openFile']),
    report('PluginManager', PluginManager, ['getPluginDirPath', 'hasPermission', 'closePluginView']),
  ].join('\n');
}

type Entry = {path: string; name: string; dir: boolean | null};

let sampleEntry = '';

function toEntry(raw: any, dir: string): Entry | null {
  if (raw == null) {return null;}
  if (typeof raw === 'string') {
    const path = raw.startsWith('/') ? raw : `${dir}/${raw}`;
    return {path, name: path.slice(path.lastIndexOf('/') + 1), dir: null};
  }
  if (typeof raw === 'object') {
    if (!sampleEntry) {sampleEntry = JSON.stringify(raw).slice(0, 300);}
    const p = raw.path ?? raw.filePath ?? raw.absolutePath ?? raw.uri ?? raw.fullPath ?? raw.name ?? raw.fileName;
    if (typeof p !== 'string') {return null;}
    const path = p.startsWith('/') ? p : `${dir}/${p}`;
    const d = raw.isDirectory ?? raw.isDir ?? raw.directory ?? raw.isFolder;
    return {path, name: path.slice(path.lastIndexOf('/') + 1), dir: typeof d === 'boolean' ? d : null};
  }
  return null;
}

async function walk(dir: string, out: string[]): Promise<void> {
  const raw = (await FileUtils.listFiles(dir)) as any;
  const list: any[] = Array.isArray(raw) ? raw : raw && Array.isArray(raw.result) ? raw.result : [];
  for (const item of list) {
    const e = toEntry(item, dir);
    if (!e || e.name.startsWith('.')) {continue;}
    const isNote = e.name.toLowerCase().endsWith('.note');
    if (isNote) {out.push(e.path);}
    else if (e.dir === true || (e.dir === null && !e.name.includes('.'))) {await walk(e.path, out);}
  }
}

async function noteFiles(root: string): Promise<string[]> {
  if (has(FileUtils, 'listFiles')) {
    const out: string[] = [];
    await walk(root, out);
    return out;
  }
  if (has(FileUtils, 'getFileList')) {
    const all = (await FileUtils.getFileList(['note'])) || [];
    return all.filter(p => p.startsWith(root + '/'));
  }
  throw new Error('no file listing API available\n' + capabilities());
}

export async function scanLibrary(root = NOTE_ROOT): Promise<Page[]> {
  // The open note may have unsaved ink; flush it so its file (and hash) is current.
  try {
    await PluginNoteAPI.saveCurrentNote();
  } catch {}
  md5s.clear();
  const files = await noteFiles(root);
  const books: Notebook[] = [];
  for (const path of files) {
    const name = path.slice(path.lastIndexOf('/') + 1).replace(/\.note$/i, '');
    const rel = path.startsWith(root + '/') ? path.slice(root.length + 1) : path;
    const folder = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '';
    let pages = 0;
    try {
      pages = unwrap<number>(await PluginFileAPI.getNoteTotalPageNum(path)) || 0;
    } catch (e: any) {
      throw new Error(`getNoteTotalPageNum failed for ${name}: ${e?.message || e}`);
    }
    if (pages > 0) {
      books.push({path, name, folder, created: createdFromName(name), pages});
    }
  }
  books.sort((a, b) => a.created - b.created || a.name.localeCompare(b.name));
  const pages: Page[] = [];
  for (const book of books) {
    for (let p = 0; p < book.pages; p++) {
      pages.push({key: `${book.path}#${p}`, book, page: p, index: pages.length});
    }
  }
  if (!pages.length) {
    throw new Error(`no notebooks found under ${root} (${files.length} files listed)\nsample entry: ${sampleEntry || 'n/a'}\n` + capabilities());
  }
  return pages;
}

async function cacheRoot(): Promise<string> {
  if (cacheDir) {return cacheDir;}
  const base = (await PluginManager.getPluginDirPath()) || '/data/local/tmp';
  cacheDir = `${base}/cache`;
  await FileUtils.makeDir(cacheDir);
  return cacheDir;
}

async function bookHash(book: Notebook): Promise<string> {
  let h = md5s.get(book.path);
  if (!h) {
    h = await FileUtils.getFileMD5(book.path);
    md5s.set(book.path, h);
  }
  return h;
}

export async function renderPage(page: Page, scale = 1): Promise<string | null> {
  const dir = await cacheRoot();
  const png = `${dir}/${await bookHash(page.book)}_${page.page}_${scale}.png`;
  if (!(await FileUtils.exists(png))) {
    const ok = unwrap<boolean>(
      await PluginFileAPI.generateNotePng({
        notePath: page.book.path,
        page: page.page,
        times: scale,
        pngPath: png,
        type: 1,
      }),
    );
    if (!ok) {return null;}
  }
  return `file://${png}`;
}

export async function starredPages(pages: Page[]): Promise<Page[]> {
  const out: Page[] = [];
  const seen = new Set<string>();
  for (const p of pages) {
    if (seen.has(p.book.path)) {continue;}
    seen.add(p.book.path);
    const stars = unwrap<number[]>(await PluginFileAPI.searchFiveStars(p.book.path)) || [];
    for (const n of stars) {
      const hit = pages.find(q => q.book.path === p.book.path && q.page === n);
      if (hit) {out.push(hit);}
    }
  }
  return out;
}

export async function openPage(page: Page): Promise<void> {
  await PluginFileAPI.openFile(page.book.path, page.page);
  await PluginManager.closePluginView();
}
