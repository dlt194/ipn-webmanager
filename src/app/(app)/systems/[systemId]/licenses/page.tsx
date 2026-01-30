import LicensesClient from "./licenses-client";

export default async function LicensesPage({
  params,
}: {
  params: Promise<{ systemId: string }>;
}) {
  const { systemId } = await params;
  return <LicensesClient systemId={systemId} />;
}
