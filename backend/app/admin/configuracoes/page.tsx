"use client";

import { useEffect, useState } from "react";
import Header from "@/components/admin/Header";

interface Settings {
  id: string;
  storeName: string;
  storeAddress: string;
  storeCity: string;
  storeState: string;
  storeZipCode: string;
  storePhone: string;
  storeEmail: string;
  storeHours: string;
  mototaxiPrice: number;
  mototaxiEnabled: boolean;
  correiosEnabled: boolean;
  storePickupEnabled: boolean;
}

type SettingsWithLegacyContact = Partial<Settings> & {
  storeWhatsapp?: string;
};

export default function ConfiguracoesPage() {
  const [settings, setSettings] = useState<Partial<Settings>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((response) => response.json())
      .then((payload) => {
        if (!payload.data) return;
        const { storeWhatsapp: _storeWhatsapp, ...storeSettings } = payload.data as SettingsWithLegacyContact;
        setSettings(storeSettings);
      });
  }, []);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = event.target;
    setSettings((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);

    const { storeWhatsapp: _storeWhatsapp, ...payload } = settings as SettingsWithLegacyContact;
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div>
      <Header title="Configuracoes da Loja" subtitle="Gerencie os dados e opcoes de entrega" />

      {saved && (
        <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Configuracoes salvas com sucesso.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="card space-y-4">
            <h3 className="font-semibold text-gray-900">Dados da loja</h3>

            {[
              { name: "storeName", label: "Nome da loja", placeholder: "KA Bijoux" },
              { name: "storeAddress", label: "Endereco", placeholder: "Rua das Flores, 123" },
              { name: "storeCity", label: "Cidade", placeholder: "Itauna" },
              { name: "storeState", label: "Estado", placeholder: "MG" },
              { name: "storeZipCode", label: "CEP", placeholder: "35680-000" },
              { name: "storePhone", label: "Telefone", placeholder: "(37) 99999-9999" },
              { name: "storeEmail", label: "E-mail", placeholder: "contato@kabijoux.com.br" },
              { name: "storeHours", label: "Horario de funcionamento", placeholder: "Seg-Sex: 9h as 18h" },
            ].map((field) => (
              <div key={field.name}>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">{field.label}</label>
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

          <div className="card space-y-4">
            <h3 className="font-semibold text-gray-900">Opcoes de entrega</h3>

            <div className="space-y-3">
              {[
                { name: "storePickupEnabled", label: "Retirada na loja", desc: "Clientes podem retirar na KA Bijoux" },
                { name: "mototaxiEnabled", label: "Mototaxi Itauna", desc: "Entrega local por mototaxi em Itauna/MG" },
                { name: "correiosEnabled", label: "Correios", desc: "Calculo de frete por CEP (PAC/SEDEX)" },
              ].map((option) => (
                <label key={option.name} className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-100 p-3 transition-colors hover:border-pink-100">
                  <input
                    type="checkbox"
                    name={option.name}
                    checked={(settings as Record<string, boolean>)[option.name] ?? false}
                    onChange={handleChange}
                    className="mt-0.5 h-4 w-4 accent-pink-500"
                  />
                  <span>
                    <span className="block text-sm font-medium text-gray-800">{option.label}</span>
                    <span className="block text-xs text-gray-400">{option.desc}</span>
                  </span>
                </label>
              ))}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Taxa do mototaxi (R$)
              </label>
              <input
                name="mototaxiPrice"
                type="number"
                step="0.01"
                min="0"
                value={settings.mototaxiPrice ?? "10.00"}
                onChange={handleChange}
                className="input-field"
              />
              <p className="mt-1 text-xs text-gray-400">
                Valor fixo cobrado para entregas por mototaxi em Itauna.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary px-8">
            {saving ? "Salvando..." : "Salvar configuracoes"}
          </button>
        </div>
      </form>
    </div>
  );
}
