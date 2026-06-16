import axios from "axios";

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_BACKSERVER}`,
  headers: {
    "Content-Type": "application/json",
  },
});

export const getRegion = async () => {
  try {
    const response = await api.get(`/region`);
    return response.data;
  } catch (e) {
    console.error(e.error);
    return [];
  }
};

export const getDetailRegion = async (regionName) => {
  const response = await api.get(`/region/detail-region`, {
    params: { regionName },
  });
  return response.data;
};
