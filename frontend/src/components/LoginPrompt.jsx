import { useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { Sheet } from "@/components/Sheet";
import { PrimaryButton } from "@/components/forms/Field";

export const LoginPrompt = ({ open, onOpenChange }) => {
  const nav = useNavigate();
  return (
    <Sheet open={open} onOpenChange={onOpenChange} testId="login-prompt-sheet" title="Accedi per continuare" subtitle="Per pubblicare, rispondere o segnalare serve un account gratuito. Ci vogliono 20 secondi.">
      <PrimaryButton data-testid="login-prompt-go" onClick={() => { onOpenChange(false); nav("/profilo"); }}>
        <LogIn className="h-5 w-5" /> Accedi o registrati
      </PrimaryButton>
    </Sheet>
  );
};
