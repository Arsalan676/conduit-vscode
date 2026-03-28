import * as vscode from 'vscode';
import { Job, Provider } from '../api/client';
import { getBidsForJob } from '../agents/bidInspector';

// ─── TreeItem ─────────────────────────────────────────────────────────────────

export class ConduitTreeItem extends vscode.TreeItem {
  jobId?: number;
  providerId?: number;
  kind:
    | 'jobsHeader'
    | 'job'
    | 'jobDetail'
    | 'bid'
    | 'providersHeader'
    | 'provider';

  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    kind: ConduitTreeItem['kind'],
    options?: {
      jobId?: number;
      providerId?: number;
      description?: string;
      tooltip?: string;
      iconPath?: vscode.ThemeIcon;
    }
  ) {
    super(label, collapsibleState);
    this.kind = kind;
    this.jobId = options?.jobId;
    this.providerId = options?.providerId;
    if (options?.description) { this.description = options.description; }
    if (options?.tooltip) { this.tooltip = options.tooltip; }
    if (options?.iconPath) { this.iconPath = options.iconPath; }
  }
}

// ─── Status Icon Helpers ──────────────────────────────────────────────────────

function jobStatusIcon(status: Job['status']): vscode.ThemeIcon {
  switch (status) {
    case 'pending':   return new vscode.ThemeIcon('clock');
    case 'running':   return new vscode.ThemeIcon('loading~spin');
    case 'completed': return new vscode.ThemeIcon('check');
    case 'failed':    return new vscode.ThemeIcon('error');
    case 'migrating': return new vscode.ThemeIcon('sync~spin');
    case 'scheduled': return new vscode.ThemeIcon('calendar');
    default:          return new vscode.ThemeIcon('circle-outline');
  }
}

function providerStatusIcon(status: string): vscode.ThemeIcon {
  return status === 'online'
    ? new vscode.ThemeIcon('vm-running')
    : new vscode.ThemeIcon('vm-outline');
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export class ConduitTreeProvider
  implements vscode.TreeDataProvider<ConduitTreeItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    ConduitTreeItem | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private jobs: Job[] = [];
  private providers: Provider[] = [];

  refresh(jobs: Job[], providers: Provider[]): void {
    this.jobs = jobs;
    this.providers = providers;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ConduitTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: ConduitTreeItem): ConduitTreeItem[] {
    // Root level
    if (!element) {
      return [
        new ConduitTreeItem(
          'JOBS',
          vscode.TreeItemCollapsibleState.Expanded,
          'jobsHeader'
        ),
        new ConduitTreeItem(
          'PROVIDERS',
          vscode.TreeItemCollapsibleState.Expanded,
          'providersHeader'
        ),
      ];
    }

    // Jobs header → list of jobs
    if (element.kind === 'jobsHeader') {
      return this.jobs.map((job) => {
        const icon = jobStatusIcon(job.status);
        return new ConduitTreeItem(
          `Job #${job.id}`,
          vscode.TreeItemCollapsibleState.Collapsed,
          'job',
          {
            jobId: job.id,
            description: job.status,
            iconPath: icon,
          }
        );
      });
    }

    // Job item → detail children
    if (element.kind === 'job' && element.jobId !== undefined) {
      const job = this.jobs.find((j) => j.id === element.jobId);
      if (!job) { return []; }

      const provider = this.providers.find(
        (p) => p.id === job.current_provider_id
      );

      const details: ConduitTreeItem[] = [];

      // Provider detail
      details.push(
        new ConduitTreeItem(
          `Provider: ${provider ? `${provider.name} (${provider.gpu_spec})` : job.current_provider_id ?? 'None'}`,
          vscode.TreeItemCollapsibleState.None,
          'jobDetail',
          { jobId: job.id }
        )
      );

      // Task type
      details.push(
        new ConduitTreeItem(
          `Task: ${job.task_type ?? 'unknown'}`,
          vscode.TreeItemCollapsibleState.None,
          'jobDetail',
          { jobId: job.id }
        )
      );

      // Retries
      details.push(
        new ConduitTreeItem(
          `Retries: ${job.retry_count}`,
          vscode.TreeItemCollapsibleState.None,
          'jobDetail',
          { jobId: job.id }
        )
      );

      // Budget
      if (provider) {
        details.push(
          new ConduitTreeItem(
            `Budget: $${provider.price.toFixed(2)}/hr`,
            vscode.TreeItemCollapsibleState.None,
            'jobDetail',
            { jobId: job.id }
          )
        );
      }

      // Bid results if available
      const bids = getBidsForJob(job.id);
      if (bids) {
        const speedProvider = this.providers.find(
          (p) => p.id === bids.speed.provider_id
        );
        const costProvider = this.providers.find(
          (p) => p.id === bids.cost.provider_id
        );
        const arbiterProvider = this.providers.find(
          (p) => p.id === bids.arbiter.provider_id
        );

        details.push(
          new ConduitTreeItem(
            `Speed pick: ${speedProvider?.name ?? `#${bids.speed.provider_id}`}`,
            vscode.TreeItemCollapsibleState.None,
            'bid',
            { jobId: job.id, description: bids.speed.reason }
          )
        );

        details.push(
          new ConduitTreeItem(
            `Cost pick: ${costProvider?.name ?? `#${bids.cost.provider_id}`}`,
            vscode.TreeItemCollapsibleState.None,
            'bid',
            { jobId: job.id, description: bids.cost.reason }
          )
        );

        details.push(
          new ConduitTreeItem(
            `Arbiter: ${arbiterProvider?.name ?? `#${bids.arbiter.provider_id}`}`,
            vscode.TreeItemCollapsibleState.None,
            'bid',
            { jobId: job.id, description: bids.arbiter.reason }
          )
        );
      }

      return details;
    }

    // Providers header → list of providers
    if (element.kind === 'providersHeader') {
      return this.providers.map((p) => {
        const icon = providerStatusIcon(p.status);
        return new ConduitTreeItem(
          `${p.name}  —  ${p.status}  ${p.gpu_spec}`,
          vscode.TreeItemCollapsibleState.None,
          'provider',
          {
            providerId: p.id,
            description: `$${p.price.toFixed(2)}/hr · reliability ${p.reliability_score.toFixed(2)}`,
            tooltip: `CPU ${p.cpu_usage}% · MEM ${p.memory_usage}%`,
            iconPath: icon,
          }
        );
      });
    }

    return [];
  }
}