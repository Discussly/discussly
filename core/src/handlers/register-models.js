import {Sequelize} from "sequelize";
import {registerUserModel} from "../modules/user/user.model";
// add dotenv !
const sequelize = new Sequelize("postgres://postgres:postgres@localhost:5432/discussly");

// register models
const User = registerUserModel(sequelize);

export {User};
