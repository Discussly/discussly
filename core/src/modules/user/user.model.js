/* eslint-disable no-console */
import {DataTypes} from "sequelize";

export const registerUser = (sequelize) => {
    const User = sequelize.define("User", {
        first_name: {
            type: DataTypes.STRING,
            field: "first_name",
            allowNull: false,
        },
        last_name: {
            field: "last_name",
            type: DataTypes.STRING,
        },
        is_admin: {
            field: "is_admin",
            type: DataTypes.BOOLEAN,
        },
    });

    return User;
};
