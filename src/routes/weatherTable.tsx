import { createFileRoute } from "@tanstack/react-router";
import { WeatherTablePage } from "@/pages/weatherTable";

export const Route = createFileRoute("/weatherTable")({
  component: WeatherTablePage,
});
