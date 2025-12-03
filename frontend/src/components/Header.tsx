import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title: string;
  showBack?: boolean;
  showBackButton?: boolean;
  backTo?: string;
  action?: React.ReactNode;
}

export function Header({ title, showBack, showBackButton, backTo, action }: HeaderProps) {
  const navigate = useNavigate();
  const shouldShowBack = showBack || showBackButton;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200 text-gray-900">
      <div className="w-full px-4 h-14 flex items-center gap-3">
        {shouldShowBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => backTo ? navigate(backTo) : navigate(-1)}
            className="h-9 w-9 border border-gray-200 bg-white hover:bg-gray-50 text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-lg font-semibold flex-1 text-gray-900">
          {title}
        </h1>
        {/* keep the right side reserved for actions */}
        <div className="flex items-center justify-end">
          {action}
        </div>
      </div>
    </header>
  );
}
