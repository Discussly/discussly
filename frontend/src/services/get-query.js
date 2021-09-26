import {get} from "lodash";
import ApiService from "./api-service";

export async function getQuery({dataPath, ...requestConfig}) {
    const {data} = await ApiService.makeRequest(requestConfig);

    return dataPath ? get(data, dataPath) : data;
}
