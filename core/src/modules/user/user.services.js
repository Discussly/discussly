import {User} from "../../handlers/register-models";
import Joi from "joi";

const UserSchema = Joi.object().keys({
    first_name: Joi.string().required(),
    last_name: Joi.string().required(),
});

export const registerUserService = () => {
    const register = async (data, res) => {
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

        const newUser = await User.create({...data});
        return newUser;
    };

    return {
        register,
    };
};
