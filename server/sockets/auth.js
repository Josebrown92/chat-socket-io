import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("NO_TOKEN"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;

    await User.findByIdAndUpdate(socket.userId, { online: true });
    next();
  } catch (err) {
    next(new Error("UNAUTHORIZED"));
  }
};
