import * as vscode from 'vscode';
import { submitFile } from '../agents/autoSubmit';
import { ResourceXCodeLensProvider } from '../ui/codeLens';

const ML_PATTERNS = [
  'torch',
  'tensorflow',
  'keras',
  'model.fit',
  'optimizer.step',
  'train_loader',
  'DataLoader',
  'nn.Module',
  'torch.nn',
  'tf.keras',
  'from torch',
  'import torch',
];

export class FileWatcher {
  private codeLensProvider: ResourceXCodeLensProvider;

  constructor(codeLensProvider: ResourceXCodeLensProvider) {
    this.codeLensProvider = codeLensProvider;
  }

  start(context: vscode.ExtensionContext): void {
    const disposable = vscode.workspace.onDidSaveTextDocument(async (document) => {
      if (document.languageId !== 'python') {
        return;
      }

      const content = document.getText();
      if (!this.detectMLPattern(content)) {
        return;
      }

      const autoSubmit = vscode.workspace
        .getConfiguration('conduit')
        .get<boolean>('autoSubmit', false);

      if (autoSubmit) {
        await submitFile(document);
      } else {
        this.codeLensProvider.refresh();
      }
    });

    context.subscriptions.push(disposable);
  }

  detectMLPattern(content: string): boolean {
    return ML_PATTERNS.some((pattern) => content.includes(pattern));
  }
}