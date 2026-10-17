import { deleteRecord, updateRecord } from "@/server/api/records";
import { route } from "@/server/route";

const update = route(updateRecord);
const remove = route(deleteRecord);

export async function PUT(request: Request, { params }: RouteContext<"/api/records/[id]">) {
  return update(request, (await params).id);
}

export async function DELETE(request: Request, { params }: RouteContext<"/api/records/[id]">) {
  return remove(request, (await params).id);
}
