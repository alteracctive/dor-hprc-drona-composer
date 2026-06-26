import React from "react";

const DEFAULT_USER_GUIDES_URL =
  "https://hprc.tamu.edu/kb/User-Guides/Portal/Drona_wfe/";

function UserGuidePage() {
  const rawUserGuidesUrl =
    (typeof document !== "undefined" && document.user_guides_url) ||
    DEFAULT_USER_GUIDES_URL;

  // Enforce that userGuidesUrl contains "hprc.tamu.edu/kb/"
  const userGuidesUrl = rawUserGuidesUrl.includes("hprc.tamu.edu/kb/")
    ? rawUserGuidesUrl
    : DEFAULT_USER_GUIDES_URL;

  const urlHistory = React.useRef([userGuidesUrl]);
  const [iframeSrc, setIframeSrc] = React.useState(userGuidesUrl);

  const handleLoad = (e) => {
    const iframe = e.target;
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

      if (iframeDoc) {
        const handleDocClick = (event) => {
          const anchor = event.target.closest("a");
          if (anchor && anchor.href) {
            const href = anchor.href;
            if (href.startsWith("http://") || href.startsWith("https://")) {
              if (!href.includes("hprc.tamu.edu/kb/")) {
                event.preventDefault();
                let windowOpened = false;
                try {
                  const newWindow = window.open(href, "_blank");
                  if (newWindow && !newWindow.closed && typeof newWindow.closed !== "undefined") {
                    windowOpened = true;
                  }
                } catch (err) {
                  // Ignore
                }

                if (!windowOpened) {
                  alert(
                    "A new tab could not be opened. Please check your browser's pop-up blocker settings to view this link."
                  );
                }
              }
            }
          }
        };

        if (!iframeDoc.__dronaLinkHandlerAttached) {
          iframeDoc.__dronaLinkHandlerAttached = true;
          iframeDoc.addEventListener("click", handleDocClick);
        }
      }

      const currentUrl = iframe.contentWindow.location.href;
      if (currentUrl && !currentUrl.includes("hprc.tamu.edu/kb/")) {
        // Prevent navigating out of hprc.tamu.edu/kb/
        const lastGoodUrl = urlHistory.current[urlHistory.current.length - 1] || userGuidesUrl;
        iframe.contentWindow.location.replace(lastGoodUrl);
      } else if (currentUrl) {
        // Update history if URL is valid
        const history = urlHistory.current;
        if (history.length === 0 || history[history.length - 1] !== currentUrl) {
          history.push(currentUrl);
        }
        setIframeSrc(currentUrl);
      }
    } catch (err) {
      // Cross-origin access error: This is expected if the app is hosted on a different domain.
      // Or if the user navigated to a blocked cross-origin page.
      // If we previously successfully loaded pages, we fallback to the last known good page.
      if (urlHistory.current.length > 0) {
        const lastGoodUrl = urlHistory.current[urlHistory.current.length - 1];
        if (iframeSrc !== lastGoodUrl) {
          setIframeSrc(lastGoodUrl);
        }
      }
    }
  };

  return (
    <iframe
      title="Drona Workflow Engine User Guides"
      src={iframeSrc}
      onLoad={handleLoad}
      style={{
        width: "100%",
        height: "100%",
        minHeight: 0,
        border: "none",
        borderRadius: "15px",
        backgroundColor: "#fff",
      }}
    />
  );
}

export default UserGuidePage;
