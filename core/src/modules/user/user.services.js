import {SequelizeConnection} from "../../handlers/connect-sequelize";
import {generateJwtToken} from "../auth/jwt.strategy";
import Joi from "joi";

const UserSchema = Joi.object().keys({
    first_name: Joi.string().required(),
    last_name: Joi.string().required(),
});

export async function register(data, res) {
    console.log(data);
    const validationResult = UserSchema.validate(data);

    const {error} = validationResult;
    console.log(error);
    if (error) {
        res.status(422).json({
            message: "Invalid request",
            data,
        });
    }

    const newUser = await SequelizeConnection.userModel.create({...data});
    console.log(newUser, data);
    return newUser;
}

export async function login(data, res) {
    //Check If User Exists
    console.log(data);
    const foundUser = await SequelizeConnection.userModel.findOne({where: {first_name: data.first_name}});

    console.log(foundUser);

    if (!foundUser) {
        return res.status(403).json({error: "Forbidden !"});
    }

    const token = generateJwtToken(foundUser);
    return token;
}
