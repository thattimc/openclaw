import type { OpenClawConfig } from "../config/types.openclaw.js";
import { resolveOwningPluginIdsForProvider } from "../plugins/providers.js";
import { normalizeProviderId } from "./provider-id.js";

export type LiveProviderOwnerContext = {
  config?: OpenClawConfig;
  workspaceDir?: string;
  env?: NodeJS.ProcessEnv;
  ownerCache: Map<string, readonly string[]>;
};

const BUILT_IN_PROVIDER_OWNER_FALLBACKS: ReadonlyMap<string, readonly string[]> = new Map([
  ["anthropic", ["anthropic"]],
  ["claude-cli", ["anthropic"]],
  ["codex-cli", ["openai"]],
  ["google", ["google"]],
  ["google-gemini-cli", ["google"]],
  ["minimax", ["minimax"]],
  ["minimax-portal", ["minimax"]],
  ["minimax-portal-auth", ["minimax"]],
  ["openai", ["openai"]],
  ["openai-codex", ["openai"]],
]);

function normalizeBuiltInProviderOwnerAliases(owners: readonly string[]): readonly string[] {
  return [
    ...new Set(owners.flatMap((owner) => BUILT_IN_PROVIDER_OWNER_FALLBACKS.get(owner) ?? [owner])),
  ].toSorted((left, right) => left.localeCompare(right));
}

export function resolveCachedOwningPluginIdsForProvider(
  provider: string,
  context: LiveProviderOwnerContext,
): readonly string[] {
  const normalized = normalizeProviderId(provider);
  const cached = context.ownerCache.get(normalized);
  if (cached) {
    return cached;
  }
  const owners = normalizeBuiltInProviderOwnerAliases(
    resolveOwningPluginIdsForProvider({
      provider: normalized,
      config: context.config,
      workspaceDir: context.workspaceDir,
      env: context.env,
    }) ??
      BUILT_IN_PROVIDER_OWNER_FALLBACKS.get(normalized) ??
      [],
  );
  context.ownerCache.set(normalized, owners);
  return owners;
}

export function liveProvidersShareOwningPlugin(
  left: string,
  right: string,
  context: LiveProviderOwnerContext,
): boolean {
  const leftOwners = resolveCachedOwningPluginIdsForProvider(left, context);
  const rightOwners = resolveCachedOwningPluginIdsForProvider(right, context);
  return leftOwners.some((owner) => rightOwners.includes(owner));
}
