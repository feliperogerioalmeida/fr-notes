import { Loader2 } from "lucide-react";

const Loading = () => {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <Loader2 className="text-muted-foreground size-8 animate-spin" />
    </div>
  );
};

export default Loading;
