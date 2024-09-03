import React from "react";
import _ from "lodash";
import axios from "axios";
import { getLocalStorageItem, setToken } from "../utils";

const apiURI = process.env["REACT_APP_API_URL"];
const dataURI = process.env["REACT_APP_DATA_URL"];
const redirectURI: any = process.env["REACT_APP_REDIRECT_URI"];

export const apiInstance = axios.create({
  baseURL: apiURI,
});

apiInstance.interceptors.request.use(
  (config: any) => {
    config.headers["Authorization"] = "Bearer " + getLocalStorageItem("auth-token");

    return config;
  },
  (error: any) => {
    Promise.reject(error);
  }
);
apiInstance.interceptors.response.use(
  (response: any) => {
    return response;
  },
  // eslint-disable-next-line consistent-return
  function handleApiError(error: any) {
    try {
      const originalRequest = error.config;
      if (error.response.status === 401) {
        return Promise.reject(error);
      }
      if (
        error.response.status === 403 &&
        !originalRequest._retry &&
        error.response.data.detail === "access_token expired"
      ) {
        const refreshToken = getLocalStorageItem("refresh-token");
        // if ([null, undefined, "undefined"].includes(refreshToken)) {
        //   window.location.replace(redirectURI);
        //   return Promise.reject(error);
        // }
        return apiInstance
          .post("login/refresh_token?type=imax", {
            refresh_token: refreshToken,
          })
          // eslint-disable-next-line consistent-return
          .then((res: any) => {
            if (res.status === 201) {
              setToken(res.data);

              apiInstance.defaults.headers.common["Authorization"] =
                "Bearer " + getLocalStorageItem("auth-token");
              return apiInstance(originalRequest);
            } else if (res.status === 203) {
              window.location.replace(redirectURI);
              return originalRequest
            } else {
              return Promise.reject(error);
            }
          });
      } else if (error.response.status === 403) {
        // 
      } else if (_.get(error, "response.data.keycloak_data")) {
        // 

      } else if (
        _.get(originalRequest, "url").includes("resourcestatus") &&
        error.response.status === 500 &&
        window.location.href.includes("edit")
      ) {
        // 
      } else if (!_.get(originalRequest, "url").includes("resourcestatus")) {
        // 
      }
    } catch (err: any) {
      // showServerDown();
      return err
      // 
    }
  }
);

// eslint-disable-next-line consistent-return
export const fetchRegionSpecificURL = (module: string, regionV: string) => {
  const region = regionV.replace(" ", "_").toUpperCase();
  if (module === "job_scheduler") {
    const jobSchedulerURI = process.env["REACT_APP_JOB_SCHEDULER_" + region]
    const jobScheduler = axios.create({
      baseURL: jobSchedulerURI,
    });

    jobScheduler.interceptors.request.use(
      (config: any) => {
        config.headers["Authorization"] = "Bearer " + getLocalStorageItem("auth-token");

        return config;
      },
      (error: any) => {
        Promise.reject(error);
      }
    );

    jobScheduler.interceptors.response.use(
      (response: any) => {
        return response;
      },
      function handleApiError(error: any) {
        try {
          const originalRequest = error.config;
          if (error.response.status === 401) {
            return Promise.reject(error);
          }
          if (error.response.status === 403 && !originalRequest._retry) {
            originalRequest._retry = true;
            const refreshToken = getLocalStorageItem("refresh-token");
            if ([null, undefined, "undefined"].includes(refreshToken)) {
              window.location.replace(redirectURI);
              return Promise.reject(error);
            }
            return apiInstance
              .post("login/refresh_token?type=imax", {
                refresh_token: refreshToken,
              })
              .then((res: any) => {
                if (res.status === 201) {
                  setToken(res.data);
                  jobScheduler.defaults.headers.common["Authorization"] =
                    "Bearer " + getLocalStorageItem("auth-token");
                  return jobScheduler(originalRequest);
                } else if (res.status === 203) {
                  window.location.replace(redirectURI);
                  return originalRequest
                } else {
                  return Promise.reject(error);
                }
              });
          }
          return Promise.reject(error);
        } catch (err) {
          // showServerDown();
          return err;
        }
      }
    );
    return jobScheduler;
  } else {
    return null
  }
};

export const data = axios.create({
  baseURL: dataURI,
});

data.interceptors.request.use(
  (config: any) => {
    config.headers["Authorization"] = "Bearer " + getLocalStorageItem("auth-token");

    return config;
  },
  (error: any) => {
    Promise.reject(error);
  }
);

data.interceptors.response.use(
  (response: any) => {
    return response;
  },
  function handleApiError(error: any) {
    try {
      const originalRequest = error.config;
      if (error.response.status === 401) {
        return Promise.reject(error);
      }
      if (error.response.status === 403 && !originalRequest._retry) {
        originalRequest._retry = true;
        const refreshToken = getLocalStorageItem("refresh-token");
        // if ([null, undefined, "undefined"].includes(refreshToken)) {
        //   window.location.replace(redirectURI);
        //   return Promise.reject(error);
        // }
        return apiInstance
          .post("login/refresh_token?type=imax", {
            refresh_token: refreshToken,
          })
          .then((res: any) => {
            if (res.status === 201) {
              setToken(res.data);
              data.defaults.headers.common["Authorization"] =
                "Bearer " + getLocalStorageItem("auth-token");
              return data(originalRequest);
            } else if (res.status === 203) {
              window.location.replace(redirectURI);
              return originalRequest
            } else {
              return Promise.reject(error);
            }
          });
      }
      return Promise.reject(error);
    } catch (err) {
      return err;
    }
  }
);