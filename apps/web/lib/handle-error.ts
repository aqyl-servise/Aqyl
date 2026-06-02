import { toast } from 'sonner';

export function handleError(err: unknown, fallbackMessage = 'Что-то пошло не так'): void {
  const message =
    err instanceof Error ? err.message :
    typeof err === 'string' ? err :
    fallbackMessage;

  console.error('[Aqyl Error]', err);

  if (typeof window !== 'undefined') {
    toast.error(message);
  }
}
