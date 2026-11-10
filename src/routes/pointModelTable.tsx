import { createFileRoute } from "@tanstack/react-router";
import { PointModelTablePage } from "@/pages/pointModelTable";

export const Route = createFileRoute("/pointModelTable")({
  component: PointModelTablePage,
});
