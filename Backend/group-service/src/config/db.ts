import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  try {
    // Ép kiểu (type assertion) để TypeScript hiểu biến môi trường này là một chuỗi (string)
    const uri = process.env.MONGODB_URI as string;

    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    // Ép kiểu error thành any hoặc Error để có thể truy cập thuộc tính .message
    console.error(`MongoDB Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
