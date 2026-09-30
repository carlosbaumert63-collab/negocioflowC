"use client";
import React from "react";
import { Lock } from "lucide-react";
import { usePlan } from "./PlanContext";
import UpgradePanel from "./UpgradePanel";

export default function ProGate({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const { isPro } = usePlan();

  if (isPro) return <>{children}</>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Lock size={16} className="text-muted" />
        <h1 className="text-xl font-bold">{title}</h1>
      </div>
      {description && <p className="text-sm text-muted mb-6">{description}</p>}
      <div className="bg-white border border-line rounded-xl p-5 max-w-lg">
        <UpgradePanel />
      </div>
    </div>
  );
}
