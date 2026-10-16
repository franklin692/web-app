import { toast } from "sonner";

export const shareLink = async (path, title, text) => {
  const url = `${window.location.origin}${path}`;
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (e) {
      if (e?.name === "AbortError") return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Link copiato! Incollalo dove vuoi");
  } catch {
    toast.message(url);
  }
};
