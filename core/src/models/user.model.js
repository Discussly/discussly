import {DataTypes} from "sequelize";

module.exports = (sequelize) => {
    const User = sequelize.define("User", {
        email: {
            type: DataTypes.STRING,
            field: "email",
        },
        first_name: {
            type: DataTypes.STRING,
            field: "first_name",
            allowNull: true,
        },
        last_name: {
            field: "last_name",
            type: DataTypes.STRING,
            allowNull: true,
        },
        is_admin: {
            field: "is_admin",
            type: DataTypes.BOOLEAN,
        },
    });

    User.sync({alter: true});

    return User;
};
