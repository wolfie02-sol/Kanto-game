/** Documented Invoiced API. Verified 2026-11-11:
 * https://docs.collectorcrypt.com/gacha/invoiced-api
 * Development only; this application intentionally cannot issue real cards yet.
 */
export class CollectorCryptDevelopment {
  constructor({ apiKey, packType, fetcher = fetch }) {
    if (!apiKey || !packType)
      throw Error("Collector Crypt development key and machine code required");
    this.apiKey = apiKey;
    this.packType = packType;
    this.fetcher = fetcher;
  }
  async fulfill({ id, playerRef }) {
    const response = await this.fetcher(
      "https://dev-gacha.collectorcrypt.com/api/v1/packs/instant",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
        },
        body: JSON.stringify({
          packType: this.packType,
          playerRef,
          clientRef: id,
        }),
        signal: AbortSignal.timeout(15000),
      },
    );
    const body = await response.json();
    const result = body.results?.[0];
    if (
      !response.ok ||
      !result?.success ||
      result.status !== 200 ||
      !result.nftAddress
    )
      throw Error("Collector Crypt development award pending");
    return {
      mode: "collector-crypt-development",
      memo: result.memo,
      nftAddress: result.nftAddress,
      cardName: result.cardName,
      custody: "Collector Crypt development custody",
    };
  }
}
export class SandboxProvider {
  async fulfill({ id }) {
    return {
      mode: "sandbox",
      reference: `mock-${id}`,
      cardName: "Demo collectible card",
      custody: "Simulated — no real card, NFT, or shipment",
    };
  }
}
