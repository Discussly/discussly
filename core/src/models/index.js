import {Sequelize, Datatypes} from "sequelize";
import {registerUserModel} from "./user";
// add dotenv !
const sequelize = new Sequelize("postgres://postgres:postgres@localhost:5432/discussly");

// register models
const User = registerUserModel(sequelize);

export {User};
