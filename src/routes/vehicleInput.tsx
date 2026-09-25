import { createFileRoute } from "@tanstack/react-router";
import { VehicleInputPage } from "@/pages/vehicleInput";

export const Route = createFileRoute("/vehicleInput")({
  component: VehicleInputPage,
});
