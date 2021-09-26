import Database from "../../models/index";
import {generateJwtToken} from "../auth/jwt.strategy";
import {RegisterValidation, LoginValidation} from "./validations/index";

export async function register(data, res) {
    const validationResult = RegisterValidation.validate(data);

    const {error} = validationResult;
    console.log(error);
    if (error) {
        res.status(422).json({
            message: "Invalid request",
            data,
        });
    }

    const newUser = await Database.User.create({...data});
    return newUser;
}

export async function login(data, res) {
    //Check If User Exists
    const validationResult = LoginValidation.validate(data);

    const {error} = validationResult;

    if (error) {
        res.status(422).json({
            message: "Credentials are not valid !",
            data,
        });
    }

    const foundUser = await Database.User.findOne({where: {email: data.email}});
    const validPassword = await foundUser.validPassword(data.password);

    if (!validPassword || !foundUser) {
        return res.status(403).json({error: "Forbidden !"});
    }

    const token = generateJwtToken(foundUser);
    return {
        token,
        user: foundUser,
    };
}
