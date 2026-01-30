import SystemsClient from "./systems-client";

export default async function SystemsPage({
  params,
}: {
  params: Promise<{ systemId: string }>;
}) {
  const { systemId } = await params;
  return <SystemsClient systemId={systemId} />;
}
