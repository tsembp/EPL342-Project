import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title: string;
  showBack?: boolean;
  action?: React.ReactNode;
}

export function Header({ title, showBack, action }: HeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-neutral-950/95 backdrop-blur border-b border-neutral-900 text-neutral-50">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
        {showBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-8 w-8 border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-emerald-400"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-lg font-semibold flex-1 flex justify-center items-center text-neutral-50">
          {title}
        </h1>
        {/* keep the right side reserved for actions so title stays centered */}
        <div className="flex items-center justify-end min-w-[2rem]">
          {action}
        </div>
      </div>
    </header>
  );
}
