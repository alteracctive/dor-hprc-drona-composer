import React from "react";

function Footer() {
  const userGuidesUrl =
    (typeof document !== "undefined" && document.user_guides_url) ||
    "https://hprc.tamu.edu/kb/User-Guides/Portal/Drona_wfe/";

  return (
    <footer className="drona-footer">
      <div className="drona-footer-main">
        <div className="drona-footer-left">
          <strong>Drona Workflow Engine</strong>
          <span className="footer-divider">|</span>
          <span className="drona-footer-credit">Developed by the Fishbowl Student Helpdesk, HPRC</span>
        </div>

        <div className="drona-footer-right">
          <a href="mailto:help@hprc.tamu.edu">help@hprc.tamu.edu</a>
          <a href={userGuidesUrl} target="_blank" rel="noopener noreferrer">User Guides</a>
          <a href="https://github.com/">GitHub</a>
          <a href="https://github.com/tamu-edu/dor-hprc-drona-composer/graphs/contributors?from=3%2F7%2F2026">Contributors</a>
          <a href="https://forms.gle/W6YxigbbLUVE3YAz7">Feedback</a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;