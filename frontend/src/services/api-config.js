require("dotenv").config();

export const HTTP = {
    GET: "GET",
    POST: "POST",
    PUT: "PUT",
    PATCH: "PATCH",
    DELETE: "DELETE",
};

// eslint-disable-next-line no-undef
const {REACT_APP_SERVER_HOST, REACT_APP_SERVER_PORT, NODE_ENV} = process.env;

let API_BASEURL;

if (NODE_ENV === "development") {
    API_BASEURL = `http://${REACT_APP_SERVER_HOST}:${REACT_APP_SERVER_PORT}`;
} else {
    API_BASEURL = `http://${REACT_APP_SERVER_HOST}`;
}

export {API_BASEURL};

export default {
    LOGIN: ({payload}) => ({
        url: "/login",
        method: HTTP.POST,
        payload,
    }),

    REGISTER: ({payload}) => ({
        url: "/register",
        method: HTTP.POST,
        payload,
    }),
};
