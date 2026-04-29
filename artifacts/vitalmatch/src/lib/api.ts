const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

export const getToken = () => localStorage.getItem("vitalmatch_token");
export const getUser = () => {
  const userStr = localStorage.getItem("vitalmatch_user");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch (e) {
    return null;
  }
};
export const setAuth = (token: string, user: any) => {
  localStorage.setItem("vitalmatch_token", token);
  localStorage.setItem("vitalmatch_user", JSON.stringify(user));
};
export const clearAuth = () => {
  localStorage.removeItem("vitalmatch_token");
  localStorage.removeItem("vitalmatch_user");
};

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = "An error occurred";
    try {
      const data = await response.json();
      errorMsg = data.error || errorMsg;
    } catch (e) {
      // Ignored
    }
    throw new Error(errorMsg);
  }

  if (response.status === 204) return null;
  
  // Return ReadableStream for SSE directly if requested
  if (options.headers && (options.headers as Record<string, string>)["Accept"] === "text/event-stream") {
    return response;
  }

  try {
    return await response.json();
  } catch (e) {
    return null;
  }
}
