import SystemSettingsClient from "./system-settings-client";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ systemId: string }>;
}) {
  const { systemId } = await params;
  return <SystemSettingsClient systemId={systemId} />;
}
