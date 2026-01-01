import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/settings/editor')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/settings/editor"!</div>
}
