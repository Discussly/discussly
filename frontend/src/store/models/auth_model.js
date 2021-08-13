import {action} from "easy-peasy";
import StorageService from "../../services/storage-service";

const auth = {
    // data
    authenticatedUser: null,
    // actions
    setAuth: action((state, payload) => {
        console.log(payload);
        StorageService.setAuth({token: payload.token});
        state.authenticatedUser = payload.user;
    }),

    clearAuth: action((state) => {
        StorageService.removeAuth();
        state.authenticatedUser = null;
    }),
};

export default auth;
