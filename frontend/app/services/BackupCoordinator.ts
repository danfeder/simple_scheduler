import { StorageService } from './StorageService';
import { toast } from '@/components/ui/use-toast';

export interface BackupMetadata {
  type: 'schedule' | 'constraints' | 'unscheduled_classes';
  timestamp: string;
  version: string;
}

export interface BackupData {
  metadata: BackupMetadata;
  data: any;
}

export class BackupCoordinator {
  private static instance: BackupCoordinator;
  private lastBackupVersion: string = '';

  private constructor() {}

  public static getInstance(): BackupCoordinator {
    if (!BackupCoordinator.instance) {
      BackupCoordinator.instance = new BackupCoordinator();
    }
    return BackupCoordinator.instance;
  }

  private generateBackupVersion(): string {
    return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public async createCoordinatedBackup(
    type: BackupMetadata['type'],
    data: any,
    options: { silent?: boolean } = {}
  ): Promise<boolean> {
    try {
      const backupVersion = this.generateBackupVersion();
      this.lastBackupVersion = backupVersion;

      await StorageService.createBackup({
        metadata: {
          type,
          timestamp: new Date().toISOString(),
          version: backupVersion
        },
        data
      });

      if (!options.silent) {
        toast({
          title: "Backup Created",
          description: `${type} backup saved successfully`,
        });
      }
      return true;
    } catch (error) {
      console.error(`Failed to create ${type} backup:`, error);
      if (!options.silent) {
        toast({
          title: "Backup Failed",
          description: `Failed to create ${type} backup: ${error.message}`,
          variant: "destructive",
        });
      }
      return false;
    }
  }

  public async restoreLatestBackup(
    type: BackupMetadata['type'],
    options: { silent?: boolean } = {}
  ): Promise<any> {
    try {
      const backups = await StorageService.getBackups(type);
      if (!backups.length) {
        if (!options.silent) {
          toast({
            title: "No Backups",
            description: `No ${type} backups found`,
            variant: "destructive",
          });
        }
        return null;
      }

      const latestBackup = backups[backups.length - 1];
      if (!options.silent) {
        toast({
          title: "Backup Restored",
          description: `${type} backup restored successfully`,
        });
      }
      return latestBackup.data;
    } catch (error) {
      console.error(`Failed to restore ${type} backup:`, error);
      if (!options.silent) {
        toast({
          title: "Restore Failed",
          description: `Failed to restore ${type} backup: ${error.message}`,
          variant: "destructive",
        });
      }
      return null;
    }
  }

  public async getBackupHistory(type: BackupMetadata['type']): Promise<BackupData[]> {
    try {
      return await StorageService.getBackups(type);
    } catch (error) {
      console.error(`Failed to get ${type} backup history:`, error);
      toast({
        title: "Error",
        description: `Failed to get backup history: ${error.message}`,
        variant: "destructive",
      });
      return [];
    }
  }
} 