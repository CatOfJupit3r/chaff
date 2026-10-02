import { createFileRoute } from '@tanstack/react-router';

import { HistoryScreen } from '@~/features/history/components/history-screen';

export const Route = createFileRoute('/history')({
  component: HistoryScreen,
});
