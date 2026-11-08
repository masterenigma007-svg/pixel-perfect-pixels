import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => "android" },
}));
vi.mock("@squareetlabs/capacitor-subscriptions", () => ({
  Subscriptions: { getProductDetails: vi.fn() },
}));

import { Subscriptions } from "@squareetlabs/capacitor-subscriptions";
import { getRemoveAdsOffer } from "@/lib/monetization";

describe("Remove Ads store availability", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the localized Play price only when a real offer exists", async () => {
    vi.mocked(Subscriptions.getProductDetails).mockResolvedValue({
      responseCode: 0,
      data: { productIdentifier: "remove_ads_199", price: "$1.99" },
    } as any);
    expect(await getRemoveAdsOffer()).toEqual({ status: "available", price: "$1.99" });
  });

  it("disables purchasing when no Play product is configured", async () => {
    vi.mocked(Subscriptions.getProductDetails).mockResolvedValue({
      responseCode: 4,
      responseMessage: "Item unavailable",
    } as any);
    expect((await getRemoveAdsOffer()).status).toBe("unavailable");
  });

  it("distinguishes a connecting Billing client from a missing product", async () => {
    vi.mocked(Subscriptions.getProductDetails).mockResolvedValue({
      responseCode: 503,
      responseMessage: "Still initialising",
    } as any);
    expect((await getRemoveAdsOffer()).status).toBe("connecting");
  });
});
