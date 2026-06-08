import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { DebriefingContent } from "@/components/debriefing/debriefing-content"
import { Button } from "@/components/ui/button"
import { TranslatedText } from "@/components/i18n/translated-text"

export default function DebriefingPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="min-w-0 flex-1 p-4 lg:p-6 lg:ml-64">
        <Header
          title="Debriefing"
          description="Review diagnosis accuracy, safety, communication, and your faculty-validated reasoning path."
          actions={
            <Button
              variant="outline"
              className="w-full sm:w-auto h-9 text-sm transition-all duration-300 hover:shadow-md hover:scale-105 bg-transparent"
            >
              <TranslatedText text="Export Debrief" />
            </Button>
          }
        />

        <div className="mt-6">
          <DebriefingContent />
        </div>
      </main>
    </div>
  )
}
