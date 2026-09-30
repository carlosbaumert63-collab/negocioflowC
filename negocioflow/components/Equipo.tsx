"use client";
import React, { useEffect, useState } from "react";
import { UserPlus, Trash2, Users } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import type { Business, BusinessMember } from "../lib/types";
import OwnerGate from "./OwnerGate";

function EquipoInner({ business }: { business: Business }) {
  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("business_members")
      .select("*")
      .eq("business_id", business.id)
      .order("created_at");
    setMembers((data as BusinessMember[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.id]);

  async function invite() {
    if (!email.trim()) return setError("Ingresa un correo.");
    setInviting(true);
    setError("");
    setMessage("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({ businessId: business.id, email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo invitar.");
      } else {
        setMessage(`Se invitó a ${email.trim()}. Le llegará un correo para crear su clave de acceso.`);
        setEmail("");
        load();
      }
    } catch (err: any) {
      setError(err.message || "Error inesperado.");
    } finally {
      setInviting(false);
    }
  }

  async function removeMember(userId: string) {
    if (!confirm("¿Quitar a esta persona del equipo?")) return;
    await supabase.from("business_members").delete().eq("business_id", business.id).eq("user_id", userId);
    load();
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Equipo</h1>
      <p className="text-sm text-muted mb-6">
        Invita a alguien como <strong>vendedor</strong>: puede registrar ventas, ver productos y operar la caja, pero
        no ve gastos, compras, proveedores, reportes ni la facturación del plan.
      </p>

      <div className="bg-white border border-line rounded-xl p-5 max-w-md mb-8">
        <div className="flex items-center gap-2 text-sm font-semibold mb-3">
          <UserPlus size={16} /> Invitar por correo
        </div>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            className="flex-1 px-3 py-2 border border-line rounded-lg text-sm"
          />
          <button
            onClick={invite}
            disabled={inviting}
            className="bg-brand-500 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60"
          >
            {inviting ? "Invitando…" : "Invitar"}
          </button>
        </div>
        {error && <div className="text-sm text-red-600 mt-3">{error}</div>}
        {message && <div className="text-sm text-brand-600 mt-3">{message}</div>}
      </div>

      <div className="flex items-center gap-2 text-sm font-semibold text-muted mb-3">
        <Users size={14} /> Equipo actual
      </div>
      {loading ? (
        <div className="text-sm text-muted py-6 text-center">Cargando…</div>
      ) : members.length === 0 ? (
        <div className="text-sm text-muted py-8 text-center border border-dashed border-line rounded-xl">
          Todavía no has invitado a nadie. Por ahora solo tú tienes acceso.
        </div>
      ) : (
        <div className="bg-white border border-line rounded-xl overflow-hidden max-w-md">
          {members.map((m) => (
            <div
              key={m.user_id}
              className="flex items-center justify-between px-4 py-3 border-b border-line last:border-0"
            >
              <div>
                <div className="text-sm font-medium">{m.member_email || m.user_id}</div>
                <div className="text-xs text-muted capitalize">{m.role}</div>
              </div>
              <button onClick={() => removeMember(m.user_id)} className="text-muted hover:text-red-600">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Equipo({ business }: { business: Business }) {
  return (
    <OwnerGate title="Equipo">
      <EquipoInner business={business} />
    </OwnerGate>
  );
}
