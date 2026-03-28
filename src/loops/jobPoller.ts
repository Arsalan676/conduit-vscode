import * as vscode from 'vscode';
import { Job, getJobs } from '../api/client';

export class JobPoller {
  private interval: NodeJS.Timeout | undefined;
  private hasShownConnectionError = false;
  private callback: (jobs: Job[]) => void;

  constructor(callback: (jobs: Job[]) => void) {
    this.callback = callback;
  }

  start(): void {
    const pollInterval = vscode.workspace
      .getConfiguration('conduit')
      .get<number>('pollInterval', 5000);

    this.interval = setInterval(async () => {
      try {
        const jobs = await getJobs();
        this.hasShownConnectionError = false;
        this.callback(jobs);
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
        // Retry silently on every subsequent tick
      }
    }, pollInterval);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }
}