import { ReactNode } from "react";
import WardAccessGuard from "@/components/ward-access-guard";

export default function DashboardLayout({ children }: { children: ReactNode }) {
    return <WardAccessGuard>{children}</WardAccessGuard>;
}
