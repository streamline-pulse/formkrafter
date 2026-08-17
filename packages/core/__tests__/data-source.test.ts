import { afterEach, describe, expect, test } from "bun:test";
import { FetchDataSourceService } from "../lib/services/data_source_service";

const realFetch = globalThis.fetch;

const serving = (payload: unknown, ok = true) => {
    globalThis.fetch = (async () =>
        ({
            ok,
            status: ok ? 200 : 500,
            json: async () => payload,
        })) as unknown as typeof fetch;
};

afterEach(() => {
    globalThis.fetch = realFetch;
});

const options = [{ label: "A", value: "a" }];

describe("fetchOptions payload shapes", () => {
    test("a bare array is used as is", async () => {
        serving(options);
        expect(await new FetchDataSourceService().fetchOptions("/a")).toEqual(options);
    });

    test("a { data: [...] } envelope resolves without any config", async () => {
        serving({ data: options, page: 1, pages: 1, perPage: 50, total: 1 });
        expect(await new FetchDataSourceService().fetchOptions("/b")).toEqual(options);
    });

    test("optionsPath addresses any other envelope", async () => {
        serving({ result: { items: options } });
        expect(
            await new FetchDataSourceService().fetchOptions("/c", {
                path: "result.items",
            })
        ).toEqual(options);
    });

    test("optionsPath wins over the lenient default", async () => {
        serving({ data: [], result: { items: options } });
        expect(
            await new FetchDataSourceService().fetchOptions("/d", {
                path: "result.items",
            })
        ).toEqual(options);
    });

    test("anything else still throws loudly", async () => {
        serving({ message: "deprecated endpoint" });
        await expect(
            new FetchDataSourceService().fetchOptions("/e")
        ).rejects.toThrow("did not return an array");
    });

    test("a path that resolves to no array names the path it tried", async () => {
        serving({ result: { items: "nope" } });
        await expect(
            new FetchDataSourceService().fetchOptions("/f", { path: "result.items" })
        ).rejects.toThrow('no array at "result.items"');
    });

    test("a data property that is not an array is not coerced", async () => {
        serving({ data: { nested: options } });
        await expect(
            new FetchDataSourceService().fetchOptions("/g")
        ).rejects.toThrow("did not return an array");
    });

    test("responses are cached per path, not per url alone", async () => {
        serving({ data: options, result: { items: [] } });
        const service = new FetchDataSourceService();

        expect(await service.fetchOptions("/h")).toEqual(options);
        expect(await service.fetchOptions("/h", { path: "result.items" })).toEqual([]);
    });
});
