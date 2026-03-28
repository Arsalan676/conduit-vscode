import * as vscode from 'vscode';
import { Job } from '../api/client';
import { DiagnosticsManager } from '../ui/diagnostics';
import { handleFailure } from './failureRecovery';
import { fetchAndShowBids } from './bidInspector';

export class JobMonitor {
  private previousJobs: Map<number, Job> = new Map();
  private currentJobs: Job[] = [];
  private diagnosticsManager: DiagnosticsManager;

  constructor(diagnosticsManager: DiagnosticsManager) {
    this.diagnosticsManager = diagnosticsManager;
  }

  update(jobs: Job[]): void {
    for (const job of jobs) {
      const prev = this.previousJobs.get(job.id);
      const prevStatus = prev?.status;
      const newStatus = job.status;

      if (prevStatus !== newStatus) {
        switch (newStatus) {
          case 'completed':
            vscode.window.showInformationMessage(
              `Conduit: Job #${job.id} completed on provider #${job.current_provider_id}`
            );
            break;

          case 'failed':
            vscode.window.showWarningMessage(
              `Conduit: Job #${job.id} failed — ${job.diagnosis ?? 'No diagnosis available'}`
            );
            handleFailure(job, this.diagnosticsManager);
            break;

          case 'running':
            // Fire and forget — do not await
            fetchAndShowBids(job.id);
            break;

          case 'migrating':
            vscode.window.showInformationMessage(
              `Conduit: Job #${job.id} is being migrated to a new provider`
            );
            break;
        }
      }

      this.previousJobs.set(job.id, job);
    }

    this.currentJobs = jobs;
  }

  getJobs(): Job[] {
    return this.currentJobs;
  }
}