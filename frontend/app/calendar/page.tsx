import { redirect } from "next/navigation"

// ClinMira audit skip: compatibility redirect.
export default function VirtualClinicRedirectPage() {
  redirect("/virtual-clinic")
}
