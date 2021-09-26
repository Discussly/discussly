import {DataTypes} from "sequelize";
import * as bcrypt from "bcrypt";

module.exports = (sequelize) => {
    const User = sequelize.define(
        "User",
        {
            email: {
                type: DataTypes.STRING,
                field: "email",
            },
            password: {
                type: DataTypes.STRING,
                field: "password",
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
        },
        {
            hooks: {
                beforeCreate: async (user) => {
                    if (user.password) {
                        const salt = await bcrypt.genSalt(10, "a");
                        user.password = await bcrypt.hash(user.password, salt);
                    }
                },
                beforeUpdate: async (user) => {
                    if (user.password) {
                        const salt = await bcrypt.genSalt(10, "a");
                        user.password = await bcrypt.hash(user.password, salt);
                    }
                },
            },
        },
    );

    User.prototype.validPassword = async function (password) {
        return bcrypt.compare(password, this.password);
    };

    User.sync({alter: true});

    return User;
};
