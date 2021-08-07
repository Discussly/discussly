import {Sequelize} from "sequelize";
import {registerUser} from "../modules/user/user.model";

export class SequelizeConnection {
    connectSequelize() {
        if (!this.sequelize) {
            return new Sequelize("postgres://postgres:postgres@localhost:5432/discussly");
        }

        return this.sequelize;
    }

    async registerModels() {
        const sequelize = this.connectSequelize();

        await sequelize.sync();

        SequelizeConnection.userModel = registerUser(sequelize);
    }
}
