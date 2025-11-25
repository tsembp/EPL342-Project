import { fetchAPI } from "@/lib/apiClient";

export const getMyGdprRequests = () =>
  fetchAPI<any[]>("/gdpr/my-requests");

export const submitGDPRRequest = (data: { reason: string; type: string }) =>
  fetchAPI("/gdpr/request", {
    method: "POST",
    body: JSON.stringify(data),
  });
