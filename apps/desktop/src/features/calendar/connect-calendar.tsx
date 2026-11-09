import { Button } from "@workspace/ui/components/ui/button";
import { CalendarDays } from "lucide-react";

import { useConnectCalendar } from "./use-calendar.js";

export const ConnectCalendar = () => {
  const connect = useConnectCalendar();
  return (
    <div className="bg-card flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
      <div className="flex items-center gap-3">
        <CalendarDays className="text-muted-foreground size-4" />
        <div className="flex flex-col">
          <span className="text-body-sm text-heading font-medium">
            Conecte o Calendário da Apple
          </span>
          <span className="text-caption text-muted-foreground">
            Todas as contas do app Calendário (iCloud, Google, Exchange…)
            aparecem aqui com título e participantes.
          </span>
        </div>
      </div>
      <Button size="sm" variant="secondary" onClick={() => connect.mutate()}>
        Conectar
      </Button>
    </div>
  );
};
