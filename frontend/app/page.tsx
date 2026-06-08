import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { RecentPerformance } from "@/components/dashboard/recent-performance"
import { Reminders } from "@/components/dashboard/reminders"
import { AssignedCases } from "@/components/dashboard/assigned-cases"
import { ActivePatientTwins } from "@/components/dashboard/active-patient-twins"
import { OsceReadiness } from "@/components/dashboard/osce-readiness"
import { MobileAppCard } from "@/components/dashboard/mobile-app-card"
import { TimeTracker } from "@/components/dashboard/time-tracker"
import { Button } from "@/components/ui/button"
import { TranslatedText } from "@/components/i18n/translated-text"

export default function StudentClinicPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="min-w-0 flex-1 p-3 md:p-4 lg:p-5 lg:ml-64">
        <Header
          title="Student Clinic"
          description="Practice safely with dynamic synthetic patient twins."
          actions={
            <>
              <Button className="w-full sm:w-auto h-9 text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:shadow-lg hover:shadow-primary/30 hover:scale-105">
                <TranslatedText text="+ Start Simulation" />
              </Button>
              <Button
                variant="outline"
                className="w-full sm:w-auto h-9 text-sm transition-all duration-300 hover:shadow-md hover:scale-105 bg-transparent"
              >
                <TranslatedText text="Open Debriefing" />
              </Button>
            </>
          }
        />

        <div className="mt-4 md:mt-5 space-y-3 md:space-y-4">
          <StatsCards />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
            <div className="lg:col-span-2 space-y-3 md:space-y-4">
              <RecentPerformance />
              <ActivePatientTwins />
            </div>

            <div className="space-y-3 md:space-y-4">
              <Reminders />
              <OsceReadiness />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <AssignedCases />
            <MobileAppCard />
            <TimeTracker />
          </div>
        </div>
      </main>
    </div>
  )
}
