import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/settings/about')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/settings/about"!</div>
}
