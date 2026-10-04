import type { VideoProvider } from "./contract";

export class ProviderRegistry {
  private readonly providers = new Map<string, VideoProvider>();

  register(provider: VideoProvider): void {
    if (this.providers.has(provider.id)) throw new Error(`Provider already registered: ${provider.id}`);
    this.providers.set(provider.id, provider);
  }

  get(id: string): VideoProvider {
    const provider = this.providers.get(id);
    if (!provider) throw new Error(`Unknown provider: ${id}`);
    return provider;
  }

  list(): VideoProvider[] {
    return [...this.providers.values()];
  }
}
