import { describe, expect, test } from "bun:test";
import { UrlFileUploadService } from "../lib/services/file_upload_service";

const fakeFile = (name = "doc.pdf") =>
  new File([new Uint8Array([1, 2, 3])], name, { type: "application/pdf" });

const recordingFetch = (response: { status?: number; body?: unknown } = {}) => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify(response.body ?? {}), {
      status: response.status ?? 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  return { calls, fetchImpl };
};

describe("UrlFileUploadService", () => {
  test("uploads as multipart to the per-call url and reads the returned url", async () => {
    const { calls, fetchImpl } = recordingFetch({
      body: { url: "https://cdn.test/doc.pdf" },
    });
    const service = new UrlFileUploadService({ fetch: fetchImpl });

    const uploaded = await service.upload(fakeFile(), {
      url: "https://api.test/uploads",
      headers: { Authorization: "Bearer x" },
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.test/uploads");
    expect(calls[0].init.method).toBe("POST");
    expect(calls[0].init.body).toBeInstanceOf(FormData);
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe(
      "Bearer x"
    );
    expect(uploaded).toEqual({
      name: "doc.pdf",
      type: "application/pdf",
      size: 3,
      url: "https://cdn.test/doc.pdf",
    });
  });

  test("falls back to the default url and merges default headers", async () => {
    const { calls, fetchImpl } = recordingFetch({ body: { path: "/files/1" } });
    const service = new UrlFileUploadService({
      url: "https://api.test/default",
      headers: { "X-Tenant": "t1" },
      fetch: fetchImpl,
    });

    const uploaded = await service.upload(fakeFile());
    expect(calls[0].url).toBe("https://api.test/default");
    expect((calls[0].init.headers as Record<string, string>)["X-Tenant"]).toBe("t1");
    expect(uploaded.url).toBe("/files/1");
  });

  test("upload failure surfaces the status", async () => {
    const { fetchImpl } = recordingFetch({ status: 413 });
    const service = new UrlFileUploadService({ fetch: fetchImpl });
    expect(
      service.upload(fakeFile(), { url: "https://api.test/uploads" })
    ).rejects.toThrow("Upload failed (413)");
  });

  test("remove deletes at the file url when absolute", async () => {
    const { calls, fetchImpl } = recordingFetch();
    const service = new UrlFileUploadService({ fetch: fetchImpl });

    await service.remove(
      { name: "doc.pdf", type: "application/pdf", size: 3, url: "https://cdn.test/doc.pdf" },
      { url: "https://api.test/uploads" }
    );

    expect(calls[0].url).toBe("https://cdn.test/doc.pdf");
    expect(calls[0].init.method).toBe("DELETE");
  });

  test("remove falls back to the upload url for relative file urls", async () => {
    const { calls, fetchImpl } = recordingFetch();
    const service = new UrlFileUploadService({ fetch: fetchImpl });

    await service.remove(
      { name: "doc.pdf", type: "application/pdf", size: 3, url: "/files/1" },
      { url: "https://api.test/uploads" }
    );

    expect(calls[0].url).toBe("https://api.test/uploads");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      url: "/files/1",
      name: "doc.pdf",
    });
  });

  test("missing url throws a clear error", () => {
    const service = new UrlFileUploadService();
    expect(service.upload(fakeFile())).rejects.toThrow("No upload URL configured");
  });
});
