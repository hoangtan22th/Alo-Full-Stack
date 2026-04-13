import { startMessageConsumer } from './messageConsumer';
// import { startPresenceConsumer } from './presenceConsumer';

/**
 * Start all workers/consumers
 * Called from index.ts after Socket.io is initialized
 */
export async function startAllWorkers(): Promise<void> {
  try {
    console.log('[Workers] Starting all consumers...');

    // Start message consumer
    await startMessageConsumer();

    // Start presence consumer
    // await startPresenceConsumer();

    console.log('[Workers] All workers started successfully');
  } catch (error) {
    console.error('[Workers] Failed to start workers:', error);
    throw error;
  }
}

/**
 * Error handler for worker restarts
 * Implement auto-restart logic if needed
 */
export async function setupWorkerErrorHandling(): Promise<void> {
  process.on('uncaughtException', (error) => {
    console.error('[Workers] Uncaught exception:', error);
    // Optional: implement restart logic
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('[Workers] Unhandled rejection:', reason);
    // Optional: implement restart logic
  });
}
