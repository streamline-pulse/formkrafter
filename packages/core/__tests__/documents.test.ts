import { describe, expect, test } from "bun:test";
import { documentFillPatch, parseDocumentFields, parseDocumentFills } from "../lib/utils/documents.js";
import { FetchDocumentReaderService, readDocumentReading } from "../lib/services/document_reader_service.js";

describe("lecture de documents", () => {
  test("les champs demandes se lisent ligne par ligne, avec ou sans libelle", () => {
    expect(parseDocumentFields("numero|Numéro de pièce\n# commentaire\n\nnom\nnumero")).toEqual([
      { key: "numero", label: "Numéro de pièce" },
      { key: "nom" },
    ]);
    expect(parseDocumentFields([{ key: " date ", label: "Date" }, { key: "" }])).toEqual([{ key: "date", label: "Date" }]);
    expect(parseDocumentFields(42)).toEqual([]);
  });

  test("les correspondances remplissent le formulaire sans les champs vides", () => {
    const fills = parseDocumentFills("numero=data.numero\nnom = demandeur\nsans-egal\n=cible");
    expect(fills).toEqual({ numero: "data.numero", nom: "demandeur" });
    expect(documentFillPatch({ numero: "AB123", nom: "", date: "2026-01-01" }, fills)).toEqual({ "data.numero": "AB123" });
  });

  test("une reponse de lecteur se normalise, meme enveloppee dans data", () => {
    expect(readDocumentReading({ data: { text: "Bonjour", fields: { nom: "Ali" }, pages: 2, warnings: ["flou", 3] } })).toEqual({
      text: "Bonjour",
      fields: { nom: "Ali" },
      pages: 2,
      warnings: ["flou"],
    });
    expect(readDocumentReading({ md_content: "# Titre" })).toEqual({ text: "# Titre" });
    expect(readDocumentReading("nope")).toEqual({});
  });

  test("le lecteur par defaut envoie le fichier et les champs en multipart", async () => {
    let seen: { url: string; body: FormData } | undefined;
    const reader = new FetchDocumentReaderService({
      url: "https://reader.test/read",
      fetch: (async (url: string, init: RequestInit) => {
        seen = { url, body: init.body as FormData };
        return new Response(JSON.stringify({ text: "lu", fields: { nom: "Ali" } }), { status: 200 });
      }) as unknown as typeof fetch,
    });
    const file = new File([new TextEncoder().encode("abc")], "piece.pdf", { type: "application/pdf" });
    const reading = await reader.read(file, { fields: [{ key: "nom", label: "Nom" }], language: "fr" });
    expect(reading).toEqual({ text: "lu", fields: { nom: "Ali" } });
    expect(seen?.url).toBe("https://reader.test/read");
    expect((seen?.body.get("file") as File).name).toBe("piece.pdf");
    expect(seen?.body.get("fields")).toBe("nom");
    expect(seen?.body.get("language")).toBe("fr");
    const failing = new FetchDocumentReaderService({
      url: "https://reader.test/read",
      fetch: (async () => new Response(JSON.stringify({ message: "Trop lourd" }), { status: 413 })) as unknown as typeof fetch,
    });
    await expect(failing.read(file)).rejects.toThrow("Trop lourd");
  });
});
