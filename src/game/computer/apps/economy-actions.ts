import type { SimulationCommand } from "@/game/simulation/commands/types";

export function buyHardwareFromGui(catalogId: string): SimulationCommand {
  return {
    type: "buyHardware",
    catalogId,
  };
}

export function rentHousingFromGui(housingId: string): SimulationCommand {
  return {
    type: "rentHousing",
    housingId,
  };
}

export function breakLeaseFromGui(): SimulationCommand {
  return {
    type: "breakLease",
  };
}
