import ExtensionsClient from "./extensions-client";

export default async function ExtensionsPage({
  params,
}: {
  params: Promise<{ systemId: string }>;
}) {
  const { systemId } = await params;
  return <ExtensionsClient systemId={systemId} />;
}
