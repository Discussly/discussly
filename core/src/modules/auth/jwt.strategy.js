const passport = require("passport");
const passportJWT = require("passport-jwt");
const JWTStrategy = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;
const jwt = require("jsonwebtoken");

import {Database} from "../../models/index";

export const registerJwtStrategy = () => {
    passport.use(
        new JWTStrategy(
            {
                jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
                secretOrKey: "discussly",
            },
            function (jwtPayload, done) {
                console.log(jwtPayload);
                return Database.User.findByPk(jwtPayload.sub)
                    .then((user) => {
                        return done(null, user);
                    })
                    .catch((err) => {
                        console.log(err);
                        //return done(err);
                    });
            },
        ),
    );
};

export const generateJwtToken = (user) => {
    return jwt.sign(
        {
            iss: "discussly",
            sub: user.id,
            iat: new Date().getTime(),
            exp: new Date().setDate(new Date().getDate() + 10),
        },
        "discussly",
    );
};
