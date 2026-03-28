import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useKeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Prevent shortcuts when user is typing in inputs
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (event.key) {
        case "k":
        case "/":
          // Focus search (if you have a search input with id="search")
          event.preventDefault();
          const searchInput = document.getElementById("search") as HTMLInputElement;
          if (searchInput) searchInput.focus();
          break;

        case "l":
          // Jump to leads
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            router.push("/app/leads");
          }
          break;

        case "c":
          // Jump to campaigns
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            router.push("/app/campaigns");
          }
          break;

        case "?":
          // Show help (placeholder)
          event.preventDefault();
          alert("Shortcuts:\nK - Focus search\nCtrl+L - Go to leads\nCtrl+C - Go to campaigns\n? - Show this help");
          break;

        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [router]);
}
