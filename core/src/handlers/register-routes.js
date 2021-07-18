const express = require("express"); //import express
const router = express.Router();

import {getUserControllers} from "../modules/user/user.controllers";
const userController = getUserControllers();

router.post("/register", userController.register);

export {router};
