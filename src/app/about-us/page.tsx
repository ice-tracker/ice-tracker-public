"use client";
import Taskbar from "@/components/taskbar/Taskbar";
import styles from "./AboutUs.module.css";

export default function AboutUs() {
  return (
    <>
      <Taskbar />
      <div className={`${styles.container}`}>
        <div className={styles.content}>
          <h1 className={styles.title}>About Us</h1>

          <div className={styles.sections}>
            <section className={styles.card}>
              <h2 className={styles.cardHeader}>About This Project</h2>
              <div className={styles.cardBody}>
                <p className={styles.paragraph}>
                  Immigration enforcement in the United States has always been
                  marked by racism and human rights violations. However, recent
                  changes in the way that ICE enforcement is carried out have
                  worsened the already devastating impact of immigration
                  detention and deportation on people across the nation.
                  <a href="#footnote-1" className={styles.footnoteRef}>
                    1
                  </a>{" "}
                  In Massachusetts, communities impacted by immigration
                  enforcement have reported increasing patterns of intimidation,
                  harassment, and violence by immigration enforcement officers
                  and agents.
                </p>

                <p className={styles.paragraph}>
                  <a
                    href="https://www.lucemass.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.inlineLink}
                  >
                    LUCE
                  </a>{" "}
                  and Boston University School of Law Immigrants&rsquo; Rights
                  and Human Trafficking Clinic have come together in partnership
                  to build this resource to provide critical data for impacted
                  communities, legal practitioners, activists, researchers, and
                  advocacy groups.
                </p>

                <p className={styles.paragraph}>
                  This tool draws inspiration from other community-led efforts
                  to document ICE activity, such as{" "}
                  <a
                    href="https://iceout.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.inlineLink}
                  >
                    iceout.org
                  </a>{" "}
                  and{" "}
                  <a
                    href="https://ojonc.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.inlineLink}
                  >
                    ojonc.org
                  </a>
                  , and we&rsquo;re grateful for the work those organizations
                  have done before us. With this interactive map, we hope to
                  build a database that sheds light on ICE enforcement actions
                  across Massachusetts.
                </p>
              </div>
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardHeader}>
                What is the purpose of our interactive map?
              </h2>
              <div className={styles.cardBody}>
                <p className={styles.paragraph}>
                  This interactive map is built as an educational and archival
                  resource to document verified ICE activity over time. In this
                  time of uncertainty, our purpose is to improve transparency
                  around ICE enforcement activity in Massachusetts.
                </p>

                <p className={styles.paragraph}>
                  Our goal is not to provide real-time updates, but to build a
                  long-lasting, structured record of ICE enforcement in
                  Massachusetts that supports research, legal advocacy, and
                  public understanding of how enforcement activity shifts over
                  time. This website should not be used as an accurate predictor
                  of future ICE enforcement.
                </p>
              </div>
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardHeader}>
                Is all the data in this website verified?
              </h2>
              <div className={styles.cardBody}>
                <p className={styles.paragraph}>
                  LUCE operates state-wide and all incidents reported are
                  witnessed by trained verifiers. If LUCE verifiers are unable
                  to determine confidently if ICE was present, the incident will
                  not be on the map.
                </p>
              </div>
            </section>
          </div>

          <p className={styles.footnote} id="footnote-1">
            <span className={styles.footnoteNumber}>1</span> For more
            information on immigration enforcement trends in Trump&rsquo;s
            second administration, please read the ACLU&rsquo;s report titled{" "}
            <a
              href="https://www.aclu.org/publications/agents-of-chaos-and-cruelty-how-the-trump-administrations-national-deportation-policing-force-has-attacked-american-communities"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.inlineLink}
            >
              <em>Agents of Chaos and Cruelty</em>
            </a>
            , published July 2026.
          </p>
        </div>
      </div>
    </>
  );
}
