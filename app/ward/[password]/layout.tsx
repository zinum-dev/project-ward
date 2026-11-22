import { ReactNode } from "react";
import WardAccessGuard from "@/components/ward-access-guard";
import PageHeader from "@/lib/PageHeader";

export default function DashboardLayout({ children }: { children: ReactNode }) {
    return (
        <WardAccessGuard>
            <PageHeader />
            {children}
        </WardAccessGuard>
    );
}
