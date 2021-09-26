import * as UserService from "./user.services";

export const register = async (req, res) => {
    const data = req.body;
    const newUser = await UserService.register(data, res);
    res.status(201).json({message: newUser});
};

export const login = async (req, res) => {
    const data = req.body;
    const {token, user} = await UserService.login(data, res);
    res.status(200).json({token, user});
};

export const secret = async (req, res) => {
    res.status(200).json({secret: "test"});
};
