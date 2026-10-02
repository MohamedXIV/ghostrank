export interface RoomPresentation {
  locationId: string;
  avatarPosition: string;
  worldMinute: number;
}

export type PhysicalIntent = {
  type: "wait";
  minutes: number;
};
