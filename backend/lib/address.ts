import { z } from "zod";

export const addressInputSchema = z.object({
  label: z.string().trim().max(40).optional(),
  street: z.string().trim().min(2).max(160),
  number: z.string().trim().min(1).max(20),
  complement: z.string().trim().max(100).optional(),
  neighborhood: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  zipCode: z.string().transform((value) => value.replace(/\D/g, "")).refine((value) => value.length === 8, "CEP inválido."),
  recipientName: z.string().trim().min(2).max(100).optional(),
  recipientPhone: z.string().transform((value) => value.replace(/\D/g, "")).refine((value) => value.length === 10 || value.length === 11, "Telefone inválido.").optional(),
}).strict();

export type AddressInput = z.infer<typeof addressInputSchema>;

export type PostalCodeAddress = {
  zipCode: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
};

export async function lookupBrazilianPostalCode(zipCode: string): Promise<PostalCodeAddress | null> {
  const cleanZip = zipCode.replace(/\D/g, "");
  if (cleanZip.length !== 8) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanZip}/json/`, {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": "KABijoux/1.0" },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = await response.json() as {
      erro?: boolean; cep?: string; logradouro?: string; bairro?: string; localidade?: string; uf?: string;
    };
    if (payload.erro || !payload.localidade || !payload.uf) return null;
    return {
      zipCode: (payload.cep ?? cleanZip).replace(/\D/g, ""),
      street: payload.logradouro?.trim() ?? "",
      neighborhood: payload.bairro?.trim() ?? "",
      city: payload.localidade.trim(),
      state: payload.uf.trim().toUpperCase(),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
