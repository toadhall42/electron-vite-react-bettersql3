import { createFileRoute } from "@tanstack/react-router";
import { EventTablePage } from "@/pages/eventTable";

export const Route = createFileRoute("/eventTable")({
  component: EventTablePage,
});
