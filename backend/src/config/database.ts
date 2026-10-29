import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

let isReplicaSet: boolean | null = null;

export async function checkReplicaSet(): Promise<boolean> {
  if (isReplicaSet !== null) return isReplicaSet;
  try {
    const adminDb = mongoose.connection.db?.admin();
    if (!adminDb) return false;
    const serverStatus = await adminDb.serverStatus();
    isReplicaSet = Boolean(serverStatus.repl || serverStatus.sharding);
    return isReplicaSet;
  } catch {
    isReplicaSet = false;
    return false;
  }
}

export async function connectDB(): Promise<typeof mongoose> {
  try {
    mongoose.set('strictQuery', true);
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      autoIndex: true
    });

    logger.info(`✅ MongoDB Connected to database: "${conn.connection.name}" on host "${conn.connection.host}"`);

    const hasReplicaSet = await checkReplicaSet();
    logger.info(
      `ℹ️ MongoDB deployment transaction capability: ${
        hasReplicaSet
          ? 'REPLICA_SET / SHARDED (Multi-document Transactions Enabled)'
          : 'STANDALONE (Atomic Document Operations Supported)'
      }`
    );

    return conn;
  } catch (error: any) {
    logger.error(`❌ MongoDB Connection Error: ${error.message}`);
    throw error;
  }
}

export function isTransactionSupported(): boolean {
  return Boolean(isReplicaSet);
}

export async function withTransaction<T>(
  callback: (session: mongoose.ClientSession | null) => Promise<T>
): Promise<T> {
  const supported = await checkReplicaSet();

  // If running on a standalone instance without replica set, execute callback directly
  if (!supported) {
    return await callback(null);
  }

  let session: mongoose.ClientSession | null = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error: any) {
    if (session && session.inTransaction()) {
      await session.abortTransaction();
    }
    // Fallback if standalone error occurs dynamically
    if (
      error.message &&
      (error.message.includes('Transaction numbers are only allowed on a replica set') ||
        error.message.includes('Transactions are not supported'))
    ) {
      isReplicaSet = false;
      logger.warn('Replica set not available. Executing without multi-document transaction session.');
      return await callback(null);
    }
    throw error;
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

export async function disconnectDB(): Promise<void> {
  try {
    await mongoose.disconnect();
    isReplicaSet = null;
    logger.info('MongoDB disconnected successfully.');
  } catch (error: any) {
    logger.error(`Error during MongoDB disconnection: ${error.message}`);
  }
}
