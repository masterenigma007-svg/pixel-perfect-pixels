import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => "android" },
}));
vi.mock("@squareetlabs/capacitor-subscriptions", () => ({
  Subscriptions: {
    getProductDetails: vi.fn(),
    purchaseProduct: vi.fn(),
  },
}));

import { Subscriptions } from "@squareetlabs/capacitor-subscriptions";
import {
  REMOVE_ADS_SALES_ENABLED,
  REMOVE_ADS_UNAVAILABLE_MESSAGE,
  getRemoveAdsOffer,
  purchaseRemoveAds,
  restorePurchases,
} from "@/lib/monetization";

describe("version 5 billing compliance release: no new sales", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps the sales gate disabled", () => {
    expect(REMOVE_ADS_SALES_ENABLED).toBe(false);
  });

  it("does not advertise a purchase even if Play later configures a product", async () => {
    vi.mocked(Subscriptions.getProductDetails).mockResolvedValue({
      responseCode: 0,
      data: { productIdentifier: "remove_ads_199", price: "$1.99" },
    } as any);

    expect(await getRemoveAdsOffer()).toEqual({
      status: "unavailable",
      message: REMOVE_ADS_UNAVAILABLE_MESSAGE,
    });
    expect(Subscriptions.getProductDetails).not.toHaveBeenCalled();
  });

  it("never launches native billing while sales are disabled", async () => {
    const result = await purchaseRemoveAds();
    expect(result).toEqual({ ok: false, message: REMOVE_ADS_UNAVAILABLE_MESSAGE });
    expect(Subscriptions.purchaseProduct).not.toHaveBeenCalled();
  });

  it("retains the restore entry point for pre-existing entitlements", () => {
    expect(restorePurchases).toEqual(expect.any(Function));
  });
});
