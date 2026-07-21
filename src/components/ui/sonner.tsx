import { Toaster as SonnerToaster, type ToasterProps } from 'sonner';
import { useUiStore } from '@/store/uiStore';

export function Toaster(props: ToasterProps) {
  const theme = useUiStore((s) => s.theme);

  return (
    <SonnerToaster
      theme={theme}
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: 'rounded-xl border border-border shadow-popover font-sans',
        },
      }}
      {...props}
    />
  );
}
