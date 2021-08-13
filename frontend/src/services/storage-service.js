export const LOCAL_STORAGE_KEYS = {
    JWT_TOKEN: "JWT_TOKEN",
    ADMIN: "ADMIN",
};

const tryParse = (item) => {
    try {
        return JSON.parse(item);
    } catch (e) {
        return undefined;
    }
};

class StorageService {
    constructor() {
        this.localStorage = window.localStorage;
    }

    getItem(key) {
        return tryParse(this.localStorage.getItem(key) || undefined);
    }

    setItem(key, value) {
        this.localStorage.setItem(key, JSON.stringify(value));
    }

    removeItem(key) {
        this.localStorage.removeItem(key);
    }

    getAdmin() {
        return this.getItem(LOCAL_STORAGE_KEYS.ADMIN);
    }

    setAdmin(admin) {
        if (!admin) {
            this.removeItem(LOCAL_STORAGE_KEYS.ADMIN);
        }
        this.setItem(LOCAL_STORAGE_KEYS.ADMIN, admin);
    }

    getJwtToken() {
        return this.getItem(LOCAL_STORAGE_KEYS.JWT_TOKEN);
    }

    setJwtToken(token) {
        return this.setItem(LOCAL_STORAGE_KEYS.JWT_TOKEN, token);
    }

    getAuth() {
        const token = this.getItem(LOCAL_STORAGE_KEYS.JWT_TOKEN);

        return {
            token,
        };
    }

    setAuth({token}) {
        if (!token) {
            throw new Error("Invalid parameters");
        }

        this.setItem(LOCAL_STORAGE_KEYS.JWT_TOKEN, token);
    }

    removeAuth() {
        this.removeItem(LOCAL_STORAGE_KEYS.JWT_TOKEN);
    }
}

export default new StorageService();
