import { createFileRoute } from "@tanstack/react-router";
import { SeasonTablePage } from "@/pages/seasonTable";

export const Route = createFileRoute("/seasonTable")({
  component: SeasonTablePage,
});
