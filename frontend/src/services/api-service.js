import Axios, {Method} from "axios";
import {HTTP, API_BASEURL} from "./api-config";
import Storage from "./storage-service";

class ApiService {
    constructor() {
        this.axiosInstance = Axios.create();
        this.axiosInstance.defaults.timeout = 1800000;
    }

    setConfig(config) {
        this.config = config;
    }

    setConfigKey(key, value) {
        this.config[key] = value;
    }

    setHistory(history) {
        this.history = history;
    }

    async makeRequest(requestConfig) {
        const {
            url,
            payload,
            method = HTTP.GET,
            params = {},
            headers = {},
            options = {},
            withAuth = true,
        } = requestConfig;

        console.log(requestConfig);

        let jwtToken;

        if (withAuth) {
            jwtToken = Storage.getJwtToken();
        }

        try {
            const response = await this.axiosInstance({
                url: `${API_BASEURL}${url}`,
                params,
                data: payload,
                method,
                headers: {
                    ...headers,
                    Authorization: `Bearer ${jwtToken ? jwtToken.value : ""}`,
                },
                ...options,
                requestConfig,
            });

            console.log(response);

            return response;
        } catch (e) {
            if (!e.response || !e.response.status) {
                throw new Error("Either you are offline or system is down.");
            }
        }
    }
}

export default new ApiService();
