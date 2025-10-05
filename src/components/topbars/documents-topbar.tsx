import {SidebarTrigger} from "@/components/ui/sidebar";
import {Button} from "@/components/ui/button";
import {Plus, Upload} from "lucide-react";
import {topbarClasses} from "@/components/topbars/topbar-base";

export default function DocumentsTopbar() {
    return (
        <>
            <div className={`${topbarClasses} flex items-center gap-4 px-6`}>
                {/* Left side: SidebarTrigger + Divider + Title */}
                <div className="flex items-center gap-4 flex-nowrap">
                    <SidebarTrigger/>
                    <div className="h-6 w-[2px] bg-border flex-shrink-0"/>
                    <h1 className="text-lg font-semibold whitespace-nowrap">Documents</h1>
                </div>

                {/* Right side buttons */}
                <div className="flex items-center gap-2 h-full ml-auto">
                    <Button
                        variant="outline"
                        className="flex items-center gap-2 h-10 px-3"
                    >
                        <Plus className="w-4 h-4"/>
                        Create Folder
                    </Button>
                    <Button
                        variant="default"
                        className="flex items-center gap-2 h-10 px-3"
                    >
                        <Upload className="w-4 h-4"/>
                        Upload File
                    </Button>
                </div>
            </div>
        </>
    );
}
