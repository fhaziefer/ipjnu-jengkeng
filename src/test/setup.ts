/**
 * zustand `persist` membaca `window.localStorage` saat store dibuat. Node
 * tidak punya keduanya, jadi disediakan versi memori supaya tes memakai jalur
 * persist yang sama dengan browser.
 */
class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(index: number) {
    return Array.from(this.data.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

Object.defineProperty(globalThis, "localStorage", {
  value: new MemoryStorage(),
  configurable: true,
});

Object.defineProperty(globalThis, "window", {
  value: globalThis,
  configurable: true,
});
