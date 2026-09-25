import { createFileRoute } from "@tanstack/react-router";
import { DriverInputPage } from "@/pages/driverInput";

export const Route = createFileRoute("/driverInput")({
  component: DriverInputPage,
});
