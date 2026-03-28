import * as vscode from 'vscode';
import { createJob, CreateJobResponse } from '../api/client';

export async function submitFile(document: vscode.TextDocument): Promise<void> {
  const content = document.getText();
  const budget = vscode.workspace
    .getConfiguration('conduit')
    .get<number | null>('budget', null) ?? undefined;

  try {
    const result = await createJob(content, undefined, budget);
    vscode.window.showInformationMessage(
      `Conduit: Job #${result.id} submitted — task type: ${result.task_type ?? 'unknown'}`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`Conduit: Submission failed — ${message}`);
  }
}

export async function submitScript(
  script: string,
  taskType?: string
): Promise<CreateJobResponse> {
  const budget = vscode.workspace
    .getConfiguration('conduit')
    .get<number | null>('budget', null) ?? undefined;

  return createJob(script, taskType, budget);
}