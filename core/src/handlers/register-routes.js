const express = require("express"); //import express
const passport = require("passport");
const router = express.Router();

import * as UserController from "../modules/user/user.controllers";

router.post("/register", UserController.register);
router.post("/login", UserController.login);
router.get("/secret", passport.authenticate("jwt", {session: false}), UserController.secret);

export {router};
