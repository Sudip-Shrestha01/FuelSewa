import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { createServer } from "http";
import { Server } from "socket.io";
import authRoutes from "./routes/auth.routes";
import driverRoutes from "./routes/driver.routes";
import orderRoutes from "./routes/order.routes";
import pricingRoutes from "./routes/pricing.routes";
import profileRoutes from "./routes/profile.routes";
import adminRoutes from "./routes/admin.routes";
import driverOrderRoutes from "./routes/driverOrder.routes";
import notificationRoutes from "./routes/notification.routes";
import dispatchRoutes from "./routes/dispatch.routes";

dotenv.config();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/", (req, res) => {
  res.json({ message: "FuelSewa API is running" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/pricing", pricingRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/dispatch", dispatchRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/driver/orders", driverOrderRoutes);
app.use("/api/notifications", notificationRoutes);

  // Socket.io connection
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join a room for a specific order
    socket.on("joinOrder", (orderId: string) => {
      socket.join(`order_${orderId}`);
      console.log(`Socket ${socket.id} joined order room: order_${orderId}`);
    });

    // Leave order room
    socket.on("leaveOrder", (orderId: string) => {
      socket.leave(`order_${orderId}`);
      console.log(`Socket ${socket.id} left order room: order_${orderId}`);
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.DATABASE_URL as string);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

// Start server
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

export { io };
export default app;
