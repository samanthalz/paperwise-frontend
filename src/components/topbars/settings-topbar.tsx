import {SidebarTrigger} from "@/components/ui/sidebar";
import {topbarClasses} from "@/components/topbars/topbar-base";

export default function SettingsTopbar() {
    return (
        <div className={`${topbarClasses} flex items-center gap-4 px-6`}>
            <SidebarTrigger/>
            <div className="h-6 w-[2px] bg-border flex-shrink-0"/>
            <h1 className="text-lg font-semibold">Settings</h1>
        </div>
    );
}