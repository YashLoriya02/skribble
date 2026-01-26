import * as React from "react"
import * as SeparatorPrimitive from "@radix-ui/react-separator"
import { cn } from "../../lib/utils"

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "bg-border shrink-0 sfx-[orientation=horizontal]:h-px sfx-[orientation=horizontal]:w-full sfx-[orientation=vertical]:h-full sfx-[orientation=vertical]:w-px",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
