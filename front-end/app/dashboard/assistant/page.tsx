import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthDisplayName } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { AppShell } from "@/components/layout/AppShell";
import { ROUTES } from "@/lib/constants";
import { TavusAssistantBuilder } from "@/components/dashboard/TavusAssistantBuilder";

export default async function AssistantPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(ROUTES.LOGIN);
    }

    const displayName = getAuthDisplayName(user);

    return (
        <div className="min-h-svh">
            <Navbar />
            <AppShell>
                <div className="page-shell">
                    <div className="page-stack">
                        <TavusAssistantBuilder
                            userName={displayName || "Student"}
                            userEmail={user.email || ""}
                        />
                    </div>
                </div>
            </AppShell>
        </div>
    );
}
