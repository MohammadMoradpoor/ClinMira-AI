import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { SettingsContent } from "@/components/settings/settings-content"

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="min-w-0 flex-1 p-4 lg:p-6 lg:ml-64">
        <Header
          title="Settings"
          description="Manage your profile, simulation preferences, accessibility, and training notices."
        />

        <div className="mt-6">
          <SettingsContent />
        </div>
      </main>
    </div>
  )
}
