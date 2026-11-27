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
  shippingPackageWeight: number | null;
  shippingPackageHeight: number | null;
  shippingPackageWidth: number | null;
  shippingPackageLength: number | null;
  shippingHandlingDays: number;
  homePresentation: HomePresentationSettings;
}

type HomePresentationSettings = {
  themeMode: "AUTO" | "CHRISTMAS" | "DEFAULT";
  logoUrl: string | null;
  storyLogoUrl: string | null;
  headerColors: [string, string];
  bannerUrls: string[];
  ambientMusicEnabled: boolean;
  ambientMusicUrl: string | null;
  ambientMusicVolume: number;
};

const DEFAULT_HOME_PRESENTATION: HomePresentationSettings = {
  themeMode: "AUTO",
  logoUrl: null,
  storyLogoUrl: null,
  headerColors: ["#7a002e", "#51001f"],
  bannerUrls: [],
  ambientMusicEnabled: true,
  ambientMusicUrl: null,
  ambientMusicVolume: 0.08,
};

type SettingsWithLegacyContact = Partial<Settings> & {
  storeWhatsapp?: string;
};

export default function ConfiguracoesPage() {
  const [settings, setSettings] = useState<Partial<Settings>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [previewTheme, setPreviewTheme] = useState(false);
  const [ambientAudioFile, setAmbientAudioFile] = useState<File | null>(null);
  const [ambientAudioPreview, setAmbientAudioPreview] = useState<string | null>(null);
  const [uploadingAmbientAudio, setUploadingAmbientAudio] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((response) => response.json())
      .then((payload) => {
        if (!payload.data) return;
        const { storeWhatsapp: _storeWhatsapp, ...storeSettings } = payload.data as SettingsWithLegacyContact;
        setSettings({ ...storeSettings, homePresentation: { ...DEFAULT_HOME_PRESENTATION, ...(storeSettings.homePresentation ?? {}), headerColors: Array.isArray(storeSettings.homePresentation?.headerColors) ? storeSettings.homePresentation.headerColors : DEFAULT_HOME_PRESENTATION.headerColors } });
      });
  }, []);

  useEffect(() => {
    if (!ambientAudioFile) {
      setAmbientAudioPreview(null);
      return;
    }
    const previewUrl = URL.createObjectURL(ambientAudioFile);
    setAmbientAudioPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [ambientAudioFile]);

  async function uploadAmbientAudio() {
    if (!ambientAudioFile) return;
    setUploadingAmbientAudio(true);
    try {
      const form = new FormData();
      form.set("file", ambientAudioFile);
      const response = await fetch("/api/admin/settings/ambient-audio", { method: "POST", body: form });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.data?.url) throw new Error(payload?.message ?? "Não foi possível enviar o áudio.");
      updateHomePresentation("ambientMusicUrl", payload.data.url);
      setAmbientAudioFile(null);
      setSaved(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Não foi possível enviar o áudio.");
    } finally {
      setUploadingAmbientAudio(false);
    }
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = event.target;
    setSettings((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function updateHomePresentation<K extends keyof HomePresentationSettings>(key: K, value: HomePresentationSettings[K]) {
    setSettings((current) => ({
      ...current,
      homePresentation: { ...DEFAULT_HOME_PRESENTATION, ...current.homePresentation, [key]: value },
    }));
  }

  function updateHeaderColor(index: 0 | 1, value: string) {
    const current = settings.homePresentation?.headerColors ?? DEFAULT_HOME_PRESENTATION.headerColors;
    updateHomePresentation("headerColors", index === 0 ? [value, current[1]] : [current[0], value]);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaveError(null);

    const { storeWhatsapp: _storeWhatsapp, ...payload } = settings as SettingsWithLegacyContact;
    const response = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setSaveError(payload?.message ?? "Não foi possível salvar as configurações.");
      setSaving(false);
      return;
    }
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
      {saveError && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="card space-y-4">
            <h3 className="font-semibold text-gray-900">Dados da loja</h3>

            {[
              { name: "storeName", label: "Nome da loja", placeholder: "KA Bijoux" },
              { name: "storeAddress", label: "Endereco", placeholder: "Rua Capitão Vicente, 110, Centro" },
              { name: "storeCity", label: "Cidade", placeholder: "Itauna" },
              { name: "storeState", label: "Estado", placeholder: "MG" },
              { name: "storeZipCode", label: "CEP", placeholder: "35680-056" },
              { name: "storePhone", label: "Telefone", placeholder: "(37) 99999-9999" },
              { name: "storeEmail", label: "E-mail", placeholder: "adm@kabijoux.com.br" },
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
            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-sm font-semibold text-gray-800">Embalagem padrão para envio nacional</h4>
              <p className="mt-1 text-xs text-gray-400">Informe medidas reais da embalagem em centímetros e o peso dela vazia em quilogramas. Os Correios ficam indisponíveis enquanto faltar algum dado.</p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { name: "shippingPackageWeight", label: "Peso (kg)", step: "0.001" },
                  { name: "shippingPackageHeight", label: "Altura (cm)", step: "0.1" },
                  { name: "shippingPackageWidth", label: "Largura (cm)", step: "0.1" },
                  { name: "shippingPackageLength", label: "Comprimento (cm)", step: "0.1" },
                ].map((field) => <label key={field.name} className="text-xs font-medium text-gray-600">{field.label}<input name={field.name} type="number" min="0.001" step={field.step} value={(settings as Record<string, string | number | null>)[field.name] ?? ""} onChange={handleChange} className="input-field mt-1" /></label>)}
                <label className="text-xs font-medium text-gray-600 sm:col-span-2">Prazo de preparação (dias úteis)<input name="shippingHandlingDays" type="number" min="0" max="30" step="1" value={settings.shippingHandlingDays ?? 1} onChange={handleChange} className="input-field mt-1" /></label>
              </div>
            </div>
          </div>
        </div>

        <section className="card space-y-5" aria-labelledby="home-presentation-title">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 id="home-presentation-title" className="font-semibold text-gray-900">Identidade sazonal da Home</h3>
              <p className="mt-1 text-xs text-gray-500">Essas opções atualizam o site e a Home do aplicativo pelo backend, sem novo build para trocas de tema, logo, banners ou música.</p>
            </div>
            <button type="button" onClick={() => setPreviewTheme((value) => !value)} className="rounded-xl border border-pink-200 px-3 py-2 text-sm font-semibold text-pink-700 hover:bg-pink-50">
              {previewTheme ? "Fechar prévia" : "Visualizar prévia"}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-gray-700">Tema da loja
              <select value={settings.homePresentation?.themeMode ?? "AUTO"} onChange={(event) => updateHomePresentation("themeMode", event.target.value as HomePresentationSettings["themeMode"])} className="input-field mt-1">
                <option value="AUTO">Automático (Natal em novembro e dezembro)</option>
                <option value="CHRISTMAS">Natal ativado</option>
                <option value="DEFAULT">Tema tradicional</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[0, 1].map((index) => <label key={index} className="text-sm font-medium text-gray-700">Cor do cabeçalho {index + 1}
                <input type="color" value={settings.homePresentation?.headerColors?.[index] ?? DEFAULT_HOME_PRESENTATION.headerColors[index]} onChange={(event) => updateHeaderColor(index as 0 | 1, event.target.value)} className="mt-1 h-11 w-full cursor-pointer rounded-lg border border-gray-200 bg-white p-1" />
              </label>)}
            </div>
            <label className="text-sm font-medium text-gray-700">Logo sazonal (URL ou caminho local)
              <input value={settings.homePresentation?.logoUrl ?? ""} onChange={(event) => updateHomePresentation("logoUrl", event.target.value.trim() || null)} placeholder="Padrão: logo natalina oficial" className="input-field mt-1" />
            </label>
            <label className="text-sm font-medium text-gray-700">Logo do círculo KA Stories
              <input value={settings.homePresentation?.storyLogoUrl ?? ""} onChange={(event) => updateHomePresentation("storyLogoUrl", event.target.value.trim() || null)} placeholder="Padrão: versão natalina simplificada" className="input-field mt-1" />
            </label>
            <label className="text-sm font-medium text-gray-700 md:col-span-2">Banners da Home — um caminho ou URL HTTPS por linha
              <textarea rows={3} value={(settings.homePresentation?.bannerUrls ?? []).join("\n")} onChange={(event) => updateHomePresentation("bannerUrls", event.target.value.split(/\r?\n/).map((value) => value.trim()).filter(Boolean))} placeholder="Deixe vazio para manter os banners sazonais oficiais atuais." className="input-field mt-1" />
              <span className="mt-1 block text-xs font-normal text-gray-500">Até três banners. A mesma imagem não será duplicada automaticamente no carrossel.</span>
            </label>
          </div>

          <div className="rounded-2xl border border-pink-100 bg-pink-50/50 p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" checked={settings.homePresentation?.ambientMusicEnabled ?? true} onChange={(event) => updateHomePresentation("ambientMusicEnabled", event.target.checked)} className="mt-1 h-4 w-4 accent-pink-500" />
              <span><span className="block text-sm font-semibold text-gray-800">Música ambiente sazonal</span><span className="block text-xs text-gray-500">Jingle Bells Music Box — WaveMaster (Pixabay). O aplicativo toca em volume baixo, respeita o modo silencioso e pausa em segundo plano.</span></span>
            </label>
            <label className="mt-3 block text-sm font-medium text-gray-700">Substituir música oficial (arquivo MP3; será salvo no Supabase Storage)
              <input type="file" accept="audio/mpeg,.mp3" onChange={(event) => setAmbientAudioFile(event.target.files?.[0] ?? null)} className="input-field mt-1" />
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button type="button" disabled={!ambientAudioFile || uploadingAmbientAudio} onClick={() => void uploadAmbientAudio()} className="rounded-lg bg-pink-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                {uploadingAmbientAudio ? "Enviando…" : "Enviar música ao Supabase"}
              </button>
              {ambientAudioFile ? <span className="text-xs text-gray-600">{ambientAudioFile.name}</span> : null}
            </div>
            {ambientAudioPreview || settings.homePresentation?.ambientMusicUrl ? <audio className="mt-3 w-full" controls preload="none" src={ambientAudioPreview ?? settings.homePresentation?.ambientMusicUrl ?? undefined} /> : <p className="mt-2 text-xs text-gray-500">Selecione uma gravação MP3 para ouvir a prévia antes de enviá-la e salvar as configurações.</p>}
            <label className="mt-3 block text-sm font-medium text-gray-700">Volume máximo: {Math.round((settings.homePresentation?.ambientMusicVolume ?? 0.08) * 100)}%
              <input type="range" min={0} max={8} step={1} value={Math.round((settings.homePresentation?.ambientMusicVolume ?? 0.08) * 100)} onChange={(event) => updateHomePresentation("ambientMusicVolume", Number(event.target.value) / 100)} className="mt-2 w-full accent-pink-600" />
            </label>
            <p className="mt-2 text-xs text-gray-500">Prévia antes de salvar. A faixa substituta ficará associada ao tema sazonal e poderá ser trocada sem novo build. Registro da licença e do Content ID deve ser mantido junto ao arquivo original do Pixabay.</p>
          </div>

          {previewTheme && <div className="overflow-hidden rounded-2xl border border-pink-100 shadow-sm">
            <div className="flex min-h-24 items-center justify-between gap-3 px-5 py-3" style={{ background: `linear-gradient(110deg, ${settings.homePresentation?.headerColors?.[0] ?? "#7a002e"}, ${settings.homePresentation?.headerColors?.[1] ?? "#51001f"})` }}>
              <span className="text-xl font-semibold text-white">☰</span>
              <img src={settings.homePresentation?.logoUrl || "/images/brand/ka-bijoux-logo-natal.png"} alt="Prévia da logomarca KA Bijoux" className="h-20 w-24 object-contain" />
              <span className="text-xl text-white">♡　🛒</span>
            </div>
            <div className="grid grid-cols-2 gap-2 bg-[#fff8fb] p-3">
              {(settings.homePresentation?.bannerUrls?.length ? settings.homePresentation.bannerUrls : ["/banners/ka-natal-presentes-encantam-brand.webp", "/banners/ka-natal-brilhe-neste-natal-brand.webp", "/banners/ka-natal-cheio-de-estilo-brand.webp"]).map((url, index) => <img key={`${url}-${index}`} src={url} alt={`Prévia do banner ${index + 1}`} className="aspect-[2.15] w-full rounded-lg object-cover" />)}
            </div>
          </div>}
        </section>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary px-8">
            {saving ? "Salvando..." : "Salvar configuracoes"}
          </button>
        </div>
      </form>
    </div>
  );
}
