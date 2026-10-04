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

export function enableSoftwareFromGui(softwareId: string): SimulationCommand {
  return {
    type: "enableSoftware",
    softwareId,
  };
}

export function disableSoftwareFromGui(softwareId: string): SimulationCommand {
  return {
    type: "disableSoftware",
    softwareId,
  };
}
