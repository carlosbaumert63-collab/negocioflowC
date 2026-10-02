// localStorage puede lanzar una excepción (Safari con cookies bloqueadas,
// modo privado estricto, iframes). Estas funciones nunca rompen la app.
export const safeStorage = {
  get(key: string): string | null {
    try {
      return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(key, value);
    } catch {
      // ignorar
    }
  },
  remove(key: string): void {
    try {
      if (typeof window !== "undefined") window.localStorage.removeItem(key);
    } catch {
      // ignorar
    }
  },
};
