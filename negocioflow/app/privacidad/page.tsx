export const metadata = {
  title: "Política de privacidad — NegocioFlow",
};

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-surface px-5 py-10">
      <div className="max-w-2xl mx-auto bg-white border border-line rounded-2xl p-7 sm:p-10">
        <a href="/" className="text-sm text-brand-700 font-medium">
          ← Volver a NegocioFlow
        </a>

        <h1 className="text-2xl font-bold text-ink mt-4 mb-1">Política de privacidad</h1>
        <p className="text-xs text-muted mb-6">Última actualización: 1 de octubre de 2026.</p>

        <div className="text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-lg px-4 py-3 mb-6">
          Este documento es una plantilla general preparada con ayuda de inteligencia artificial para
          un servicio pequeño en etapa inicial. No reemplaza asesoría legal profesional; te recomendamos
          que la revise un abogado antes de considerarla definitiva, especialmente respecto de la Ley
          19.628 sobre Protección de la Vida Privada.
        </div>

        <div className="space-y-6 text-sm text-ink leading-relaxed">
          <section>
            <h2 className="font-semibold mb-1.5">1. Qué datos recopilamos</h2>
            <p>Para que NegocioFlow funcione, guardamos:</p>
            <ul className="list-disc pl-5 mt-1.5 space-y-1">
              <li>Tu correo electrónico, para crear tu cuenta e iniciar sesión.</li>
              <li>
                Los datos de tu negocio que tú ingresas: nombre del negocio, ventas, gastos, productos,
                clientes y proveedores que registres.
              </li>
              <li>
                Si invitas a un vendedor, su correo electrónico, para darle acceso a tu negocio.
              </li>
              <li>
                Si contratas un plan pagado, la confirmación del pago (Flow.cl o Mercado Pago procesan el
                pago directamente; nosotros no vemos ni almacenamos el número de tu tarjeta).
              </li>
            </ul>
            <p className="mt-2">
              No pedimos ni necesitamos datos sensibles (como información de salud) para operar
              NegocioFlow, y no recopilamos intencionalmente datos de menores de edad.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-1.5">2. Para qué usamos tus datos</h2>
            <p>
              Solo para que la aplicación funcione: mostrarte tus ventas, calcular tus reportes, procesar
              tus pagos y darte soporte si lo pides. No vendemos tus datos ni los usamos para publicidad.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-1.5">3. Con quién compartimos datos</h2>
            <p>Usamos estos proveedores (procesadores) para operar el servicio:</p>
            <ul className="list-disc pl-5 mt-1.5 space-y-1">
              <li>
                <strong>Supabase</strong> — aloja la base de datos y gestiona el inicio de sesión.
              </li>
              <li>
                <strong>Vercel</strong> — aloja la aplicación web.
              </li>
              <li>
                <strong>Flow.cl y Mercado Pago</strong> — procesan los pagos de los planes Pro y Plus.
              </li>
            </ul>
            <p className="mt-2">
              No compartimos tus datos con nadie más, salvo que la ley nos obligue a hacerlo.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-1.5">4. Cookies y almacenamiento local</h2>
            <p>
              NegocioFlow no usa cookies de rastreo ni de publicidad, y no usamos herramientas de
              analítica de terceros. Para mantener tu sesión iniciada usamos el almacenamiento local de
              tu navegador (localStorage), que guarda únicamente tu sesión y qué negocio tienes
              seleccionado — no datos de navegación ni de terceros. Por eso no mostramos un banner de
              cookies: no hay nada que requiera tu consentimiento bajo esa categoría.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-1.5">5. Tus derechos</h2>
            <p>
              Puedes pedirnos en cualquier momento: acceder a tus datos, corregirlos, o eliminar tu
              cuenta y toda la información asociada a tu negocio. Para eso, escríbenos a{" "}
              <strong>[COMPLETAR: correo de soporte]</strong> desde el correo con el que creaste tu
              cuenta. Vamos a confirmar la eliminación una vez procesada.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-1.5">6. Seguridad</h2>
            <p>
              Tu negocio solo puede ver sus propios datos: esto se aplica a nivel de base de datos (Row
              Level Security en Supabase), no solo en la pantalla, para que se cumpla siempre, incluso si
              alguien intentara acceder directamente a la API.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-1.5">7. Cambios a esta política</h2>
            <p>
              Si cambiamos esta política de forma importante, lo vas a ver anunciado dentro de la
              aplicación.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
