import UsersClient from "./users-client";

export default async function UsersPage({
  params,
}: {
  params: Promise<{ systemId: string }>;
}) {
  const { systemId } = await params;
  return <UsersClient systemId={systemId} />;
}
