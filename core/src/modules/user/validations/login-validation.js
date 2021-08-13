import Joi from "joi";

export const LoginValidation = Joi.object().keys({
    email: Joi.string().email(),
    password: Joi.string().min(3).max(15).required(),
});
