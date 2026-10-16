import { notFound } from "next/navigation";

// Unknown paths render the localized 404 inside the layout, so the header
// (help-now, quick exit) and the flow guard stay active everywhere.
export default function CatchAllPage() {
  notFound();
}
