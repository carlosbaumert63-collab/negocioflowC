"use client";
import React from "react";
import { Lock } from "lucide-react";
import { usePlan } from "./PlanContext";

// A diferencia de ProGate (plan Free vs Pro), esto es sobre el ROL dentro del
// negocio: algunas secciones (gastos, compras, proveedores, flujo de caja,
// reportes, equipo) son solo para el dueño, nunca para un vendedor invitado.
export default function OwnerGate({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { isOwner } = usePlan();

  if (isOwner) return <>{children}</>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Lock size={16} className="text-muted" />
        <h1 className="text-xl font-bold">{title}</h1>
      </div>
      <div className="bg-white border border-line rounded-xl p-5 max-w-lg text-sm text-muted">
        Esta sección es solo para el dueño del negocio.
      </div>
    </div>
  );
}
