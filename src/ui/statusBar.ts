import * as vscode from 'vscode';
import { Job } from '../api/client';

export class StatusBarManager {
  private item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.item.command = 'conduit.showJobs';
    this.item.text = '$(circuit-board) Conduit';
    this.item.show();
  }

  update(jobs: Job[]): void {
    const running   = jobs.filter((j) => j.status === 'running').length;
    const pending   = jobs.filter((j) => j.status === 'pending').length;
    const failed    = jobs.filter((j) => j.status === 'failed').length;
    const completed = jobs.filter((j) => j.status === 'completed').length;

    if (running > 0) {
      this.item.text = `$(loading~spin) Conduit: ${running} running`;
      this.item.backgroundColor = new vscode.ThemeColor(
        'statusBarItem.warningBackground'
      );
    } else if (pending > 0) {
      this.item.text = `$(clock) Conduit: ${pending} pending`;
      this.item.backgroundColor = undefined;
    } else if (failed > 0) {
      this.item.text = `$(error) Conduit: ${failed} failed`;
      this.item.backgroundColor = new vscode.ThemeColor(
        'statusBarItem.errorBackground'
      );
    } else {
      this.item.text = '$(circuit-board) Conduit';
      this.item.backgroundColor = undefined;
    }

    this.item.tooltip =
      `${running} running · ${pending} pending · ${completed} completed · ${failed} failed`;
  }

  dispose(): void {
    this.item.dispose();
  }
}