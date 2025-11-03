import express from "express";
import {
  getUserInfo,
  createUserInfo,
  deleteUser,
} from "../controller/userController.js";

const router = express.Router();

router.get("/:id", getUserInfo);
router.post("/", createUserInfo);
router.delete("/:id", deleteUser);

export default router;
