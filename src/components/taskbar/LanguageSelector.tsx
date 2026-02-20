"use client";
import React, { useState, useEffect } from "react";
import styles from "./LanguageSelector.module.css";
const languages = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "pt", name: "Português" },
  { code: "fr", name: "Français" },
  { code: "ht", name: "Kreyòl Ayisyen" },
];
declare global {
  interface Window {
    googleTranslateElementInit?: (() => void) | undefined;
    google?: {
      translate: {
        TranslateElement: TranslateElementConstructor;
      };
    };
  }
  interface TranslateElementConstructor {
    new (
      options: {
        pageLanguage: string;
        includedLanguages?: string;
        layout: unknown;
        autoDisplay?: boolean;
      },
      containerId: string
    ): void;
    InlineLayout: {
      SIMPLE: unknown;
    };
  }
}
export default function LanguageSelector() {
  const [currentLanguage, setCurrentLanguage] = useState("en");
  const [isInitialized, setIsInitialized] = useState(false);
  const [open, setOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  // Initialize Google Translate
  useEffect(() => {
    if (isInitialized) return;
    // Create hidden Google Translate element
    const container = document.createElement("div");
    container.id = "google_translate_element";
    container.style.display = "none";
    container.setAttribute("aria-hidden", "true");
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.visibility = "hidden";
    document.body.appendChild(container);
    // Initialize Google Translate
    window.googleTranslateElementInit = () => {
      if (window.google?.translate?.TranslateElement) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: "en,es,pt,fr,ht",
            layout:
              window.google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false,
          },
          "google_translate_element"
        );
        // Hide Google Translate UI elements
        setTimeout(() => {
          const style = document.createElement("style");
          style.textContent = `
            .goog-te-banner-frame,
            .goog-te-menu-frame,
            #goog-gt-tt,
            .goog-te-ftab-float,
            .goog-te-balloon-frame {
              display: none !important;
            }
            .goog-text-highlight {
              background: none !important;
              box-shadow: none !important;
            }
          `;
          document.head.appendChild(style);
        }, 1000);
      }
    };
    // Load Google Translate script
    if (!document.querySelector('script[src*="translate.google.com"]')) {
      const script = document.createElement("script");
      script.src =
        "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    } else if (window.google?.translate) {
      window.googleTranslateElementInit();
    }
    setIsInitialized(true);
  }, []);
  // Load saved language on mount
  useEffect(() => {
    const savedLang = localStorage.getItem("selected-language") || "en";
    setCurrentLanguage(savedLang);
    // Apply saved language if it's Spanish
    if (savedLang === "es") {
      setTimeout(() => {
        document.cookie = "googtrans=/en/es; path=/";
      }, 2000);
    }
  }, []);
  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);
  const changeLanguage = (langCode: string) => {
    setOpen(false);
    if (langCode === currentLanguage) return;
    setCurrentLanguage(langCode);
    localStorage.setItem("selected-language", langCode);
    if (langCode !== "en") {
      // Set Google Translate cookie for selected language
      document.cookie = `googtrans=/en/${langCode}; path=/`;
      window.location.reload();
    } else {
      // Reset to English
      document.cookie =
        "googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      window.location.reload();
    }
  };
  return (
    <div className={styles.languageSelectorDropdown} ref={dropdownRef}>
      <button
        type="button"
        className={styles.languageButton}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Language
      </button>
      {open && (
        <ul
          className={styles.languageDropdownMenu}
          role="listbox"
          tabIndex={-1}
        >
          {languages.map((language) => (
            <li
              key={language.code}
              role="option"
              aria-selected={currentLanguage === language.code}
              tabIndex={0}
              className={styles.languageDropdownItem}
              onClick={() => changeLanguage(language.code)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  changeLanguage(language.code);
              }}
            >
              {language.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
