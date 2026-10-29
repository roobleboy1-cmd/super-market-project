import { InventoryLot } from '../models/InventoryLot';
import { Product } from '../models/Product';
import { NotificationService } from '../services/notification.service';
import { UserRole } from '../types/roles';
import { logger } from '../config/logger';

export class ExpirationAndStockJob {
  /**
   * Run periodic check for expiring batches and products below min stock
   */
  static async runChecks(): Promise<void> {
    try {
      const now = new Date();
      const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // 1. Mark expired lots
      const expiredLots = await InventoryLot.updateMany(
        {
          status: 'active',
          expirationDate: { $lte: now }
        },
        {
          $set: { status: 'expired' }
        }
      );

      if (expiredLots.modifiedCount > 0) {
        logger.warn(`⚠️ System marked ${expiredLots.modifiedCount} lot(s) as EXPIRED.`);
        await NotificationService.createNotification({
          title: 'Batches Expired',
          message: `${expiredLots.modifiedCount} batch lot(s) have reached expiration and were marked as expired to prevent selling.`,
          type: 'EXPIRING_PRODUCT',
          targetRoles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_MANAGER],
          isUrgent: true
        });
      }

      // 2. Alert for lots expiring within 30 days
      const expiringSoonCount = await InventoryLot.countDocuments({
        status: 'active',
        remainingQuantity: { $gt: 0 },
        expirationDate: { $gt: now, $lte: in30Days }
      });

      if (expiringSoonCount > 0) {
        await NotificationService.createNotification({
          title: 'Batches Expiring Soon',
          message: `${expiringSoonCount} lot(s) are expiring within the next 30 days. Consider promotions or returns.`,
          type: 'EXPIRING_PRODUCT',
          targetRoles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_MANAGER]
        });
      }

      // 3. Alert for low stock items
      const lowStockCount = await Product.countDocuments({
        isArchived: false,
        $expr: {
          $and: [
            { $lte: ['$currentStock', '$minStockLevel'] },
            { $gt: ['$currentStock', 0] }
          ]
        }
      });

      if (lowStockCount > 0) {
        await NotificationService.createNotification({
          title: 'Low Stock Alert',
          message: `${lowStockCount} product(s) are currently below their minimum reorder thresholds.`,
          type: 'LOW_STOCK',
          targetRoles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_MANAGER]
        });
      }
    } catch (error: any) {
      logger.error(`Error executing expiration and stock checks: ${error.message}`);
    }
  }

  static startCron(intervalMs = 60 * 60 * 1000): NodeJS.Timeout {
    // Run initial check after 10 seconds
    setTimeout(() => {
      ExpirationAndStockJob.runChecks();
    }, 10000);

    return setInterval(() => {
      ExpirationAndStockJob.runChecks();
    }, intervalMs);
  }
}
