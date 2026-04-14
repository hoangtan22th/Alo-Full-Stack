import mongoose from 'mongoose';

/**
 * Connect to MongoDB
 */
export async function connectDB(): Promise<void> {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/alo_message_db';
    
    await mongoose.connect(mongoUri);
    console.log('[MongoDB] Connected successfully');

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB] Connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB] Disconnected');
    });
  } catch (error) {
    console.error('[MongoDB] Connection failed:', error);
    throw error;
  }
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectDB(): Promise<void> {
  try {
    await mongoose.disconnect();
    console.log('[MongoDB] Disconnected gracefully');
  } catch (error) {
    console.error('[MongoDB] Error disconnecting:', error);
  }
}

export default mongoose;
