import {createStore} from "easy-peasy";
import auth from "./models/auth_model";

const state = {
    auth,
};

export default createStore(state);
