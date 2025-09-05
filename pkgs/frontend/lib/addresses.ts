import type { Address } from "viem";

// Allow overriding via env. Fallback to repo's Sepolia deployments.
const FALLBACK_FACTORY = "0x57811ce07C616db1373b77ed97A2BDCEA336Fb73" as Address;
const FALLBACK_ROUTER = "0x29C854E385bdf0d9Df1e6C71B7E82580adaE41C0" as Address;

const env = (key: string) => (typeof process !== "undefined" ? (process.env as any)[key] : undefined);

export const FACTORY_ADDRESS = ((env("NEXT_PUBLIC_AMM_FACTORY_ADDRESS") || FALLBACK_FACTORY) as string) as Address;
export const ROUTER_ADDRESS = ((env("NEXT_PUBLIC_AMM_ROUTER_ADDRESS") || FALLBACK_ROUTER) as string) as Address;

export function isAddressLike(value: string | undefined | null): value is Address {
  return !!value && /^0x[a-fA-F0-9]{40}$/.test(value);
}

