import { createFileRoute } from "@tanstack/react-router";
import { DriverTablePage } from "@/pages/driverTable";

export const Route = createFileRoute("/driverTable")({
  component: DriverTablePage,
});
