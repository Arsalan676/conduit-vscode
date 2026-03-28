import * as vscode from 'vscode';
import { Provider, getProviders } from '../api/client';

export class ProviderPoller {
  private interval: NodeJS.Timeout | undefined;
  private hasShownConnectionError = false;
  private lastKnownProviders: Provider[] = [];
  private callback: (providers: Provider[]) => void;

  constructor(callback: (providers: Provider[]) => void) {
    this.callback = callback;
  }

  start(): void {
    const PROVIDER_POLL_INTERVAL = 15000;

    this.interval = setInterval(async () => {
      try {
        const providers = await getProviders();
        this.hasShownConnectionError = false;
        this.lastKnownProviders = providers;
        this.callback(providers);
      } catch (err) {
        if (!this.hasShownConnectionError) {
          this.hasShownConnectionError = true;
          const url = vscode.workspace
            .getConfiguration('conduit')
            .get<string>('serverUrl', 'http://localhost:8000');
          vscode.window.showWarningMessage(
            `Conduit: Cannot reach server at ${url} — is the ResourceX backend running?`
          );
        }
      }
    }, PROVIDER_POLL_INTERVAL);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  getProviders(): Provider[] {
    return this.lastKnownProviders;
  }
}