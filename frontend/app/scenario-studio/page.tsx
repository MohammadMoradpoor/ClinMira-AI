import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { ScenarioStudioContent } from "@/components/scenario-studio/scenario-studio-content"

export default function ScenarioStudioPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="min-w-0 flex-1 p-4 lg:p-6 lg:ml-64">
        <Header
          title="Scenario Studio"
          description="Create patient twin scenarios, scoring rules, and faculty approval flow."
        />

        <div className="mt-6">
          <ScenarioStudioContent />
        </div>
      </main>
    </div>
  )
}
