import styles from "./HomePage.module.css";

// Homepage Popup
interface HomePageProps {
  onClose: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onClose }) => {
  return (
    <div className={styles.popupBox}>
      <div className={styles.title}>
        Massachusetts Immigration Enforcement Tracker
      </div>
      <div className={styles.subtitle}>
        Call the LUCE hotline to report I.C.E. sightings
      </div>
      <div className={styles.phoneNumber}>(617) 370-5023</div>
      <div className={styles.description}>
        The hotline operates from 5am - 9pm every day of the week across
        multiple languages: English, Spanish, Portuguese, French, Haitian
        Creole, and more to be added!
      </div>
      <button className={styles.continueButton} onClick={onClose}>
        Continue
      </button>
    </div>
  );
};

export default HomePage;
