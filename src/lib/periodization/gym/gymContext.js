import { defaultGymConfig } from './gymConfig.js'
import { getGymRecommendation } from './gymDay.js'

export function getGymRecommendationContext(input = {}, config = defaultGymConfig) {
  return getGymRecommendation(input, config)
}

export { getGymRecommendation }
