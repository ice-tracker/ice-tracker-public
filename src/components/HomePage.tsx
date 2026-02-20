import styles from "./HomePage.module.css";

// Homepage Popup
interface HomePageProps {
  onClose: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onClose }) => {
  return (
    <div className={styles.popupBox}>
      <div className={styles.title}>
        Massachusetts Immigration Enforcement Reporter
      </div>
      <div className={styles.subtitle}>
        Call the LUCE hotline to report I.C.E. sightings
      </div>
      <div className={styles.phoneNumber}>(617) 370-5023</div>
      <div className={styles.description}>
        The hotline operates from <strong>5 AM - 9 PM</strong>, <strong>every day</strong>  of the week across
        multiple languages: <strong>English, Spanish, Portuguese, French, Haitian
        Creole</strong>, and more to be added! 
      </div>      
      <button className={styles.continueButton} onClick={onClose}>
        Continue
      </button>
      <div className={styles.disclaimer}>This reporter is designed for informational purposes only. It should not be used to interfere with or obstruct law enforcement.</div>
    </div>
  );
};

export default HomePage;
