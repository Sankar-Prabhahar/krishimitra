import React from "react";
import { ScanLine, ExternalLink } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

const SoilWater = () => {
  const { t } = useLanguage();

  const handleRedirect = () => {
    // Directly redirect to the static file
    window.location.href = "/cart.html";
  };

  return (
    <div
      className="soil-page"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
      }}
    >
      <div style={{ textAlign: "center", width: "100%", maxWidth: "400px" }}>
        <div className="pulse-ring" style={{ marginBottom: "2rem" }}>
          <ScanLine size={64} color="var(--color-primary)" />
        </div>

        {/* Input field removed */}

        <button
          onClick={handleRedirect}
          className="btn btn-primary"
          style={{
            fontSize: "1.2rem",
            padding: "1rem 2.5rem",
            borderRadius: "50px",
            boxShadow: "0 10px 25px -5px rgba(22, 163, 74, 0.4)",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <ExternalLink size={24} style={{ marginRight: "10px" }} />
          {/* You can keep the translation key or change it to a hardcoded string like "Open Interface" */}
          {t("connect_scan")} 
        </button>
      </div>
    </div>
  );
};

export default SoilWater;