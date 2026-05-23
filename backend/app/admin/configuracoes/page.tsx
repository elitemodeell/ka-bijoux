"use client";

import { useEffect, useState } from "react";
import Header from "@/components/admin/Header";

interface Settings {
  id: string; storeName: string; storeAddress: string; storeCity: string;
  storeState: string; storeZipCode: string; storePhone: string; storeWhatsapp: string;
  storeEmail: string; storeHours: string;
  mototaxiPrice: number; mototaxiEnabled: boolean;
  correiosEnabled: boolean; storePickupEnabled: boolean;
}

export default function ConfiguracoesPage() {
  const [settings, setSettings] = useState<Partial<Settings>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => { if (d.data) setSettings(d.data); });
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div>
      <Header title="Configurações da Loja" subtitle="Gerencie os dados e opções de entrega" />

      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm mb-5">
          ✅ Configurações salvas com sucesso!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dados da loja */}
          <div className="card space-y-4">
            <h3 className="font-semibold text-gray-900">Dados da Loja</h3>

            {[
              { name: "storeName",    label: "Nome da Loja",     placeholder: "KA Bijoux" },
              { name: "storeAddress", label: "Endereço",         placeholder: "Rua das Flores, 123" },
              { name: "storeCity",    label: "Cidade",           placeholder: "Itaúna" },
              { name: "storeState",   label: "Estado",           placeholder: "MG" },
              { name: "storeZipCode", label: "CEP",              placeholder: "35680-000" },
              { name: "storePhone",   label: "Telefone",         placeholder: "(37) 99999-9999" },
              { name: "storeWhatsapp",label: "WhatsApp (número com DDD)", placeholder: "5537999999999" },
              { name: "storeEmail",   label: "E-mail",           placeholder: "contato@kabijoux.com.br" },
              { name: "storeHours",   label: "Horário de Funcionamento", placeholder: "Seg-Sex: 9h às 18h" },
            ].map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
                <input
                  name={field.name}
                  value={(settings as Record<string, string | boolean | number>)[field.name] as string ?? ""}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  className="input-field"
                />
              </div>
            ))}
          </div>

          {/* Entregas */}
          <div className="card space-y-4">
            <h3 className="font-semibold text-gray-900">Opções de Entrega</h3>

            <div className="space-y-3">
              {[
                { name: "storePickupEnabled", label: "Retirada na Loja", desc: "Clientes podem retirar na KA Bijoux (frete grátis)" },
                { name: "mototaxiEnabled",    label: "Mototáxi Itaúna",  desc: "Entrega local por mototáxi em Itaúna/MG" },
                { name: "correiosEnabled",    label: "Correios",         desc: "Cálculo de frete por CEP (PAC/SEDEX)" },
              ].map((opt) => (
                <label key={opt.name} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-pink-100 cursor-pointer transition-colors">
                  <input
                    type="checkbox" name={opt.name}
                    checked={(settings as Record<string, boolean>)[opt.name] ?? false}
                    onChange={handleChange}
                    className="w-4 h-4 mt-0.5 accent-pink-500"
                  />
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{opt.label}</p>
                    <p className="text-xs text-gray-400">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Taxa do Mototáxi (R$)
              </label>
              <input
                name="mototaxiPrice" type="number" step="0.01" min="0"
                value={settings.mototaxiPrice ?? "10.00"}
                onChange={handleChange}
                className="input-field"
              />
              <p className="text-xs text-gray-400 mt-1">
                Valor fixo cobrado para entregas por mototáxi em Itaúna.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary px-8">
            {saving ? "Salvando..." : "Salvar Configurações"}
          </button>
        </div>
      </form>
    </div>
  );
}
