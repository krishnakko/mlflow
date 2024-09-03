import { getLocalStorageItem } from "../utils";
import { data, fetchRegionSpecificURL } from "./Api";

export const publishModelVersionApi = async (payload: any) => {
    const url = `v1/publish_model`;
    const region: any = getLocalStorageItem("region")
    const jobScheduler: any = await fetchRegionSpecificURL(
        "job_scheduler",
        region
    );
    const response: any = await jobScheduler.post(url, payload);
    return response.data;
};

export const publishModelJenkinsStatus = async (action: string, location: any) => {
    const url = `v1/jenkins_status`;
    const region: any = getLocalStorageItem("region")
    const jobScheduler: any = await fetchRegionSpecificURL(
        "job_scheduler",
        region
    );
    const params = { action: action, "location": location }
    const response: any = await jobScheduler.get(url, { params });
    return response.data;
};

export const getPublishModels = async (modelName?: any) => {
    const params: any = {};
    if (modelName) {
        params["name"] = modelName
    }
    const response = await data.get("published_models", { params });
    return response;
};

export const removeModelVersionApi = async (runId: any, params: any) => {
    const url = `v1/publish_model/${runId}`;
    const region: any = getLocalStorageItem("region")
    const jobScheduler: any = await fetchRegionSpecificURL(
        "job_scheduler",
        region
    );
    const response: any = await jobScheduler.delete(url, { params });
    return response.data;
};