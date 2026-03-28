import * as vscode from 'vscode';
import { StatusBarManager }          from './ui/statusBar';
import { ConduitTreeProvider }        from './ui/sidebarPanel';
import { DiagnosticsManager }         from './ui/diagnostics';
import { ResourceXCodeLensProvider }  from './ui/codeLens';
import { JobMonitor }                 from './agents/jobMonitor';
import { submitFile }                 from './agents/autoSubmit';
import { JobPoller }                  from './loops/jobPoller';
import { ProviderPoller }             from './loops/providerPoller';
import { FileWatcher }                from './loops/fileWatcher';

export function activate(context: vscode.ExtensionContext): void {

  const statusBar    = new StatusBarManager();
  const treeProvider = new ConduitTreeProvider();
  const diagnostics  = new DiagnosticsManager();
  const jobMonitor   = new JobMonitor(diagnostics);
  const codeLens     = new ResourceXCodeLensProvider();

  const providerPoller = new ProviderPoller((providers) => {
    treeProvider.refresh(jobMonitor.getJobs(), providers);
  });

  const jobPoller = new JobPoller((jobs) => {
    jobMonitor.update(jobs);
    statusBar.update(jobs);
    treeProvider.refresh(jobs, providerPoller.getProviders());
    codeLens.refresh(jobs);
  });

  vscode.window.registerTreeDataProvider('conduit.jobs',      treeProvider);
  vscode.window.registerTreeDataProvider('conduit.providers', treeProvider);

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { language: 'python' },
      codeLens
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'conduit.submitJob',
      async (uri?: vscode.Uri) => {
        const doc = uri
          ? await vscode.workspace.openTextDocument(uri)
          : vscode.window.activeTextEditor?.document;
        if (doc) { await submitFile(doc); }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('conduit.showJobs', () => {
      vscode.commands.executeCommand('conduit.jobs.focus');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('conduit.showProviders', () => {
      vscode.commands.executeCommand('conduit.providers.focus');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('conduit.openDashboard', () => {
      const url = vscode.workspace
        .getConfiguration('conduit')
        .get<string>('serverUrl', 'http://localhost:8000');
      vscode.env.openExternal(vscode.Uri.parse(url));
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('conduit.clearDiagnostics', () => {
      diagnostics.clear();
    })
  );

  const fileWatcher = new FileWatcher(codeLens);
  fileWatcher.start(context);

  providerPoller.start();
  jobPoller.start();

  context.subscriptions.push({
    dispose: () => {
      jobPoller.stop();
      providerPoller.stop();
      statusBar.dispose();
      diagnostics.dispose();
    },
  });

  vscode.window.showInformationMessage(
    'Conduit is active — connect to ResourceX at ' +
      vscode.workspace
        .getConfiguration('conduit')
        .get<string>('serverUrl', 'http://localhost:8000')
  );
}

export function deactivate(): void {}