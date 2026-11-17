/**
 * Minta browser memperlakukan data situs ini sebagai "persistent" supaya tidak
 * ikut dibersihkan saat memori HP penuh. Tidak ada jaminan (Safari tetap bisa
 * menghapus data situs yang lama tidak dibuka kalau tidak di-install ke home
 * screen), makanya riwayat juga punya export JSON.
 *
 * Aman dipanggil berkali-kali dan di mana saja: kalau API tidak ada, diam.
 */
export function requestPersistentStorage(): void {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return;

  const ask = () => navigator.storage.persist().catch(() => false);

  if (navigator.storage.persisted) {
    navigator.storage
      .persisted()
      .then((already) => (already ? true : ask()))
      .catch(() => false);
    return;
  }

  void ask();
}

/** Unduh teks sebagai berkas. Hanya jalan di browser. */
export function downloadTextFile(fileName: string, text: string, mime = "application/json"): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
