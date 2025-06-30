import Link from "next/link";
import styles from "./Taskbar.module.css";
import { useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import LanguageSelector from "./LanguageSelector";

const Taskbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isSignedIn } = useUser();
  const { signOut } = useClerk();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.container}>
        <Link href="/" passHref>
          <h1 className={styles.title}>Immigration Enforcement Reporter</h1>
        </Link>
 
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

        <div className={`${styles.navLinks} ${isMenuOpen ? styles.show : ""}`}>
          <Link href="/" passHref>
            <span className={`${styles.navLink} ${styles.map}`}>Map</span>
          </Link>

          <Link href="/about-us" passHref>
            <span className={`${styles.navLink} ${styles.report}`}>
              About Us
            </span>
          </Link>

          {isSignedIn ? (
            <>
              <Link href="/report" passHref>
                <span className={`${styles.navLink} ${styles.report}`}>
                  Report
                </span>
              </Link>
              <button
                onClick={() => signOut()}
                className={`${styles.navLink} ${styles.report}`}
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link href="/sign-in" passHref>
                <span className={`${styles.navLink} ${styles.report}`}>
                  Log In
                </span>
              </Link>
            </>
          )}

          <LanguageSelector />
        </div>
      </div>
    </nav>
  );
};

export default Taskbar;
