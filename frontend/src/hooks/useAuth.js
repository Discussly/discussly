import {useMutation} from "react-query";
import ApiConfig from "../services/api-config";
import {getQuery} from "../services/get-query";

export function useApiLogin(options) {
    return useMutation(async (loginPayload) => {
        return getQuery(
            ApiConfig.LOGIN({
                ...loginPayload,
            }),
        );
    }, options);
}

export function useApiRegister(options) {
    return useMutation(async (registerPayload) => {
        console.log(registerPayload);
        return getQuery(
            ApiConfig.REGISTER({
                ...registerPayload,
            }),
        );
    }, options);
}
