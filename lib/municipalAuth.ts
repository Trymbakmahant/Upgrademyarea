export interface MunicipalSession {
  municipalId: string;
  nagarNigam: string;
  name: string;
  loginTime: string;
}

export const getMunicipalSession = (): MunicipalSession | null => {
  if (typeof window === "undefined") return null;

  try {
    const session = localStorage.getItem("municipalSession");
    if (!session) return null;

    const parsedSession = JSON.parse(session) as MunicipalSession;

    // Check if session is still valid (24 hours)
    const loginTime = new Date(parsedSession.loginTime);
    const now = new Date();
    const hoursDiff = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60);

    if (hoursDiff > 24) {
      localStorage.removeItem("municipalSession");
      return null;
    }

    return parsedSession;
  } catch (error) {
    console.error("Error parsing municipal session:", error);
    localStorage.removeItem("municipalSession");
    return null;
  }
};

export const clearMunicipalSession = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("municipalSession");
};

export const isMunicipalAuthenticated = (): boolean => {
  return getMunicipalSession() !== null;
};
