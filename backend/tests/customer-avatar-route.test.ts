import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireCustomer: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  createSignedUrl: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  sharp: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireCustomer: mocks.requireCustomer }));
vi.mock("@/lib/prisma", () => ({ prisma: { customer: { findUnique: mocks.findUnique, update: mocks.update } } }));
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        createSignedUrl: mocks.createSignedUrl,
        upload: mocks.upload,
        remove: mocks.remove,
      }),
    },
  },
}));
vi.mock("sharp", () => ({ default: mocks.sharp }));

import { DELETE, GET, POST } from "@/app/api/customers/me/avatar/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireCustomer.mockResolvedValue({ id: "customer-1" });
  mocks.findUnique.mockResolvedValue({ avatarPath: "customer-1/old.webp" });
  mocks.update.mockResolvedValue({});
  mocks.createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://private.example/avatar?token=signed" }, error: null });
  mocks.upload.mockResolvedValue({ error: null });
  mocks.remove.mockResolvedValue({ error: null });
  mocks.sharp.mockImplementation(() => ({
    metadata: async () => ({ format: "webp", pages: 1, width: 512, height: 512 }),
    rotate() { return this; },
    resize() { return this; },
    webp() { return this; },
    toBuffer: async () => Buffer.from("normalized-webp"),
  }));
});

describe("private customer avatar routes", () => {
  it("returns only a temporary signed URL for the authenticated customer's own image", async () => {
    const response = await GET(new NextRequest("https://kabijoux.com.br/api/customers/me/avatar"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: { avatarUrl: "https://private.example/avatar?token=signed" } });
    expect(mocks.createSignedUrl).toHaveBeenCalledWith("customer-1/old.webp", 3600);
  });

  it("validates, normalizes and stores the upload under the authenticated customer id", async () => {
    const form = new FormData();
    form.set("file", new File([new Uint8Array([1, 2, 3])], "profile.webp", { type: "image/webp" }));
    const response = await POST(new NextRequest("https://kabijoux.com.br/api/customers/me/avatar", { method: "POST", body: form }));
    expect(response.status).toBe(200);
    expect(mocks.upload).toHaveBeenCalledWith(expect.stringMatching(/^customer-1\/.+\.webp$/), Buffer.from("normalized-webp"), expect.objectContaining({ contentType: "image/webp", upsert: false }));
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: "customer-1" }, data: { avatarPath: expect.stringMatching(/^customer-1\/.+\.webp$/) } });
    expect(mocks.remove).toHaveBeenCalledWith(["customer-1/old.webp"]);
  });

  it("rejects non-WebP uploads before writing to storage", async () => {
    const form = new FormData();
    form.set("file", new File(["not an image"], "profile.png", { type: "image/png" }));
    const response = await POST(new NextRequest("https://kabijoux.com.br/api/customers/me/avatar", { method: "POST", body: form }));
    expect(response.status).toBe(422);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("clears the profile path and removes only that customer's private object", async () => {
    const response = await DELETE(new NextRequest("https://kabijoux.com.br/api/customers/me/avatar", { method: "DELETE" }));
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: "customer-1" }, data: { avatarPath: null } });
    expect(mocks.remove).toHaveBeenCalledWith(["customer-1/old.webp"]);
  });
});
