import {registerUserService} from "./user.services";

const UserService = registerUserService();

export const getUserControllers = () => {
    const register = async (req, res, next) => {
        const data = req.body;
        const newUser = await UserService.register(data, res);
        res.json({message: newUser}); // dummy function for now
    };

    return {
        register,
    };
};
