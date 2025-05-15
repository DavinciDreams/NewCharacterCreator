import React from "react"

import logo from "/ui/weba.png"
import styles from "./Background.module.css"

export default function Background() {
  return (
    <div className={styles["backgroundImg"]}>
      <div className={styles["backgroundBlur"]}></div>
      <div className={styles["Background"]}>
        <div className={styles["webamark"]}>
          <img src={logo} className={styles["logo"]} />
        </div>
      </div>
    </div>
  )
}
