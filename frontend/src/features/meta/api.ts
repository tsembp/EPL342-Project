import { fetchAPI } from "@/lib/apiClient";
import type { EnumsResponse } from "@/types/api";

export const getEnums = () => fetchAPI<EnumsResponse>("/meta/enums");
