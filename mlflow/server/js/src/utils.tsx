export const setLocalStorageItem = (key: string, value: any) => {
    localStorage.setItem(key, value);
}

export const getLocalStorageItem = (key: string) => {
    return localStorage.getItem(key);
}

export const removeLocalStorageItem = (key: string) => {
    localStorage.removeItem(key);
}


export const setToken = (tokenObj: any) => {
    if (tokenObj.access_token) {
        localStorage.setItem("auth-token", tokenObj.access_token);
    }
    if (tokenObj.refresh_token) {
        localStorage.setItem("refresh-token", tokenObj.refresh_token);
    }
}

export const jenkinsJobEndStatuses = ["FAILED", "FAILURE", "SUCCESS", "ABORTED", "CANCELLED"];
