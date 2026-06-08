import { redirect } from "next/navigation"

// ClinMira audit skip: compatibility redirect.
export default function ScenarioStudioRedirectPage() {
  redirect("/scenario-studio")
}
