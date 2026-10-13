// La API de Supabase devuelve como máximo 1.000 filas por consulta. Un
// minimarket puede tener varios miles de productos: se piden por páginas para
// no perder ninguno (si no, el escáner no encontraría los códigos que quedan
// fuera de las primeras 1.000 filas).
export async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
  page = 1000
): Promise<{ data: T[]; error: { message: string } | null }> {
  const out: T[] = [];
  for (let from = 0; from < 200000; from += page) {
    const { data, error } = await build(from, from + page - 1);
    if (error) return { data: out, error };
    out.push(...(data || []));
    if (!data || data.length < page) break;
  }
  return { data: out, error: null };
}
