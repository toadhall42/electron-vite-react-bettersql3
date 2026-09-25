import { createFileRoute } from "@tanstack/react-router";
import { VehicleTablePage } from "@/pages/vehicleTable";

export const Route = createFileRoute("/vehicleTable")({
  component: VehicleTablePage,
});
