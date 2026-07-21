import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { firmwareService } from '@/services/firmwareService';

const MODELS = ['ZYG-MON-1000', 'ZYG-MON-1000S', 'ZYG-MON-2000', 'ZYG-MON-2000X'];

const uploadSchema = z.object({
  version: z.string().regex(/^v\d+\.\d+\.\d+$/, 'Use semantic version format, e.g. v1.3.1'),
  model: z.string().min(1, 'Select a target model'),
  notes: z.string().min(5, 'Add brief release notes'),
  fileName: z.string().min(1, 'Choose a firmware binary'),
});

type UploadFormValues = z.infer<typeof uploadSchema>;

export function UploadFirmwareDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: { version: '', model: MODELS[0], notes: '', fileName: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: UploadFormValues) =>
      firmwareService.upload({ name: values.fileName, sizeKb: Math.floor(Math.random() * 1500) + 800, model: values.model, version: values.version, notes: values.notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firmware-catalog'] });
      toast.success('Firmware uploaded successfully');
      form.reset();
      setOpen(false);
    },
    onError: () => toast.error('Failed to upload firmware'),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UploadCloud className="h-4 w-4" />
          Upload Firmware
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Firmware</DialogTitle>
          <DialogDescription>Add a new firmware binary to the release catalog.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="fileName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Firmware Binary</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept=".bin,.hex"
                      onChange={(e) => field.onChange(e.target.files?.[0]?.name ?? '')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Version</FormLabel>
                    <FormControl>
                      <Input placeholder="v1.3.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Model</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MODELS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Release Notes</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Describe what changed in this release..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Upload
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
