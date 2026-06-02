"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/admin/Header";
import { DEFAULT_STORY_COVER, type StoryGroup, type StoryItem } from "@/types/stories";

type StoryGroupForm = {
  id?: string;
  title: string;
  coverImageUrl: string;
  isActive: boolean;
  sortOrder: number;
};

type StoryItemForm = {
  id?: string;
  type: "image" | "video";
  mediaUrl: string;
  duration: number;
  text: string;
  buttonText: string;
  linkUrl: string;
  isActive: boolean;
  sortOrder: number;
};

const emptyGroupForm: StoryGroupForm = {
  title: "",
  coverImageUrl: "",
  isActive: true,
  sortOrder: 0,
};

const emptyItemForm: StoryItemForm = {
  type: "image",
  mediaUrl: "",
  duration: 5,
  text: "",
  buttonText: "",
  linkUrl: "",
  isActive: true,
  sortOrder: 0,
};

const formatDate = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export default function AdminStoriesPage() {
  const [stories, setStories] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingItem, setUploadingItem] = useState(false);
  const [error, setError] = useState("");
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [groupForm, setGroupForm] = useState<StoryGroupForm>(emptyGroupForm);
  const [itemForm, setItemForm] = useState<StoryItemForm>(emptyItemForm);
  const [previewOpen, setPreviewOpen] = useState(false);

  const selectedStory = useMemo(
    () => stories.find((story) => story.id === selectedStoryId) ?? null,
    [stories, selectedStoryId]
  );
  const activeStoryId = groupForm.id ?? selectedStoryId;

  const previewStory = useMemo<StoryGroup>(() => {
    const draftItem: StoryItem | null = itemForm.mediaUrl
      ? {
          id: itemForm.id ?? "draft-item",
          type: itemForm.type,
          src: itemForm.mediaUrl,
          mediaUrl: itemForm.mediaUrl,
          duration: itemForm.duration,
          text: itemForm.text || null,
          buttonText: itemForm.buttonText || null,
          link: itemForm.linkUrl || null,
          linkUrl: itemForm.linkUrl || null,
          isActive: itemForm.isActive,
          sortOrder: itemForm.sortOrder,
        }
      : null;

    const baseItems = selectedStory?.items ?? [];
    const items = draftItem
      ? itemForm.id
        ? baseItems.map((item) => (item.id === itemForm.id ? draftItem : item))
        : [...baseItems, draftItem]
      : baseItems;

    return {
      id: groupForm.id ?? "preview-story",
      title: groupForm.title || selectedStory?.title || "Novo Story",
      cover: groupForm.coverImageUrl || selectedStory?.cover || DEFAULT_STORY_COVER,
      coverImageUrl: groupForm.coverImageUrl || selectedStory?.coverImageUrl || null,
      isActive: groupForm.isActive,
      sortOrder: groupForm.sortOrder,
      items,
    };
  }, [groupForm, itemForm, selectedStory]);

  async function fetchStories() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/stories", { cache: "no-store" });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Erro ao carregar stories.");
        return;
      }

      const data = Array.isArray(json.data) ? json.data : [];
      setStories(data);
      if (!selectedStoryId && data[0]) setSelectedStoryId(data[0].id);
    } catch {
      setError("Erro de conexão ao carregar stories.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startNewStory() {
    setSelectedStoryId(null);
    setGroupForm({ ...emptyGroupForm, sortOrder: stories.length + 1 });
    setItemForm(emptyItemForm);
    setShowGroupForm(true);
    setError("");
  }

  function startEditStory(story: StoryGroup) {
    setSelectedStoryId(story.id);
    setGroupForm({
      id: story.id,
      title: story.title,
      coverImageUrl: story.coverImageUrl ?? "",
      isActive: story.isActive,
      sortOrder: story.sortOrder,
    });
    setItemForm(emptyItemForm);
    setShowGroupForm(true);
    setError("");
  }

  async function saveStory(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const isEditing = Boolean(groupForm.id);
      const res = await fetch(isEditing ? `/api/admin/stories/${groupForm.id}` : "/api/admin/stories", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: groupForm.title,
          coverImageUrl: groupForm.coverImageUrl || null,
          isActive: groupForm.isActive,
          sortOrder: groupForm.sortOrder,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Erro ao salvar story.");
        return;
      }

      setSelectedStoryId(json.data.id);
      setGroupForm({
        id: json.data.id,
        title: json.data.title,
        coverImageUrl: json.data.coverImageUrl ?? "",
        isActive: json.data.isActive,
        sortOrder: json.data.sortOrder,
      });
      setShowGroupForm(true);
      await fetchStories();
    } catch {
      setError("Erro de conexão ao salvar story.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStory(story: StoryGroup) {
    await fetch(`/api/admin/stories/${story.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !story.isActive }),
    });
    await fetchStories();
  }

  async function deleteStory(story: StoryGroup) {
    if (!window.confirm(`Excluir o story "${story.title}"?`)) return;

    await fetch(`/api/admin/stories/${story.id}`, { method: "DELETE" });
    if (selectedStoryId === story.id) {
      setSelectedStoryId(null);
      setGroupForm(emptyGroupForm);
      setItemForm(emptyItemForm);
      setShowGroupForm(false);
    }
    await fetchStories();
  }

  async function saveItem(event: React.FormEvent) {
    event.preventDefault();
    if (!activeStoryId) {
      setError("Salve o grupo antes de adicionar itens.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const isEditing = Boolean(itemForm.id);
      const res = await fetch(
        isEditing
          ? `/api/admin/stories/${activeStoryId}/items/${itemForm.id}`
          : `/api/admin/stories/${activeStoryId}/items`,
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: itemForm.type,
            mediaUrl: itemForm.mediaUrl,
            duration: itemForm.duration,
            text: itemForm.text || null,
            buttonText: itemForm.buttonText || null,
            linkUrl: itemForm.linkUrl || null,
            isActive: itemForm.isActive,
            sortOrder: itemForm.sortOrder,
          }),
        }
      );

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Erro ao salvar item.");
        return;
      }

      setItemForm({ ...emptyItemForm, sortOrder: (selectedStory?.items.length ?? 0) + 1 });
      await fetchStories();
    } catch {
      setError("Erro de conexão ao salvar item.");
    } finally {
      setSaving(false);
    }
  }

  function editItem(item: StoryItem) {
    setItemForm({
      id: item.id,
      type: item.type,
      mediaUrl: item.mediaUrl || item.src,
      duration: item.duration ?? 5,
      text: item.text ?? "",
      buttonText: item.buttonText ?? "",
      linkUrl: item.linkUrl ?? item.link ?? "",
      isActive: item.isActive,
      sortOrder: item.sortOrder,
    });
  }

  async function toggleItem(item: StoryItem) {
    if (!activeStoryId) return;

    await fetch(`/api/admin/stories/${activeStoryId}/items/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !item.isActive }),
    });
    await fetchStories();
  }

  async function deleteItem(item: StoryItem) {
    if (!activeStoryId || !window.confirm("Excluir este item do story?")) return;

    await fetch(`/api/admin/stories/${activeStoryId}/items/${item.id}`, { method: "DELETE" });
    if (itemForm.id === item.id) setItemForm(emptyItemForm);
    await fetchStories();
  }

  async function uploadFile(file: File, target: "cover" | "item") {
    const setUploading = target === "cover" ? setUploadingCover : setUploadingItem;
    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/stories/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Erro ao enviar arquivo.");
        return;
      }

      if (target === "cover") {
        setGroupForm((prev) => ({ ...prev, coverImageUrl: json.data.url }));
      } else {
        setItemForm((prev) => ({
          ...prev,
          mediaUrl: json.data.url,
          type: json.data.type === "video" ? "video" : "image",
        }));
      }
    } catch {
      setError("Erro de conexão no upload.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <Header
        title="Stories"
        subtitle={`${stories.length} grupos cadastrados para a home`}
        action={
          <button type="button" onClick={startNewStory} className="btn-primary">
            + Novo Story
          </button>
        }
      />

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="space-y-5">
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Story</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Itens</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Ordem</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Atualizado</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {stories.map((story) => (
                    <tr
                      key={story.id}
                      className={`border-b border-gray-50 transition-colors hover:bg-gray-50 ${
                        selectedStoryId === story.id ? "bg-pink-50/40" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={story.cover || DEFAULT_STORY_COVER}
                            alt={story.title}
                            className="h-12 w-12 rounded-full border-2 border-pink-100 object-cover"
                          />
                          <div>
                            <p className="font-semibold text-gray-900">{story.title}</p>
                            <p className="text-xs text-gray-400">
                              Criado em {story.createdAt ? formatDate.format(new Date(story.createdAt)) : "-"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{story.items.length}</td>
                      <td className="px-4 py-3 text-gray-600">{story.sortOrder}</td>
                      <td className="px-4 py-3">
                        <span className={`badge-status ${story.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {story.isActive ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {story.updatedAt ? formatDate.format(new Date(story.updatedAt)) : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button type="button" onClick={() => startEditStory(story)} className="text-xs font-semibold text-pink-500 hover:text-pink-600">
                            Editar
                          </button>
                          <button type="button" onClick={() => toggleStory(story)} className="text-xs font-semibold text-gray-500 hover:text-gray-800">
                            {story.isActive ? "Desativar" : "Ativar"}
                          </button>
                          <button type="button" onClick={() => deleteStory(story)} className="text-xs font-semibold text-red-500 hover:text-red-600">
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {loading && <div className="py-10 text-center text-gray-400">Carregando...</div>}
            {!loading && stories.length === 0 && (
              <div className="py-14 text-center text-gray-400">
                <p className="font-medium">Nenhum story cadastrado.</p>
                <button type="button" onClick={startNewStory} className="mt-3 text-sm font-semibold text-pink-500">
                  Cadastrar primeiro story
                </button>
              </div>
            )}
          </div>

          {showGroupForm && (
            <form onSubmit={saveStory} className="card space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {groupForm.id ? "Editar Story" : "Novo Story"}
                  </h2>
                  <p className="text-sm text-gray-500">Dados da bolinha que aparece abaixo da logo.</p>
                </div>
                <button type="button" onClick={() => setPreviewOpen(true)} className="btn-outline">
                  Prévia
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_150px]">
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Título *</label>
                    <input
                      value={groupForm.title}
                      onChange={(event) => setGroupForm((prev) => ({ ...prev, title: event.target.value }))}
                      required
                      placeholder="Ex: Promoções"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Imagem de capa</label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        value={groupForm.coverImageUrl}
                        onChange={(event) => setGroupForm((prev) => ({ ...prev, coverImageUrl: event.target.value }))}
                        placeholder="/uploads/stories/capa.jpg"
                        className="input-field"
                      />
                      <label className="btn-outline flex cursor-pointer items-center justify-center whitespace-nowrap">
                        {uploadingCover ? "Enviando..." : "Upload"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) uploadFile(file, "cover");
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center rounded-2xl border border-pink-100 bg-pink-50/50 p-4">
                  <span className="mb-2 text-xs font-semibold uppercase tracking-wide text-pink-500">Capa</span>
                  <img
                    src={groupForm.coverImageUrl || DEFAULT_STORY_COVER}
                    alt=""
                    className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-card"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Ordem</label>
                  <input
                    type="number"
                    value={groupForm.sortOrder}
                    onChange={(event) => setGroupForm((prev) => ({ ...prev, sortOrder: Number(event.target.value) }))}
                    className="input-field"
                  />
                </div>
                <label className="flex items-center gap-3 pt-7">
                  <input
                    type="checkbox"
                    checked={groupForm.isActive}
                    onChange={(event) => setGroupForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                    className="h-4 w-4 accent-pink-500"
                  />
                  <span className="text-sm text-gray-700">Story ativo na home</span>
                </label>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowGroupForm(false);
                    setGroupForm(emptyGroupForm);
                    setItemForm(emptyItemForm);
                  }}
                  className="btn-ghost"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? "Salvando..." : "Salvar Story"}
                </button>
              </div>
            </form>
          )}
        </div>

        <aside className="space-y-5">
          <div className="card">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-gray-900">Itens do Story</h2>
                <p className="text-sm text-gray-500">
                  {selectedStory ? selectedStory.title : "Selecione ou salve um story"}
                </p>
              </div>
              {selectedStory && (
                <span className="badge-status bg-pink-50 text-pink-600">
                  {selectedStory.items.length} itens
                </span>
              )}
            </div>

            {selectedStory ? (
              <div className="space-y-3">
                {selectedStory.items.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-gray-100 p-3">
                    <div className="flex gap-3">
                      <StoryItemThumb item={item} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="badge-status bg-gray-100 text-gray-600">
                            {item.type === "video" ? "Vídeo" : "Imagem"}
                          </span>
                          <span className={`badge-status ${item.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {item.isActive ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                        <p className="mt-2 truncate text-sm font-semibold text-gray-800">
                          {item.text || item.mediaUrl}
                        </p>
                        <p className="text-xs text-gray-400">
                          Ordem {item.sortOrder} · {item.duration ?? 5}s
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end gap-3">
                      <button type="button" onClick={() => editItem(item)} className="text-xs font-semibold text-pink-500">
                        Editar
                      </button>
                      <button type="button" onClick={() => toggleItem(item)} className="text-xs font-semibold text-gray-500">
                        {item.isActive ? "Desativar" : "Ativar"}
                      </button>
                      <button type="button" onClick={() => deleteItem(item)} className="text-xs font-semibold text-red-500">
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}

                {selectedStory.items.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-pink-200 bg-pink-50/50 px-4 py-8 text-center text-sm text-gray-500">
                    Adicione imagem ou vídeo para publicar este Story.
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
                Salve um grupo para adicionar itens.
              </div>
            )}
          </div>

          <form onSubmit={saveItem} className="card space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-gray-900">
                  {itemForm.id ? "Editar item" : "Novo item"}
                </h2>
                <p className="text-sm text-gray-500">Imagem, vídeo, texto, botão e link.</p>
              </div>
              {itemForm.id && (
                <button type="button" onClick={() => setItemForm(emptyItemForm)} className="text-xs font-semibold text-gray-500">
                  Limpar
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Tipo</label>
                <select
                  value={itemForm.type}
                  onChange={(event) => setItemForm((prev) => ({ ...prev, type: event.target.value as StoryItemForm["type"] }))}
                  className="input-field"
                >
                  <option value="image">Imagem</option>
                  <option value="video">Vídeo</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Duração (s)</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={itemForm.duration}
                  onChange={(event) => setItemForm((prev) => ({ ...prev, duration: Number(event.target.value) }))}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Mídia *</label>
              <div className="flex flex-col gap-2">
                <input
                  value={itemForm.mediaUrl}
                  onChange={(event) => setItemForm((prev) => ({ ...prev, mediaUrl: event.target.value }))}
                  required
                  placeholder="/uploads/stories/novidade.mp4"
                  className="input-field"
                />
                <label className="btn-outline flex cursor-pointer items-center justify-center">
                  {uploadingItem ? "Enviando..." : "Upload de imagem/vídeo"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) uploadFile(file, "item");
                    }}
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Texto opcional</label>
              <textarea
                value={itemForm.text}
                onChange={(event) => setItemForm((prev) => ({ ...prev, text: event.target.value }))}
                rows={3}
                placeholder="Ex: Brincos novos acabaram de chegar"
                className="input-field resize-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Texto do botão</label>
                <input
                  value={itemForm.buttonText}
                  onChange={(event) => setItemForm((prev) => ({ ...prev, buttonText: event.target.value }))}
                  placeholder="Comprar agora"
                  className="input-field"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Link</label>
                <input
                  value={itemForm.linkUrl}
                  onChange={(event) => setItemForm((prev) => ({ ...prev, linkUrl: event.target.value }))}
                  placeholder="/categoria/brincos"
                  className="input-field"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Ordem</label>
                <input
                  type="number"
                  value={itemForm.sortOrder}
                  onChange={(event) => setItemForm((prev) => ({ ...prev, sortOrder: Number(event.target.value) }))}
                  className="input-field"
                />
              </div>
              <label className="flex items-center gap-3 pt-7">
                <input
                  type="checkbox"
                  checked={itemForm.isActive}
                  onChange={(event) => setItemForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                  className="h-4 w-4 accent-pink-500"
                />
                <span className="text-sm text-gray-700">Item ativo</span>
              </label>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setPreviewOpen(true)} className="btn-outline flex-1">
                Prévia
              </button>
              <button type="submit" disabled={saving || !activeStoryId} className="btn-primary flex-1">
                {saving ? "Salvando..." : itemForm.id ? "Salvar item" : "Adicionar"}
              </button>
            </div>
          </form>
        </aside>
      </div>

      {previewOpen && (
        <StoryPreviewModal story={previewStory} onClose={() => setPreviewOpen(false)} />
      )}
    </div>
  );
}

function StoryItemThumb({ item }: { item: StoryItem }) {
  if (item.type === "video") {
    return (
      <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-xs font-bold text-white">
        VID
      </div>
    );
  }

  return (
    <img
      src={item.mediaUrl || item.src || DEFAULT_STORY_COVER}
      alt=""
      className="h-16 w-12 shrink-0 rounded-xl object-cover"
    />
  );
}

function StoryPreviewModal({ story, onClose }: { story: StoryGroup; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const item = story.items[index] ?? null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
      <div className="relative h-[82vh] max-h-[760px] w-full max-w-sm overflow-hidden rounded-[28px] bg-[#140810] text-white shadow-2xl">
        <div className="absolute inset-x-0 top-0 z-20 p-4">
          <div className="mb-3 flex gap-1">
            {(story.items.length ? story.items : [{ id: "empty" }]).map((previewItem, itemIndex) => (
              <span key={previewItem.id} className="h-1 flex-1 rounded-full bg-white/30">
                <span className={`block h-full rounded-full bg-white ${itemIndex <= index ? "w-full" : "w-0"}`} />
              </span>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <img src={story.cover || DEFAULT_STORY_COVER} alt="" className="h-9 w-9 rounded-full object-cover" />
              <span className="truncate text-sm font-semibold">{story.title}</span>
            </div>
            <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-xl">
              ×
            </button>
          </div>
        </div>

        {item ? (
          item.type === "video" ? (
            <video src={item.mediaUrl || item.src} controls className="h-full w-full object-cover" />
          ) : (
            <img src={item.mediaUrl || item.src} alt="" className="h-full w-full object-cover" />
          )
        ) : (
          <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-pink-900 via-[#281020] to-black px-8 text-center">
            <img src={story.cover || DEFAULT_STORY_COVER} alt="" className="mb-5 h-24 w-24 rounded-full object-contain" />
            <p className="text-xl font-bold">{story.title}</p>
            <p className="mt-2 text-sm text-white/65">Adicione um item para visualizar o conteúdo.</p>
          </div>
        )}

        {item && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-5 pb-6 pt-24 text-center">
            {item.text && <p className="mb-3 text-lg font-semibold leading-snug">{item.text}</p>}
            {item.linkUrl && (
              <span className="inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-bold text-pink-600">
                {item.buttonText || "Ver agora"}
              </span>
            )}
          </div>
        )}

        {story.items.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setIndex((current) => Math.max(current - 1, 0))}
              className="absolute left-0 top-20 z-10 h-[60%] w-1/2"
              aria-label="Anterior"
            />
            <button
              type="button"
              onClick={() => setIndex((current) => Math.min(current + 1, story.items.length - 1))}
              className="absolute right-0 top-20 z-10 h-[60%] w-1/2"
              aria-label="Próximo"
            />
          </>
        )}
      </div>
    </div>
  );
}
