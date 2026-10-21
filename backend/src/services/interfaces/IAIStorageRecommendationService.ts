import { StorageRequirementInput, AIRecommendationResult } from "@/types";

export interface IAIStorageRecommendationService {
  recommendStorageLocations(requirement: StorageRequirementInput): Promise<AIRecommendationResult>;
}
