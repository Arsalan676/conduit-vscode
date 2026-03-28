import * as vscode from 'vscode';
import { Job } from '../api/client';
import { DiagnosticsManager } from '../ui/diagnostics';
import { submitScript } from './autoSubmit';

export async function handleFailure(
  job: Job,
  diagnosticsManager: DiagnosticsManager
): Promise<void> {
  // Parse diagnosis: "{ cause } | Action: { action } | { recommendation }"
  const diagnosisRaw = job.diagnosis ?? 'Unknown failure';
  const parts = diagnosisRaw.split(' | ');
  const cause = parts[0] ?? diagnosisRaw;
  // action and recommendation are parsed but used contextually
  // const action = parts[1] ?? '';
  // const recommendation = parts[2] ?? '';

  // Write diagnostic to active Python editor if available
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor && activeEditor.document.languageId === 'python') {
    diagnosticsManager.setFailure(activeEditor.document.uri, cause);
  }

  // Show warning with Retry / Dismiss buttons
  const choice = await vscode.window.showWarningMessage(
    `Conduit: Job #${job.id} failed — ${cause}`,
    'Retry',
    'Dismiss'
  );

  if (choice === 'Retry') {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.languageId === 'python') {
      const script = editor.document.getText();
      try {
        await submitScript(script, job.task_type ?? undefined);
        if (activeEditor) {
          diagnosticsManager.clear(activeEditor.document.uri);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Conduit: Retry failed — ${message}`);
      }
    } else {
      vscode.window.showWarningMessage(
        'Conduit: No active Python file open to retry.'
      );
    }
  } else if (choice === 'Dismiss') {
    if (activeEditor) {
      diagnosticsManager.clear(activeEditor.document.uri);
    }
  }
}