import {DataTypes} from "sequelize";

export const registerUserModel = (sequelize) => {
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

    User.sync({force: true}).then(function () {
        // Table created
        console.log("test");
        User.create({
            first_name: "John",
            last_name: "Hancock",
        });
    });

    return User;
};
