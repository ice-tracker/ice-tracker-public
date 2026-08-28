import styles from "./HomePage.module.css";

// Homepage Popup
interface HomePageProps {
  onClose: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onClose }) => {
  return (
    <div className={styles.popupBox}>
      <button className={styles.continueButton} onClick={onClose}>
        X
      </button>
      <div className={styles.title}>
        Massachusetts Immigration Enforcement Reporter
      </div>
      <div className={styles.subtitle}>
        Call the LUCE hotline to report I.C.E. sightings
      </div>
      <div className={styles.phoneNumber}>(617) 370-5023</div>
      <div className={styles.description}>
        The hotline operates from <strong>6AM - 8PM</strong>,{" "}
        <strong>every day</strong> of the week across multiple languages:{" "}
        <strong>
          {" "}
          Spanish (ext 1), English (ext 2), Portuguese (ext 3), French (ext 4),
          Haitian Creole (ext 5), Mandarin (ext 6)
        </strong>
        , and more to be added!
      </div>
      <div className={styles.disclaimer}>
        This reporter is designed for informational purposes only. It should not
        be used to interfere with or obstruct law enforcement.
      </div>
    </div>
  );
};

export default HomePage;
