import { notFound } from "next/navigation";
import { validateInvitationToken } from "@/lib/actions/invitations";
import { InvitationAcceptForm } from "./InvitationAcceptForm";

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await validateInvitationToken(token);

  if (!result.valid) {
    notFound();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <InvitationAcceptForm token={token} email={result.email ?? ""} />
    </div>
  );
}
