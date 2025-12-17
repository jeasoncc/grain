import { createFileRoute } from '@tanstack/react-router'
import TestSelection from '@/components/test-selection'

export const Route = createFileRoute('/test-selection')({
  component: TestSelection,
})