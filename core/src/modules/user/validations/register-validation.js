import Joi from "joi";

export const RegisterValidation = Joi.object().keys({
    email: Joi.string().email(),
    first_name: Joi.string(),
    last_name: Joi.string(),
    password: Joi.string().min(3).max(15).required(),
    password_confirmation: Joi.any().valid(Joi.ref("password")).required(),
});
