import mongoose from 'mongoose';
import { CashierShift, ICashierShift } from '../models/CashierShift';
import { CashMovement, CashMovementType } from '../models/CashMovement';
import { generateReceiptNumber } from '../utils/crypto';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import { AuditService } from './audit.service';
import { NotificationService } from './notification.service';
import { UserRole } from '../types/roles';

export class ShiftService {
  static async getShifts(query: { cashierId?: string; status?: string; page?: number; limit?: number }) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (query.cashierId) filter.cashierId = new mongoose.Types.ObjectId(query.cashierId);
    if (query.status) filter.status = query.status;

    const [shifts, total] = await Promise.all([
      CashierShift.find(filter)
        .populate('cashierId', 'name email role')
        .populate('approvedBy', 'name email')
        .sort({ openedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CashierShift.countDocuments(filter)
    ]);

    return {
      shifts,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  static async getShiftById(id: string) {
    const shift = await CashierShift.findById(id)
      .populate('cashierId', 'name email role')
      .populate('closedBy', 'name email')
      .populate('approvedBy', 'name email');
    if (!shift) throw new NotFoundError('Cashier shift not found');

    const movements = await CashMovement.find({ shiftId: shift._id })
      .populate('performedBy', 'name email')
      .sort({ createdAt: 1 })
      .lean();

    return {
      shift,
      movements
    };
  }

  /**
   * Open a new cashier shift (prevents duplicate active shifts for the same cashier)
   */
  static async openShift(cashierId: string, openingCash: number) {
    // Concurrency check: Ensure cashier does not already have an active open shift
    const existingOpenShift = await CashierShift.findOne({
      cashierId: new mongoose.Types.ObjectId(cashierId),
      status: 'open'
    });

    if (existingOpenShift) {
      throw new ConflictError(
        `Cashier already has an active open shift (#${existingOpenShift.shiftNumber}). Please close it first.`
      );
    }

    const shiftNumber = generateReceiptNumber('SHIFT');
    const shift = await CashierShift.create({
      shiftNumber,
      cashierId: new mongoose.Types.ObjectId(cashierId),
      openedAt: new Date(),
      openingCash,
      totalSalesCash: 0,
      totalCashPayIn: 0,
      totalCashPayOut: 0,
      totalCashDrop: 0,
      expectedCash: openingCash,
      status: 'open'
    });

    await AuditService.log({
      actorId: cashierId,
      action: 'SHIFT_OPENED',
      entity: 'CashierShift',
      entityId: (shift._id as any).toString(),
      changes: { shiftNumber, openingCash }
    });

    return shift;
  }

  /**
   * Record a register cash movement (Pay In, Pay Out, Drop)
   */
  static async recordCashMovement(
    shiftId: string,
    data: {
      movementType: CashMovementType;
      amount: number;
      reason: string;
    },
    userId: string
  ) {
    const shift = await CashierShift.findById(shiftId);
    if (!shift) throw new NotFoundError('Shift not found');
    if (shift.status !== 'open') {
      throw new ConflictError(`Cannot add cash movement to a ${shift.status} shift.`);
    }

    const movement = await CashMovement.create({
      shiftId: shift._id,
      movementType: data.movementType,
      amount: data.amount,
      reason: data.reason,
      performedBy: new mongoose.Types.ObjectId(userId)
    });

    // Update shift counters
    if (data.movementType === 'PAY_IN') {
      shift.totalCashPayIn += data.amount;
    } else if (data.movementType === 'PAY_OUT') {
      shift.totalCashPayOut += data.amount;
    } else if (data.movementType === 'DROP') {
      shift.totalCashDrop += data.amount;
    }

    await shift.save();

    await AuditService.log({
      actorId: userId,
      action: `SHIFT_CASH_${data.movementType}`,
      entity: 'CashMovement',
      entityId: (movement._id as any).toString(),
      changes: { shiftId, amount: data.amount, reason: data.reason }
    });

    return movement;
  }

  /**
   * Close a cashier shift: calculates expected drawer cash and compares with counted cash
   */
  static async closeShift(shiftId: string, countedCash: number, notes: string | undefined, cashierId: string) {
    const shift = await CashierShift.findById(shiftId);
    if (!shift) throw new NotFoundError('Shift not found');
    if (shift.status !== 'open') {
      throw new ConflictError(`Shift is already ${shift.status}`);
    }

    // Expected cash = Opening + Total Sales Cash + Pay In - Pay Out - Cash Drop
    const expectedCash = Number(
      (
        shift.openingCash +
        shift.totalSalesCash +
        shift.totalCashPayIn -
        shift.totalCashPayOut -
        shift.totalCashDrop
      ).toFixed(2)
    );

    const cashDiscrepancy = Number((countedCash - expectedCash).toFixed(2));

    shift.closedAt = new Date();
    shift.expectedCash = expectedCash;
    shift.countedCash = countedCash;
    shift.cashDiscrepancy = cashDiscrepancy;
    shift.status = 'closed';
    shift.closedBy = new mongoose.Types.ObjectId(cashierId);
    if (notes) shift.notes = notes;

    await shift.save();

    // Alert management if there is a cash discrepancy
    if (Math.abs(cashDiscrepancy) > 0.01) {
      await NotificationService.createNotification({
        title: 'Shift Closed with Cash Discrepancy',
        message: `Shift #${shift.shiftNumber} closed with variance of $${cashDiscrepancy} (Expected: $${expectedCash}, Counted: $${countedCash}).`,
        type: 'SHIFT_CLOSED',
        targetRoles: [UserRole.ADMIN, UserRole.MANAGER],
        data: { shiftId: shift._id, discrepancy: cashDiscrepancy },
        isUrgent: Math.abs(cashDiscrepancy) >= 10
      });
    }

    await AuditService.log({
      actorId: cashierId,
      action: 'SHIFT_CLOSED',
      entity: 'CashierShift',
      entityId: shiftId,
      changes: { countedCash, expectedCash, cashDiscrepancy }
    });

    return shift;
  }

  /**
   * Manager approval of closed shift
   */
  static async approveShiftClose(shiftId: string, managerId: string, notes?: string) {
    const shift = await CashierShift.findById(shiftId);
    if (!shift) throw new NotFoundError('Shift not found');
    if (shift.status !== 'closed') {
      throw new ConflictError(`Shift must be in 'closed' status to approve. Current status: ${shift.status}`);
    }

    shift.status = 'approved';
    shift.approvedBy = new mongoose.Types.ObjectId(managerId);
    shift.approvedAt = new Date();
    if (notes) shift.notes = (shift.notes ? shift.notes + ' | ' : '') + notes;

    await shift.save();

    await AuditService.log({
      actorId: managerId,
      action: 'SHIFT_APPROVED',
      entity: 'CashierShift',
      entityId: shiftId
    });

    return shift;
  }
}
