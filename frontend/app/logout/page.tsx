import { redirect } from "next/navigation"

// ClinMira audit skip: compatibility redirect.
export default function AgentControlRedirectPage() {
  redirect("/agent-control")
}
