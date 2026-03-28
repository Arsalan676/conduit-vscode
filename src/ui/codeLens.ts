import * as vscode from 'vscode';
import { Job } from '../api/client';

export class ResourceXCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;
  private latestJobs: Job[] = [];

  refresh(jobs?: Job[]): void {
    if (jobs !== undefined) {
      this.latestJobs = jobs;
    }
    this._onDidChangeCodeLenses.fire();
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    if (document.languageId !== 'python') {
      return [];
    }

    const lenses: vscode.CodeLens[] = [];

    for (let i = 0; i < document.lineCount; i++) {
      const lineText = document.lineAt(i).text;
      const isMainBlock =
        lineText.includes('if __name__ == "__main__":') ||
        lineText.includes("if __name__ == '__main__':");

      if (!isMainBlock) {
        continue;
      }

      const range = new vscode.Range(i, 0, i, lineText.length);

      // First CodeLens: Submit button
      lenses.push(
        new vscode.CodeLens(range, {
          title: '$(circuit-board) Run on Conduit GPU',
          command: 'conduit.submitJob',
          arguments: [document.uri],
        })
      );

      // Second CodeLens: Last job status (only if a completed or running job exists)
      const relevantJobs = this.latestJobs.filter(
        (j) => j.status === 'completed' || j.status === 'running'
      );

      if (relevantJobs.length > 0) {
        const lastJob = relevantJobs.reduce((a, b) => (a.id > b.id ? a : b));
        lenses.push(
          new vscode.CodeLens(range, {
            title: `Last: #${lastJob.id} ${lastJob.status} — ${lastJob.task_type ?? 'unknown'}`,
            command: 'conduit.showJobs',
          })
        );
      }
    }

    return lenses;
  }
}