import Button from "@/components/ui/button";
import CodeProfile from "@/components/ui/codeprofile";
import { createFileRoute } from "@tanstack/react-router";
// import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center">
      <Button>Click me</Button>
      <CodeProfile />
    </div>
  );
}
