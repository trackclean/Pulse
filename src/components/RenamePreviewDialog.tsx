import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AudioFile } from "@/types/audio";

interface RenamePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: AudioFile[];
  newNames: string[];
  onConfirm: () => void;
}

export function RenamePreviewDialog({
  open,
  onOpenChange,
  files,
  newNames,
  onConfirm,
}: RenamePreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Preview Rename Changes</DialogTitle>
          <DialogDescription>
            Review the changes before applying them.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 border rounded-md h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Current Name</TableHead>
                <TableHead>New Name</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file, index) => {
                const newName = newNames[index];
                const isChanged = file.name !== newName;

                return (
                  <TableRow key={file.id}>
                    <TableCell className="font-mono text-sm max-w-[300px] truncate" title={file.name}>
                      {file.name}
                    </TableCell>
                    <TableCell
                      className={`font-mono text-sm max-w-[300px] truncate ${
                        isChanged
                          ? "text-green-600 font-bold dark:text-green-400"
                          : "text-muted-foreground"
                      }`}
                      title={newName}
                    >
                      {newName}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Rename Tracks</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
