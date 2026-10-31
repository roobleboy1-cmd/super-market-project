import { Router } from 'express';
import { ExpenseController } from '../controllers/expense.controller';
import { authenticate, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createExpenseSchema, updateExpenseSchema } from '../validators/expense.validator';

const router = Router();

router.get(
  '/',
  authenticate,
  requirePermission('expenses:view'),
  ExpenseController.getExpenses
);
router.post(
  '/',
  authenticate,
  requirePermission('expenses:create'),
  validate({ body: createExpenseSchema }),
  ExpenseController.createExpense
);
router.get(
  '/:id',
  authenticate,
  requirePermission('expenses:view'),
  ExpenseController.getExpenseById
);
router.patch(
  '/:id',
  authenticate,
  requirePermission('expenses:create'),
  validate({ body: updateExpenseSchema }),
  ExpenseController.updateExpense
);
router.delete(
  '/:id',
  authenticate,
  requirePermission('expenses:approve'),
  ExpenseController.deleteExpense
);

export default router;
