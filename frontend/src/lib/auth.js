export const getToken = () => localStorage.getItem("jwtoken");

export const isAuthenticated = () => Boolean(getToken());

export const clearSession = () => localStorage.removeItem("jwtoken");
