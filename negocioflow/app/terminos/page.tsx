export const metadata = {
  title: "Términos de servicio — NegocioFlow",
};

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-surface px-5 py-10">
      <div className="max-w-2xl mx-auto bg-white border border-line rounded-2xl p-7 sm:p-10">
        <a href="/" className="text-sm text-brand-700 font-medium">
          ← Volver a NegocioFlow
        </a>

        <h1 className="text-2xl font-bold text-ink mt-4 mb-1">Términos de servicio</h1>
        <p className="text-xs text-muted mb-6">Última actualización: 1 de octubre de 2026.</p>

        <div className="text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-lg px-4 py-3 mb-6">
          Este documento es una plantilla general preparada con ayuda de inteligencia artificial para
          un servicio pequeño en etapa inicial. No reemplaza asesoría legal profesional. Antes de
          considerarlo definitivo, te recomendamos que lo revise un abogado, especialmente en lo
          relativo a la Ley de Protección al Consumidor (Ley 19.496) y otras normas chilenas aplicables
          a tu negocio.
        </div>

        <div className="space-y-6 text-sm text-ink leading-relaxed">
          <section>
            <h2 className="font-semibold mb-1.5">1. Quiénes somos</h2>
            <p>
              NegocioFlow es un servicio operado por <strong>[COMPLETAR: nombre completo y RUT del
              responsable]</strong>, con domicilio en <strong>Temuco, Chile</strong> y contacto
              en <strong>carlosbaumert63@gmail.com</strong>. Si tienes dudas sobre estos términos,
              puedes escribir a ese correo.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-1.5">2. Qué es NegocioFlow</h2>
            <p>
              NegocioFlow es una herramienta de gestión (ventas, gastos, inventario, reportes) pensada
              para pequeños negocios en Chile. No es un servicio de contabilidad ni de asesoría
              tributaria, y no reemplaza a un contador.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-1.5">3. Cuenta y uso aceptable</h2>
            <p>
              Para usar NegocioFlow necesitas crear una cuenta con un correo válido. Eres responsable de
              la actividad que ocurra con tu cuenta y de mantener tu contraseña segura. El servicio está
              dirigido a negocios y personas mayores de 18 años; no está diseñado ni dirigido a menores
              de edad, y no solicitamos intencionalmente datos de menores.
            </p>
            <p className="mt-2">
              Si invitas a alguien a tu negocio como "vendedor", esa persona solo puede ver y usar lo que
              tú le permitas (ventas, productos, caja diaria); tú sigues siendo responsable de su acceso.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-1.5">4. Planes y pagos</h2>
            <p>
              NegocioFlow tiene un plan Free gratuito y planes pagados Pro y Plus, con cobro mensual o
              anual según elijas. Los pagos se procesan a través de Flow.cl o Mercado Pago; nosotros no
              almacenamos los datos de tu tarjeta.
            </p>
            <p className="mt-2">
              <strong>Los planes pagados no se renuevan automáticamente.</strong> Pagas por un período
              (30 o 365 días) y, si no vuelves a pagar antes de que termine, tu negocio simplemente vuelve
              al plan Free al vencer ese período — conservas tus datos. No hay cargos recurrentes
              automáticos ni es necesario "cancelar" nada: basta con no renovar.
            </p>
            <p className="mt-2">
              Por tratarse de un servicio digital de uso inmediato, en general no ofrecemos reembolsos
              por períodos ya pagados y parcialmente usados, salvo que la ley aplicable indique lo
              contrario. Si tuviste un problema con un cobro, escríbenos a{" "}
              <strong>carlosbaumert63@gmail.com</strong> y lo revisamos caso a caso.
            </p>
            <p className="mt-2 text-muted">
              Los precios se muestran en pesos chilenos (CLP). Estamos confirmando con nuestro contador
              si corresponde desglosar IVA sobre estos valores; si eso cambia, lo vas a ver reflejado
              claramente en el precio antes de pagar, nunca como un cobro agregado después.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-1.5">5. Boletas y comprobantes</h2>
            <p>
              El "comprobante" en PDF que puedes generar por cada venta es un documento interno de
              NegocioFlow y <strong>no es una boleta ni factura electrónica ante el SII</strong>. La
              emisión real de boletas electrónicas no está disponible todavía; si la activamos en el
              futuro, lo vas a ver anunciado claramente antes de usarla.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-1.5">6. Tus datos</h2>
            <p>
              Los datos de ventas, gastos, productos y clientes que registras son tuyos. Puedes pedir una
              copia o la eliminación de tu cuenta y datos en cualquier momento — ver nuestra{" "}
              <a href="/privacidad" className="text-brand-700 font-medium">
                Política de Privacidad
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-1.5">7. Disponibilidad y límites de responsabilidad</h2>
            <p>
              Hacemos un esfuerzo razonable para mantener NegocioFlow disponible y funcionando
              correctamente, pero no garantizamos que esté libre de errores o interrupciones en todo
              momento. NegocioFlow no reemplaza el criterio del dueño del negocio ni a un contador: las
              cifras que mostramos dependen de los datos que tú ingresas.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-1.5">8. Cambios a estos términos</h2>
            <p>
              Podemos actualizar estos términos a medida que el servicio cambie. Si hacemos un cambio
              importante, lo vas a ver anunciado dentro de la aplicación.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-1.5">9. Ley aplicable</h2>
            <p>Estos términos se rigen por las leyes de la República de Chile.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
