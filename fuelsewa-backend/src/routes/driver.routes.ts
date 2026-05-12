import { Router } from "express";
import {
  addDriver,
  getAllDrivers,
  getDriverById,
  updateDriver,
  deleteDriver,
} from "../controllers/driver.controller";

const router = Router();

router.post("/", addDriver);  
router.get("/", getAllDrivers);     
router.get("/:id", getDriverById);   
router.put("/:id", updateDriver);    
router.delete("/:id", deleteDriver); 

export default router;
