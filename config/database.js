import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const dbConnect = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("Missing DATABASE_URL environment variable");
  }

  try {
    await mongoose.connect(process.env.DATABASE_URL, {
      // Use replica set & SRV string from Atlas
      // (Atlas connection string already contains replica set info)
      maxPoolSize: parseInt(process.env.DB_MAX_POOL ?? "10"), // Limit per Render instance
      minPoolSize: parseInt(process.env.DB_MIN_POOL ?? "0"),
      serverSelectionTimeoutMS: 8000, // Fail faster if no node is available
      socketTimeoutMS: 20000,         // Drop idle sockets
      retryWrites: true,
      readPreference: "secondaryPreferred", // Use replicas for reads
      heartbeatFrequencyMS: 10000,   // Detect failover faster
    });

    console.log("✅ MongoDB Replica Set Connected");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
    process.exit(1);
  }

  // Optional: monitor connection state
  mongoose.connection.on("disconnected", () => {
    console.warn("⚠️ MongoDB disconnected");
  });

  mongoose.connection.on("reconnected", () => {
    console.log("🔄 MongoDB reconnected");
  });
};

export default dbConnect;
