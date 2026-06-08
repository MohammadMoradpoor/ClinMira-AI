import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { CaseLibraryContent } from "@/components/cases/case-library-content"
import { Button } from "@/components/ui/button"
import { TranslatedText } from "@/components/i18n/translated-text"

export default function CaseLibraryPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="min-w-0 flex-1 p-4 lg:p-6 lg:ml-64">
        <Header
          title="Case Library"
          description="Faculty-approved patient twin cases for clinical reasoning, imaging, and OSCE-ready practice."
          actions={
            <Button className="w-full sm:w-auto h-9 text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:shadow-lg hover:shadow-primary/30 hover:scale-105">
              <TranslatedText text="+ Start Case" />
            </Button>
          }
        />

        <div className="mt-6">
          <CaseLibraryContent />
        </div>
      </main>
    </div>
  )
}
