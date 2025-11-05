import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { FormDevtoolsPlugin } from "@tanstack/react-form-devtools";
import { Toaster } from "@/components/ui/sonner";
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";

export const Route = createRootRoute({
  component: () => (
    <>
      {/* <Header /> */}
      <Toaster
        icons={{
          success: <CircleCheckIcon className="size-4 text-green-500" />,
          info: <InfoIcon className="size-4 text-blue-500" />,
          warning: <TriangleAlertIcon className="size-4 text-yellow-500" />,
          error: <OctagonXIcon className="size-4 text-red-500" />,
          loading: (
            <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
          ),
        }}
      />
      <Outlet />
      <TanStackDevtools
        config={{
          position: "bottom-right",
        }}
        plugins={[
          {
            name: "Tanstack Router",
            render: <TanStackRouterDevtoolsPanel />,
          },
          FormDevtoolsPlugin(),
        ]}
      />
    </>
  ),
});
