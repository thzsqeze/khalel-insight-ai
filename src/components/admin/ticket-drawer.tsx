"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TicketDetail } from "./ticket-detail";

export function TicketDrawer({
  id,
  onClose,
  onUpdate,
}: {
  id: string | null;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const t = useTranslations("tickets");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activeId, setActiveId] = useState(id);
  const activeNavigation = useRef<{ index: number; url: string } | null>(null);
  const dirtyRef = useRef(false);
  const onDirtyChange = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty;
  }, []);
  const confirmDiscard = useCallback(() => {
    if (dirtyRef.current && !window.confirm(t("discardDraft"))) return false;
    dirtyRef.current = false;
    return true;
  }, [t]);

  useEffect(() => {
    if (id === activeId) return;
    if (activeId && !confirmDiscard()) {
      const previous = activeNavigation.current;
      if (!previous) return;
      const targetIndex = window.history.state?.ticketDrawerIndex;
      const delta = typeof targetIndex === "number" ? previous.index - targetIndex : 0;
      if (delta) window.history.go(delta);
      else window.history.replaceState({ ticketDrawerIndex: previous.index }, "", previous.url);
      return;
    }
    // URL changes are accepted only after the current draft has been checked. Keeping
    // the displayed id separate prevents a router update from unmounting its editor.
    startTransition(() => setActiveId(id));
  }, [id, activeId, confirmDiscard]);

  useEffect(() => {
    if (!activeId) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    const paddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    dialog.showModal();
    activeNavigation.current = {
      index: Number(window.history.state?.ticketDrawerIndex ?? 0),
      url: window.location.href,
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      dialog.close();
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [activeId]);

  function close() {
    if (confirmDiscard()) onClose();
  }

  if (!activeId) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="ticket-drawer-title"
      className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto overscroll-contain border-0 border-l border-[#dfe6e0] bg-[#f7f9f7] p-0 text-foreground shadow-[-12px_0_50px_#173a2626] backdrop:bg-[#1b3028]/25 sm:w-[min(calc(100vw-48px),1050px)]"
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            "button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]",
          ),
        ).filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onClickCapture={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
        if (link instanceof HTMLAnchorElement && link.target !== "_blank" && !confirmDiscard()) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right) close();
      }}
    >
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[#e1e7e2] bg-white/95 px-5 py-3 backdrop-blur sm:px-7">
        <h2 id="ticket-drawer-title" className="text-xs font-semibold text-[#607267]">
          {t("drawerTitle")}
        </h2>
        <Button
          autoFocus
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={t("closeTicket")}
          onClick={close}
        >
          <X className="size-4" />
        </Button>
      </div>
      <div className="p-4 sm:p-7">
        <TicketDetail
          key={activeId}
          id={activeId}
          variant="drawer"
          onDirtyChange={onDirtyChange}
          onUpdate={onUpdate}
        />
      </div>
    </dialog>
  );
}
