import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient, ApiError } from "@/lib/api";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("apiClient", () => {
  it("should make GET request with correct URL", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, data: [] }),
    });

    const result = await apiClient("/api/trades");

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/trades",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );
    expect(result).toEqual({ success: true, data: [] });
  });

  it("should make POST request with body", async () => {
    const body = { stock_code: "000001" };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ success: true }),
    });

    await apiClient("/api/trades", {
      method: "POST",
      body: JSON.stringify(body),
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/trades",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(body),
      })
    );
  });

  it("should throw ApiError on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ message: "Not found" }),
    });

    await expect(apiClient("/api/trades/invalid")).rejects.toThrow(ApiError);
  });

  it("should include error status in ApiError", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: () => Promise.resolve({ message: "Conflict" }),
    });

    try {
      await apiClient("/api/trades/123");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(409);
    }
  });

  it("should return undefined for 204 No Content", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
    });

    const result = await apiClient("/api/trades/123", { method: "DELETE" });
    expect(result).toBeUndefined();
  });

  it("should handle JSON parse failure on error response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("Invalid JSON")),
    });

    await expect(apiClient("/api/trades")).rejects.toThrow(ApiError);
  });
});
