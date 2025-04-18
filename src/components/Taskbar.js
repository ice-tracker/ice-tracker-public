import Link from "next/link";
import styles from "./Taskbar.module.css";
import { useState } from "react";

const Taskbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.container}>
        {/* ICE ICE Title */}
        <h1 className={styles.title}>LUCEMass Tracker</h1>

        {/* Mobile Menu Button */}
        <button
          className={styles.menuButton}
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <div
            className={`${styles.menuIcon} ${isMenuOpen ? styles.open : ""}`}
          >
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>

        {/* Navigation Links */}
        <div className={`${styles.navLinks} ${isMenuOpen ? styles.show : ""}`}>
          <Link href="/" passHref>
            <span className={`${styles.navLink} ${styles.map}`}>Map</span>
          </Link>

          {/* statistics link is disabled for now */}
          {/* <Link href="/statistics" passHref>
            <span className={`${styles.navLink} ${styles.statistics}`}>
              Statistics
            </span>
          </Link> */}

          <Link href="/report" passHref>
            <span className={`${styles.navLink} ${styles.report}`}>Report</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Taskbar;
