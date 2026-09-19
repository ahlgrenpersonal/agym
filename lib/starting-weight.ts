
import type { WeightUnit } from "./models";
import { fromKg, roundDisplayWeight, toKg } from "./recommendation";
export function defaultStartingWeight(unit: WeightUnit, startingWeightLb?: number): number | undefined {
 if (startingWeightLb === undefined) return undefined;
 return roundDisplayWeight(fromKg(toKg(startingWeightLb,"lb"),unit),unit);
}
