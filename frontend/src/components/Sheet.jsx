import { Drawer } from "vaul";

export const Sheet = ({ open, onOpenChange, title, subtitle, children, testId }) => (
  <Drawer.Root open={open} onOpenChange={onOpenChange} repositionInputs={false}>
    <Drawer.Portal>
      <Drawer.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
      <Drawer.Content
        data-testid={testId}
        className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-[28px] border-t border-white/10 bg-[#111118] text-zinc-100 shadow-[0_-20px_60px_rgba(139,92,246,0.18)] outline-none"
      >
        <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-white/20" />
        <div className={title ? "px-5 pt-4" : "sr-only"}>
          <Drawer.Title className="font-display text-2xl font-bold tracking-tight">{title || "Dettaglio"}</Drawer.Title>
          <Drawer.Description className={subtitle ? "mt-1 text-sm text-zinc-400" : "sr-only"}>{subtitle || "Pannello"}</Drawer.Description>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 pb-10 pt-4" data-vaul-no-drag>
          {children}
        </div>
      </Drawer.Content>
    </Drawer.Portal>
  </Drawer.Root>
);
