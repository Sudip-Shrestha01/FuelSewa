import jwt from "jsonwebtoken";
import { UserRole } from "../models/user.model";

export interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
}

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: "7d",
  });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
};
