/**
 * PIN admin untuk layar Pengaturan.
 *
 * Ini penghalang buat pemain di meja, BUKAN keamanan: app ini statis tanpa
 * backend, jadi PIN ikut terkirim ke browser dan siapa pun yang membuka
 * DevTools bisa membacanya. Cukup untuk tujuannya (mencegah pemain iseng
 * mengubah kalimat TTS). Jangan pernah dipakai untuk melindungi data sungguhan.
 */
export const ADMIN_PIN = "0000";
export const ADMIN_PIN_LENGTH = ADMIN_PIN.length;

export function isAdminPin(input: string): boolean {
  return input === ADMIN_PIN;
}
