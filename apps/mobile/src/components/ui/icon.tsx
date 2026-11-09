import type { LucideIcon, LucideProps } from "lucide-react-native";
import { cssInterop } from "nativewind";
import * as React from "react";

import { TextClassContext } from "@/components/ui/text";
import { cn } from "@/lib/utils";

type IconProps = LucideProps & {
  as: LucideIcon;
};

const IconImpl = ({ as: IconComponent, ...props }: IconProps) => (
  <IconComponent {...props} />
);

cssInterop(IconImpl, {
  className: {
    target: "style",
    nativeStyleToProp: {
      height: "size",
      width: "size",
    },
  },
});

const DEFAULT_ICON_SIZE = 16;

const Icon = ({
  as: IconComponent,
  className,
  size = DEFAULT_ICON_SIZE,
  ...props
}: IconProps) => {
  const textClass = React.useContext(TextClassContext);

  return (
    <IconImpl
      as={IconComponent}
      className={cn("text-foreground", textClass, className)}
      size={size}
      {...props}
    />
  );
};

export { Icon };
export type { IconProps };
